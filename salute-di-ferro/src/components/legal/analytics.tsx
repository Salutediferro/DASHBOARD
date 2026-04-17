"use client";

import * as React from "react";
import Script from "next/script";
import { useConsent } from "@/lib/legal/consent";

/**
 * Plausible Analytics loader — gated on user consent.
 *
 * Plausible is cookieless and GDPR-friendly (hashes IP + salt for unique
 * counting, no personal data leaves the EU instance). In strict
 * jurisdictions it can run without a consent banner, but because we
 * already ship a banner, we gate anyway: it respects user choice and
 * avoids any ambiguity under art. 122 Codice Privacy.
 *
 * Wiring:
 *   NEXT_PUBLIC_PLAUSIBLE_DOMAIN  — e.g. "my.salutediferro.com"
 *   NEXT_PUBLIC_PLAUSIBLE_SRC     — optional, defaults to the Plausible
 *                                   Cloud EU script. Override if
 *                                   self-hosting.
 *
 * If NEXT_PUBLIC_PLAUSIBLE_DOMAIN is unset, nothing renders (dev mode
 * and branches without analytics configured just skip it).
 */
export function Analytics() {
  const consent = useConsent();
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const src =
    process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ??
    "https://plausible.io/js/script.outbound-links.js";

  // `consent === undefined` means we're still hydrating localStorage —
  // don't load the script yet. `null` means the user has never decided
  // (default-off for analytics). Only load when analytics is explicitly
  // true.
  if (!domain) return null;
  if (!consent || consent.analytics !== true) return null;

  return (
    <Script
      defer
      data-domain={domain}
      src={src}
      strategy="afterInteractive"
    />
  );
}
