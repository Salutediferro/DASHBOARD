import { NextResponse } from "next/server";
import { buildUserExport } from "@/lib/user-export";
import { errorResponse, requireRole } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/admin/users/[id]/export
 *
 * Admin-triggered GDPR Art. 15 / Art. 20 export for any user. The response
 * is separately audited as `ADMIN_USER_EXPORT` (distinct from the self-
 * service `USER_EXPORT`) so an auditor can immediately tell a human asked
 * for their own data vs. an admin pulled it on their behalf.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await requireRole(["ADMIN"]);
    const { id } = await params;

    const result = await buildUserExport(id);
    if (!result) {
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 404 },
      );
    }

    await logAudit({
      actorId: me.id,
      action: "ADMIN_USER_EXPORT",
      entityType: "User",
      entityId: id,
      metadata: {
        ...result.counts,
        targetEmail: result.payload.user.email,
      },
      request: req,
    });

    return new NextResponse(JSON.stringify(result.payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="sdf-admin-export-${id}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
