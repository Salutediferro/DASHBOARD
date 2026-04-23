import { NextResponse } from "next/server";
import { getActiveBroadcast } from "@/lib/broadcast";

/**
 * GET /api/broadcast
 *
 * Public read endpoint for the platform-wide banner. No auth: we want
 * anon visitors on `/login` to see "manutenzione 22-24" too, otherwise
 * the main reason to have a banner is undermined.
 *
 * Returns `{ broadcast: null }` when nothing is active (easier for the
 * client than handling 404s).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const broadcast = await getActiveBroadcast();
  return NextResponse.json(
    { broadcast },
    {
      headers: {
        // Short CDN cache — clients poll every 60s and we don't want
        // the banner to lag behind an admin toggle by much more.
        "Cache-Control": "public, max-age=15, s-maxage=15",
      },
    },
  );
}
