/**
 * Browser-side Sentry init.
 *
 * Next.js 16 runs this file once, after the HTML document is loaded
 * and before React hydration starts (see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation-client.md).
 * That makes it the right place to capture errors from the earliest
 * moment of the app's lifecycle.
 *
 * Consent: the browser DSN only reports errors when the user has
 * *not* explicitly rejected analytics cookies. We treat Sentry as
 * part of the "analytics" category — strictly, error tracking for
 * service stability can be justified under legitimate interest, but
 * we're conservative here so the cookie banner remains truthful.
 */

import * as Sentry from "@sentry/nextjs";
import { readConsent } from "@/lib/legal/consent";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

function shouldEnable() {
  if (!dsn) return false;
  const consent = readConsent();
  // If the user hasn't decided yet OR has opted in to analytics, we
  // enable. Opting out (decidedAt set AND analytics=false) disables.
  if (!consent) return true;
  return consent.analytics === true;
}

if (typeof window !== "undefined" && shouldEnable()) {
  const environment =
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    process.env.NODE_ENV ??
    "development";
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: environment === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
  });

  // Re-apply when consent changes so opt-outs take effect without a
  // full page reload.
  window.addEventListener("sdf-consent-change", (e) => {
    const detail = (e as CustomEvent).detail;
    if (detail && detail.analytics === false) {
      Sentry.close();
    }
  });
}

export function onRouterTransitionStart(url: string) {
  Sentry.addBreadcrumb({
    category: "navigation",
    message: url,
    level: "info",
  });
}
