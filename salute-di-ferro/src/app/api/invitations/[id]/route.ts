import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

/**
 * DELETE /api/invitations/[id]
 * Revokes one of the caller's invitations. Only the inviting professional
 * (or an ADMIN) can revoke. Already-ACCEPTED invites can be revoked too —
 * revoking just marks the row REVOKED and does not roll back the
 * CareRelationship (remove that through the relationships UI instead).
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, role: true },
  });
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invite = await prisma.invitation.findUnique({
    where: { id },
    select: { id: true, professionalId: true, status: true },
  });
  if (!invite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = invite.professionalId === me.id;
  const isAdmin = me.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.invitation.update({
    where: { id },
    data: { status: "REVOKED" },
    select: { id: true, status: true },
  });

  await logAudit({
    actorId: me.id,
    action: "INVITATION_REVOKE",
    entityType: "Invitation",
    entityId: id,
    request: req,
  });

  return NextResponse.json(updated);
}
