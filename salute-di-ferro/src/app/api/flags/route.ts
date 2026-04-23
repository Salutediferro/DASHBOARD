import { NextResponse } from "next/server";
import { getAllFeatureFlags } from "@/lib/feature-flags";

/**
 * GET /api/flags
 *
 * Public map of every feature flag's current value. No auth: client-side
 * UI needs to know which features to render for any visitor (e.g. hide
 * the "Crea account" CTA on `/register` if `patient-registration-open`
 * is OFF). Never surface admin ops toggles through this route — those
 * live in `platform-settings.ts` and have their own admin-only endpoint.
 *
 * Short CDN cache so an admin flip propagates within ~15s.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const flags = await getAllFeatureFlags();
  return NextResponse.json(
    { flags },
    {
      headers: {
        "Cache-Control": "public, max-age=15, s-maxage=15",
      },
    },
  );
}
