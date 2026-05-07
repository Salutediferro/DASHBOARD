import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

import { requireRole, errorResponse } from "@/lib/auth/require-role";
import {
  buildOffSearchUrl,
  normalizeQuery,
  parseOffSearchResponse,
  type FoodSearchResult,
} from "@/lib/off";

/**
 * Server-side proxy to Open Food Facts (OFF) for the patient diary
 * picker. Two reasons we route through here instead of always hitting
 * OFF from the browser:
 *
 *   1. Cross-user dedupe: a Redis cache keyed by normalized query means
 *      the second patient typing "petto pollo" gets an instant response
 *      and doesn't burn OFF's quota at all.
 *   2. Polite UA: OFF asks each app for a `Name/Version (contact)`
 *      header — browsers can't set User-Agent, so this is the only way.
 *
 * OFF's documented limits (https://openfoodfacts.github.io/.../api/) are
 * 10 req/min/IP for `/search`. Because all server-side calls share our
 * single egress IP, that quota covers the whole patient base. When OFF
 * rate-limits us we return 503 with an explicit signal so the client
 * can fall back to a direct browser → OFF fetch (per-user IP, per-user
 * quota). Cache writes are skipped on the fallback path to keep this
 * code path the only writer.
 */

// Format required by OFF: "AppName/Version (ContactEmail)".
const USER_AGENT = "SaluteDiFerro/1.0 (support@salutediferro.it)";

// v2: bumped after adding category-aware scoring — old entries cached
// before that change have empty result lists for category-style queries
// like "pasta" and would keep serving them until TTL expiry.
const CACHE_KEY_PREFIX = "sdf:off:search:v2:";
const CACHE_TTL_SECONDS = 60 * 60 * 6; // 6h — OFF data changes slowly.

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

export async function GET(req: Request) {
  try {
    await requireRole(["PATIENT"]);
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q.length < 2) return NextResponse.json([]);

    const cacheKey = CACHE_KEY_PREFIX + normalizeQuery(q);
    const redis = getRedis();

    // 1. Cache lookup. A hit means we don't touch OFF at all.
    if (redis) {
      try {
        const cached = await redis.get<FoodSearchResult[]>(cacheKey);
        if (cached) {
          return NextResponse.json(cached, {
            headers: { "X-Off-Source": "cache" },
          });
        }
      } catch (err) {
        console.warn("[off-search] redis get failed", err);
      }
    }

    // 2. Miss → call OFF. We share one egress IP across all patients,
    //    so this is the request OFF rate-limits hardest.
    let res: Response;
    try {
      res = await fetch(buildOffSearchUrl(q), {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        // HTTP-level revalidate is a cheap second layer beneath Redis —
        // helps if Redis is unreachable or evicted the entry.
        next: { revalidate: CACHE_TTL_SECONDS },
      });
    } catch (err) {
      console.warn("[off-search] network error", err);
      // Network glitch — let the client retry directly.
      return NextResponse.json([], {
        status: 503,
        headers: { "X-Off-Source": "ratelimited" },
      });
    }

    // 3. Rate-limit handoff. OFF returns 429 when the IP exceeds quota;
    //    treat 5xx the same way (transient backend issue → let the
    //    browser try its own IP).
    if (res.status === 429 || res.status >= 500) {
      console.warn("[off-search] OFF rate-limited / unavailable", res.status);
      return NextResponse.json([], {
        status: 503,
        headers: { "X-Off-Source": "ratelimited" },
      });
    }

    if (!res.ok) {
      console.warn("[off-search] non-ok response", res.status);
      return NextResponse.json([], { headers: { "X-Off-Source": "off" } });
    }

    const data: unknown = await res.json().catch(() => null);
    const results = parseOffSearchResponse(data, q);

    // 4. Populate cache. Even an empty result set is worth caching to
    //    spare OFF the same dud query 100 times in a row.
    if (redis) {
      try {
        await redis.set(cacheKey, results, { ex: CACHE_TTL_SECONDS });
      } catch (err) {
        console.warn("[off-search] redis set failed", err);
      }
    }

    return NextResponse.json(results, { headers: { "X-Off-Source": "off" } });
  } catch (e) {
    return errorResponse(e);
  }
}
