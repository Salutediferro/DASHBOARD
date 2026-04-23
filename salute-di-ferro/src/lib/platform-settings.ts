import { Redis } from "@upstash/redis";

/**
 * Mutable platform-wide settings, stored in Upstash Redis so they're:
 *   - distributed across every serverless isolate (env vars + in-memory
 *     would be per-deployment and per-lambda respectively);
 *   - readable from Next.js edge middleware over HTTP (Upstash uses fetch,
 *     no Node APIs — unlike Prisma which can't run at the edge);
 *   - mutable at runtime without a Vercel redeploy.
 *
 * Env vars remain the **fallback default** — if Redis is unreachable or
 * the key was never set, the platform behaves exactly as before this
 * module existed. Every setting declares an `envFallback` that names the
 * env var it should look at when Redis has no value.
 *
 * Keep the set of settings here small — this is for runtime-mutable ops
 * flags (2FA enforcement, maintenance mode, feature kill-switches). Don't
 * use it as a kitchen sink for config that can just live in env vars.
 */

// ── Typed key registry ────────────────────────────────────────────────

type SettingDef = {
  key: string;
  /** Env var consulted when Redis has no value. */
  envFallback: string;
  /** Default if both Redis and env var are unset. */
  default: boolean;
  /** Human-readable label surfaced in the admin UI. */
  label: string;
  /** Short explainer for the admin UI. */
  description: string;
};

export const PLATFORM_SETTINGS = {
  "enforce-2fa": {
    key: "enforce-2fa",
    envFallback: "ENFORCE_2FA",
    default: false,
    label: "Enforce 2FA per medici/coach/admin",
    description:
      "Quando attivo, DOCTOR/COACH/ADMIN senza secondo fattore vengono reindirizzati alla pagina security fino a completare l'enrollment. Finché è OFF, il login passa anche senza 2FA.",
  },
} as const satisfies Record<string, SettingDef>;

export type PlatformSettingKey = keyof typeof PLATFORM_SETTINGS;

// ── Redis wiring (HTTP client, edge-compatible) ───────────────────────

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

function redisKey(key: PlatformSettingKey): string {
  return `sdf:settings:${key}`;
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
 * Read a boolean setting with sane fallback: Redis → env var → declared
 * default. Designed to be safe to call from edge middleware: any failure
 * is caught and the fallback is returned so a Redis blip never breaks
 * auth routing.
 */
export async function getPlatformBool(
  key: PlatformSettingKey,
): Promise<boolean> {
  const def = PLATFORM_SETTINGS[key];
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
 * Write a boolean setting. The caller is responsible for authz + audit
 * logging; this helper only touches Redis.
 */
export async function setPlatformBool(
  key: PlatformSettingKey,
  value: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const redis = getRedis();
  if (!redis) {
    return {
      ok: false,
      error:
        "Upstash Redis non configurato — impossibile persistere il setting",
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
 * Snapshot every registered setting with its effective value + where it
 * came from (redis / env / default). Used by the admin settings page.
 */
export async function snapshotPlatformSettings(): Promise<
  Array<{
    key: PlatformSettingKey;
    label: string;
    description: string;
    value: boolean;
    source: "redis" | "env" | "default";
    envFallback: string;
    envValue: string | null;
  }>
> {
  const redis = getRedis();
  const entries = Object.values(PLATFORM_SETTINGS);
  return Promise.all(
    entries.map(async (def) => {
      const envValue = process.env[def.envFallback] ?? null;
      let source: "redis" | "env" | "default" = "default";
      let value: boolean = def.default;

      const envCoerced = envValue
        ? coerceBool(envValue, def.default)
        : null;
      if (envCoerced !== null) {
        value = envCoerced;
        source = "env";
      }

      if (redis) {
        try {
          const raw = await redis.get(redisKey(def.key as PlatformSettingKey));
          if (raw != null) {
            value = coerceBool(raw, value);
            source = "redis";
          }
        } catch {
          /* fall through to env/default */
        }
      }

      return {
        key: def.key as PlatformSettingKey,
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
