import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildUserExport } from "@/lib/user-export";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/me/export
 *
 * GDPR Art. 15 / Art. 20 (right of access + right to data portability).
 * Returns a full JSON dump of every row the caller owns. File contents
 * are deliberately excluded — a patient needing the actual files fetches
 * them one by one through the normal signed-URL flow.
 *
 * The payload shape is defined in `lib/user-export.ts` and shared with
 * the admin-triggered export endpoint, so both stay in sync.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await buildUserExport(user.id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAudit({
    actorId: user.id,
    action: "USER_EXPORT",
    entityType: "User",
    entityId: user.id,
    metadata: result.counts,
    request: req,
  });

  return new NextResponse(JSON.stringify(result.payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="salute-di-ferro-export-${user.id}.json"`,
    },
  });
}
