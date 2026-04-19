/**
 * Server-side Sentry init for Next.js 16 App Router.
 *
 * The `register()` hook runs once per serverless instance before any
 * request is handled. We conditionally load per runtime (node / edge)
 * so we don't pull Node-only code into the edge bundle.
 *
 * If SENTRY_DSN is not configured, Sentry's `init` becomes a no-op —
 * safe to deploy without credentials. Dev tip: set it in .env.local to
 * exercise the flow locally.
 */

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn,
      environment,
      // Keep traces conservative; rate-limit friendly out of the box.
      tracesSampleRate: environment === "production" ? 0.1 : 1.0,
      // Don't leak request bodies that may contain Art. 9 data.
      sendDefaultPii: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      environment,
      tracesSampleRate: environment === "production" ? 0.1 : 1.0,
      sendDefaultPii: false,
    });
  }
}

/**
 * App Router hook: forwards nested Server Component / route handler
 * errors to Sentry with the correct request context.
 */
export const onRequestError = Sentry.captureRequestError;
