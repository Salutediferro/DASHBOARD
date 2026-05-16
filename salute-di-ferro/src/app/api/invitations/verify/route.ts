import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/invitations/verify?token=<token>
 *
 * PUBLIC endpoint (no auth): used by the /register page to validate an
 * invite token and show the right "this is who invited you" preview.
 * Returns only non-sensitive fields (no internal ids, no caller email
 * beyond what the inviter typed into the form).
 *
 * The `source` field disambiguates the two invite shapes:
 *   - PROFESSIONAL → `professionalName` + `professionalRole` are set;
 *                    UI shows "Sei stato invitato da Dr. Rossi".
 *   - STRIPE       → both are null; UI shows "Completa la registrazione
 *                    dopo il pagamento" and skips the pro chip.
 *
 * Status semantics:
 *   200 → token valid, returns preview + pre-fill fields
 *   404 → token unknown
 *   410 → token exists but is expired / already used / revoked
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Token mancante" }, { status: 400 });
  }

  const invite = await prisma.invitation.findUnique({
    where: { token },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      source: true,
      email: true,
      firstName: true,
      lastName: true,
      note: true,
      professionalRole: true,
      professional: { select: { fullName: true } },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invito non trovato" }, { status: 404 });
  }

  // Recompute status from expiry so a stale PENDING row past its deadline
  // is reported correctly even before the sweep in GET /api/invitations.
  const effectiveStatus =
    invite.status === "PENDING" && invite.expiresAt.getTime() < Date.now()
      ? "EXPIRED"
      : invite.status;

  if (effectiveStatus !== "PENDING") {
    return NextResponse.json(
      { error: "Invito non più valido", reason: effectiveStatus },
      { status: 410 },
    );
  }

  return NextResponse.json({
    valid: true,
    source: invite.source,
    // Stripe-source invites have no professional yet — null both fields
    // so the UI can branch on `source === "STRIPE"` (or on null) cleanly.
    professionalName: invite.professional?.fullName ?? null,
    professionalRole: invite.professionalRole,
    email: invite.email,
    firstName: invite.firstName,
    lastName: invite.lastName,
    note: invite.note,
    expiresAt: invite.expiresAt.toISOString(),
  });
}
