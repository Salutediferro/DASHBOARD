import { Redis } from "@upstash/redis";

/**
 * Feature flags — boolean kill-switches for product features that are
 * readable from any client (not just admins), unlike platform settings
 * which are admin-ops only.
 *
 * Namespace split from platform-settings is intentional: we never want
 * to accidentally leak an admin ops toggle through the public `/api/flags`
 * endpoint. Feature flags live at `sdf:flags:*` in Redis; platform
 * settings at `sdf:settings:*`. Separate getters, separate types.
 *
 * Fallback chain is identical: Redis → env var → declared default.
 *
 * Adding a new flag is a one-liner in FEATURE_FLAGS below + wiring the
 * check into whichever endpoint/UI the feature lives. The admin UI at
 * `/dashboard/admin/feature-flags` will pick it up automatically.
 */

type FlagDef = {
  key: string;
  envFallback: string;
  default: boolean;
  label: string;
  description: string;
};

export const FEATURE_FLAGS = {
  "patient-registration-open": {
    key: "patient-registration-open",
    envFallback: "FLAG_PATIENT_REGISTRATION_OPEN",
    default: true,
    label: "Registrazione pazienti aperta",
    description:
      "Quando OFF, `/api/auth/register` respinge i signup di nuovi PATIENT con 503. Professionisti invitati (flusso admin) non sono coinvolti.",
  },
  "ai-analysis-enabled": {
    key: "ai-analysis-enabled",
    envFallback: "FLAG_AI_ANALYSIS_ENABLED",
    default: false,
    label: "Analisi AI check-in",
    description:
      "Abilita l'inferenza AI sui check-in (commento automatico coach). Off di default — va attivato per-org quando il budget LLM è confermato.",
  },
  "email-reminders-enabled": {
    key: "email-reminders-enabled",
    envFallback: "FLAG_EMAIL_REMINDERS_ENABLED",
    default: true,
    label: "Promemoria appuntamenti via email",
    description:
      "Quando OFF, il cron giornaliero salta l'invio dei promemoria 24h/1h. Usare per un incidente email o per fermare il rumore in manutenzione.",
  },
} as const satisfies Record<string, FlagDef>;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

// ── Redis wiring ──────────────────────────────────────────────────────

let cachedRedis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    cachedRedis = null;
    return null;
  }
  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

function redisKey(key: FeatureFlagKey): string {
  return `sdf:flags:${key}`;
}

function coerceBool(raw: unknown, fallback: boolean): boolean {
  if (raw == null) return fallback;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  if (typeof raw === "string") {
    return raw === "1" || raw.toLowerCase() === "true";
  }
  return fallback;
}

/**
 * Server-side reader. Safe to call from any runtime (edge or node): if
 * Redis is down or unset the env fallback is used, worst case the
 * declared default. Never throws.
 */
export async function getFeatureFlag(key: FeatureFlagKey): Promise<boolean> {
  const def = FEATURE_FLAGS[key];
  const envValue = process.env[def.envFallback];
  const envFallback = envValue ? coerceBool(envValue, def.default) : def.default;

  const redis = getRedis();
  if (!redis) return envFallback;
  try {
    const raw = await redis.get(redisKey(key));
    if (raw == null) return envFallback;
    return coerceBool(raw, envFallback);
  } catch {
    return envFallback;
  }
}

/**
 * Bulk read — one Redis pipeline instead of N sequential round-trips.
 * Used by `GET /api/flags` so a client that needs a few flags gets them
 * in a single fetch.
 */
export async function getAllFeatureFlags(): Promise<
  Record<FeatureFlagKey, boolean>
> {
  const keys = Object.keys(FEATURE_FLAGS) as FeatureFlagKey[];
  const redis = getRedis();

  // Precompute env/default fallbacks so we have something to return even
  // when Redis is unreachable.
  const fallbacks: Record<FeatureFlagKey, boolean> = {} as Record<
    FeatureFlagKey,
    boolean
  >;
  for (const key of keys) {
    const def = FEATURE_FLAGS[key];
    const envValue = process.env[def.envFallback];
    fallbacks[key] = envValue ? coerceBool(envValue, def.default) : def.default;
  }

  if (!redis) return fallbacks;

  try {
    const values = await redis.mget(...keys.map((k) => redisKey(k)));
    const out: Record<FeatureFlagKey, boolean> = { ...fallbacks };
    keys.forEach((key, i) => {
      const v = values[i];
      if (v != null) out[key] = coerceBool(v, fallbacks[key]);
    });
    return out;
  } catch {
    return fallbacks;
  }
}

export async function setFeatureFlag(
  key: FeatureFlagKey,
  value: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const redis = getRedis();
  if (!redis) {
    return {
      ok: false,
      error: "Upstash Redis non configurato — impossibile persistere",
    };
  }
  try {
    await redis.set(redisKey(key), value ? "1" : "0");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Snapshot for the admin UI: effective value + where it came from.
 */
export async function snapshotFeatureFlags(): Promise<
  Array<{
    key: FeatureFlagKey;
    label: string;
    description: string;
    value: boolean;
    source: "redis" | "env" | "default";
    envFallback: string;
    envValue: string | null;
  }>
> {
  const redis = getRedis();
  const entries = Object.values(FEATURE_FLAGS);
  return Promise.all(
    entries.map(async (def) => {
      const envValue = process.env[def.envFallback] ?? null;
      let source: "redis" | "env" | "default" = "default";
      let value: boolean = def.default;

      if (envValue !== null) {
        value = coerceBool(envValue, def.default);
        source = "env";
      }

      if (redis) {
        try {
          const raw = await redis.get(redisKey(def.key as FeatureFlagKey));
          if (raw != null) {
            value = coerceBool(raw, value);
            source = "redis";
          }
        } catch {
          /* fall through */
        }
      }

      return {
        key: def.key as FeatureFlagKey,
        label: def.label,
        description: def.description,
        value,
        source,
        envFallback: def.envFallback,
        envValue,
      };
    }),
  );
}
