import { Redis } from "@upstash/redis";

/**
 * Platform-wide broadcast banner — the thing an admin reaches for when
 * they need to tell every user "manutenzione alle 22". One active
 * broadcast at a time, stored as a JSON blob in Upstash Redis so reads
 * survive without a redeploy and work from any runtime.
 *
 * An expired broadcast is garbage: consumers MUST ignore it. We don't
 * auto-delete on read (that would require write permission on a public
 * endpoint) — the admin UI shows "scaduto" + a "Clear" button, and the
 * next set() overwrites the row anyway.
 */

export type BroadcastSeverity = "info" | "warning" | "critical";

export type Broadcast = {
  message: string;
  severity: BroadcastSeverity;
  /** ISO datetime; null = no expiry (stays until cleared). */
  expiresAt: string | null;
  activatedBy: { id: string; fullName: string };
  /** ISO datetime set server-side when the broadcast was written. */
  activatedAt: string;
};

const REDIS_KEY = "sdf:broadcast:current";

let cached: Redis | null | undefined;
function getRedis(): Redis | null {
  if (cached !== undefined) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    cached = null;
    return null;
  }
  cached = new Redis({ url, token });
  return cached;
}

function isValidSeverity(v: unknown): v is BroadcastSeverity {
  return v === "info" || v === "warning" || v === "critical";
}

function coerceBroadcast(raw: unknown): Broadcast | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.message !== "string" || r.message.length === 0) return null;
  if (!isValidSeverity(r.severity)) return null;
  if (typeof r.activatedAt !== "string") return null;
  if (!r.activatedBy || typeof r.activatedBy !== "object") return null;
  const by = r.activatedBy as Record<string, unknown>;
  if (typeof by.id !== "string" || typeof by.fullName !== "string") return null;
  return {
    message: r.message,
    severity: r.severity,
    expiresAt: typeof r.expiresAt === "string" ? r.expiresAt : null,
    activatedBy: { id: by.id, fullName: by.fullName },
    activatedAt: r.activatedAt,
  };
}

/**
 * Read the current broadcast. Returns the stored row even if it's
 * already expired — caller decides whether to surface it; the admin UI
 * wants to see "scaduto", the public banner doesn't. Use
 * `getActiveBroadcast` when you only want the not-yet-expired one.
 */
export async function getBroadcast(): Promise<Broadcast | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(REDIS_KEY);
    // Upstash auto-parses JSON on read; fall back to string parse if it
    // ever returns a raw string (older SDK versions).
    const obj =
      typeof raw === "string"
        ? (JSON.parse(raw) as unknown)
        : (raw as unknown);
    return coerceBroadcast(obj);
  } catch {
    return null;
  }
}

/**
 * Same as getBroadcast but also filters by expiry. Use this for the
 * public-facing banner — users should never see a "scaduto" message.
 */
export async function getActiveBroadcast(): Promise<Broadcast | null> {
  const b = await getBroadcast();
  if (!b) return null;
  if (b.expiresAt && new Date(b.expiresAt).getTime() < Date.now()) {
    return null;
  }
  return b;
}

export async function setBroadcast(
  b: Omit<Broadcast, "activatedAt">,
): Promise<{ ok: boolean; error?: string; broadcast?: Broadcast }> {
  const redis = getRedis();
  if (!redis) {
    return {
      ok: false,
      error: "Upstash Redis non configurato — impossibile persistere",
    };
  }
  const record: Broadcast = { ...b, activatedAt: new Date().toISOString() };
  try {
    await redis.set(REDIS_KEY, JSON.stringify(record));
    return { ok: true, broadcast: record };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function clearBroadcast(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const redis = getRedis();
  if (!redis) {
    return { ok: false, error: "Upstash Redis non configurato" };
  }
  try {
    await redis.del(REDIS_KEY);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
