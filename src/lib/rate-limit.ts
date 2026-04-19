/**
 * Distributed rate limiter on Upstash Redis with a safe in-memory
 * fallback for local dev.
 *
 * On Vercel, each invocation can land on a fresh serverless isolate —
 * an in-memory Map is per-isolate, so counters don't coordinate and
 * an attacker can effectively bypass the limit by getting load-balanced
 * to a cold isolate. Upstash is a global Redis reachable over HTTP(S)
 * with a sliding-window primitive from `@upstash/ratelimit`.
 *
 * Wiring:
 *   - If UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set,
 *     use the distributed implementation.
 *   - Otherwise fall back to an in-memory Map. A one-time warning is
 *     logged in production so a mis-deploy is loud. In dev it's silent.
 *
 * API unchanged: `await rateLimit({ key, limit, windowMs })` returns
 * `{ ok, remaining, resetIn }` — callers just need to `await`.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitOptions = {
  key: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetIn: number;
};

// ── Upstash singleton ─────────────────────────────────────────────────
// We cache per (limit, windowMs) because Ratelimit is immutable — each
// shape needs its own instance. In practice the app uses a small number
// of shapes (~5), so the cache is tiny.
type RatelimitKey = `${number}:${number}`;
const rlCache = new Map<RatelimitKey, Ratelimit>();

let redisSingleton: Redis | null | undefined;
function getRedis(): Redis | null {
  if (redisSingleton !== undefined) return redisSingleton;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisSingleton = null;
    return null;
  }
  redisSingleton = new Redis({ url, token });
  return redisSingleton;
}

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const cacheKey = `${limit}:${windowMs}` as RatelimitKey;
  let rl = rlCache.get(cacheKey);
  if (!rl) {
    rl = new Ratelimit({
      redis,
      // Sliding window gives smooth limiting without the "cliff" of
      // fixed windows — a bursty client can't refresh its budget by
      // racing the wall clock.
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      analytics: false,
      prefix: "sdf:rl",
    });
    rlCache.set(cacheKey, rl);
  }
  return rl;
}

// One-shot warning so a mis-deploy in prod screams in the logs exactly
// once instead of cascading silently on every request.
let warnedMissingUpstash = false;
function warnIfInMemoryInProd() {
  if (warnedMissingUpstash) return;
  warnedMissingUpstash = true;
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL/_TOKEN missing. " +
        "Falling back to in-memory buckets — NOT distributed across " +
        "serverless instances. Set Upstash env vars in Vercel.",
    );
  }
}

// ── In-memory fallback ────────────────────────────────────────────────
type Bucket = { count: number; resetAt: number };
const BUCKETS: Map<string, Bucket> = new Map();

function inMemoryRateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = BUCKETS.get(opts.key);
  if (!bucket || bucket.resetAt <= now) {
    BUCKETS.set(opts.key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, resetIn: opts.windowMs };
  }
  if (bucket.count >= opts.limit) {
    return { ok: false, remaining: 0, resetIn: bucket.resetAt - now };
  }
  bucket.count += 1;
  return {
    ok: true,
    remaining: opts.limit - bucket.count,
    resetIn: bucket.resetAt - now,
  };
}

// ── Public API ────────────────────────────────────────────────────────
export async function rateLimit(
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const limiter = getLimiter(opts.limit, opts.windowMs);
  if (!limiter) {
    warnIfInMemoryInProd();
    return inMemoryRateLimit(opts);
  }
  const { success, remaining, reset } = await limiter.limit(opts.key);
  return {
    ok: success,
    remaining,
    // `reset` is an absolute ms timestamp; convert to a relative offset
    // so callers don't need to know the implementation detail.
    resetIn: Math.max(0, reset - Date.now()),
  };
}

/**
 * Extract a stable identifier for the request. Uses the first
 * x-forwarded-for hop, then x-real-ip, then a constant "anon" fallback.
 * Callers should prefix with the route name so distinct endpoints don't
 * share buckets.
 */
export function requestKey(req: Request, scope: string): string {
  const h = req.headers;
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "anon";
  return `${scope}:${ip}`;
}

/**
 * Dev/test helper — wipes the in-memory buckets. No-op against Upstash.
 */
export function _resetRateLimit() {
  BUCKETS.clear();
}
