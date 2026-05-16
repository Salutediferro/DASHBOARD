import Stripe from "stripe";

/**
 * Stripe SDK singleton — server-only.
 *
 * The Stripe checkout itself lives outside this codebase (separate
 * marketing site / pricing page). What lives here is the *receiver*:
 * a webhook endpoint at /api/webhooks/stripe that mints invitations
 * after a successful payment.
 *
 * Wiring (set these on the deployment env, NEVER commit them):
 *
 *   STRIPE_SECRET_KEY      — `sk_live_…` or `sk_test_…`. Used only if
 *                            the webhook handler needs to call back
 *                            into Stripe (e.g. retrieve full session
 *                            details when the event payload is thin).
 *   STRIPE_WEBHOOK_SECRET  — `whsec_…`. The signing secret of the
 *                            specific webhook endpoint configured in
 *                            the Stripe dashboard pointing at
 *                            /api/webhooks/stripe.
 *
 * The API version is pinned to match the SDK package's expected
 * default; bumping `stripe@x.y.z` may require bumping this string.
 * Pinning rather than letting it float keeps webhook payloads stable
 * across SDK updates.
 */

// Pin to the SDK's expected version (Stripe v22 → `2026-04-22.dahlia`).
// Stripe constrains this to a literal type per SDK release; bumping
// `stripe@x.y.z` may require bumping this string. Keeping the pin
// explicit (rather than letting it float) keeps webhook payloads
// stable across SDK upgrades.
const STRIPE_API_VERSION = "2026-04-22.dahlia" as const;

let cached: Stripe | null | undefined;

/**
 * Lazy Stripe client. Returns `null` when `STRIPE_SECRET_KEY` is unset
 * (typical for local dev / CI) so callers can degrade gracefully —
 * mirrors the same nullable-client pattern as `src/lib/email/send.ts`.
 */
export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    cached = null;
    return null;
  }
  cached = new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    // Identify our integration in Stripe's logs / support tickets.
    appInfo: { name: "Salute di Ferro", url: "https://my.salutediferro.com" },
  });
  return cached;
}

/** Webhook signing secret — kept as a thin getter for symmetry. */
export function getWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null;
}
