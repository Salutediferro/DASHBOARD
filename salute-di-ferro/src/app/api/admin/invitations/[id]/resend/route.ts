import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { errorResponse, requireRole } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { invitationEmail } from "@/lib/email/templates";

const RESEND_EXTEND_DAYS = 14;

/**
 * POST /api/admin/invitations/[id]/resend
 *
 * Regenerates the invite token, extends expiresAt by 14 days, flips status
 * back to PENDING (for EXPIRED/REVOKED rows), and re-sends the invitation
 * email. Useful when the original email bounced or the token expired while
 * the user was procrastinating.
 *
 * Refuses on ACCEPTED invites — re-inviting an already-onboarded patient
 * would be confusing and a security red flag.
 *
 * Rotating the token is important: if the old link leaked we don't want
 * it to keep working alongside the new one.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await requireRole(["ADMIN"]);
    const { id } = await params;

    const rl = await rateLimit({
      key: `admin-invitation-resend:${me.id}`,
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Troppi re-invii, riprova più tardi" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) },
        },
      );
    }

    const invite = await prisma.invitation.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        status: true,
        professionalRole: true,
        professional: { select: { id: true, fullName: true } },
      },
    });
    if (!invite) {
      return NextResponse.json({ error: "Invito non trovato" }, { status: 404 });
    }
    if (invite.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "Invito già accettato — non può essere reinviato" },
        { status: 409 },
      );
    }
    if (!invite.email) {
      return NextResponse.json(
        {
          error:
            "Invito senza email — crea un nuovo link e passalo manualmente",
        },
        { status: 400 },
      );
    }

    const newToken = crypto.randomBytes(32).toString("base64url");
    const newExpiresAt = new Date(
      Date.now() + RESEND_EXTEND_DAYS * 24 * 60 * 60 * 1000,
    );

    const updated = await prisma.invitation.update({
      where: { id },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
        status: "PENDING",
      },
      select: {
        id: true,
        token: true,
        email: true,
        firstName: true,
        professionalRole: true,
        status: true,
        expiresAt: true,
      },
    });

    const origin = new URL(req.url).origin;
    const inviteUrl = `${origin}/register?invite=${updated.token}`;
    const { html, text } = invitationEmail({
      inviteUrl,
      professionalName: invite.professional.fullName,
      professionalRole: updated.professionalRole,
      expiresAt: updated.expiresAt,
      firstName: updated.firstName,
    });
    const emailRes = await sendEmail({
      to: updated.email ?? invite.email,
      subject: `${invite.professional.fullName} ti ha invitato su Salute di Ferro`,
      html,
      text,
      tags: [
        { name: "type", value: "invitation" },
        { name: "event", value: "resend" },
      ],
    });
    const emailDelivered =
      emailRes.ok && !("skipped" in emailRes && emailRes.skipped);

    await logAudit({
      actorId: me.id,
      action: "INVITATION_RESEND",
      entityType: "Invitation",
      entityId: id,
      metadata: {
        email: invite.email,
        professionalId: invite.professional.id,
        newExpiresAt: updated.expiresAt.toISOString(),
        emailDelivered,
        previousStatus: invite.status,
      },
      request: req,
    });

    return NextResponse.json({
      ok: true,
      id: updated.id,
      expiresAt: updated.expiresAt,
      emailDelivered,
      fallbackLink: emailDelivered ? null : inviteUrl,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
