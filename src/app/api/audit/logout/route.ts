import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/audit/logout
 *
 * Called by the user menu right BEFORE `supabase.auth.signOut()` so the
 * session is still valid when we record the audit row. After signOut
 * the cookie is cleared and we'd see an anonymous request. The order
 * is important — if the client does it in the wrong order, the audit
 * row's actor becomes null (still useful but less precise).
 *
 * Best-effort: never propagates failures to the caller.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await logAudit({
        actorId: user.id,
        action: "LOGOUT",
        entityType: "User",
        entityId: user.id,
        request: req,
      });
    }
  } catch {
    // swallow
  }
  return new NextResponse(null, { status: 204 });
}
