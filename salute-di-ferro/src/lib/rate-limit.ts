/**
 * Minimal in-memory rate limiter — good enough for a single-process dev
 * server. In production this MUST be replaced with a shared store
 * (Redis / Upstash) because each Vercel edge instance would otherwise
 * track its own counter. Entry point stays the same so the upgrade is a
 * drop-in swap.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const BUCKETS: Map<string, Bucket> = new Map();

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

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
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
 * Dev/test helper — wipes every bucket. Unused at runtime, exported so
 * integration tests can reset the state between runs.
 */
export function _resetRateLimit() {
  BUCKETS.clear();
}
