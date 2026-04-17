import { NextResponse } from "next/server";
import crypto from "node:crypto";
import type { ProfessionalRole } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createInvitationSchema } from "@/lib/validators/invitation";
import { rateLimit, requestKey } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

/**
 * Authorize the caller as a DOCTOR or COACH. Returns the Prisma row or a
 * NextResponse error to return directly.
 */
async function requireProfessional() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const pro = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, role: true, fullName: true },
  });
  if (!pro || (pro.role !== "DOCTOR" && pro.role !== "COACH")) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { pro };
}

/** 32 URL-safe bytes → 43 chars of base64url, with CSPRNG entropy. */
function generateInviteToken() {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * POST /api/invitations
 * Creates a one-shot invite link that a patient can use at
 * `/register?invite=<token>` to sign up and auto-bind to the caller.
 */
export async function POST(req: Request) {
  const rl = await rateLimit({
    key: requestKey(req, "invitations-create"),
    limit: 20,
    windowMs: 60 * 60 * 1000, // 20 invites / hour / IP
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Troppi inviti generati, riprova più tardi" },
      { status: 429 },
    );
  }

  const authz = await requireProfessional();
  if ("error" in authz) return authz.error;
  const { pro } = authz;

  const json = await req.json().catch(() => ({}));
  const parsed = createInvitationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues },
      { status: 400 },
    );
  }

  const { email, firstName, lastName, note, expiresInDays } = parsed.data;

  // Map caller role (DOCTOR|COACH|...) to the invite's professionalRole.
  // requireProfessional() already narrowed role to DOCTOR|COACH, but keep
  // an explicit guard so the cast is obviously safe.
  const professionalRole: ProfessionalRole =
    pro.role === "DOCTOR" ? "DOCTOR" : "COACH";

  const days = expiresInDays ?? 14;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const invite = await prisma.invitation.create({
    data: {
      token: generateInviteToken(),
      professionalId: pro.id,
      professionalRole,
      email: email && email.length > 0 ? email : null,
      firstName: firstName && firstName.length > 0 ? firstName : null,
      lastName: lastName && lastName.length > 0 ? lastName : null,
      note: note && note.length > 0 ? note : null,
      expiresAt,
    },
    select: {
      id: true,
      token: true,
      email: true,
      firstName: true,
      lastName: true,
      note: true,
      professionalRole: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  await logAudit({
    actorId: pro.id,
    action: "INVITATION_CREATE",
    entityType: "Invitation",
    entityId: invite.id,
    metadata: {
      professionalRole: invite.professionalRole,
      email: invite.email,
      expiresAt: invite.expiresAt.toISOString(),
    },
    request: req,
  });

  return NextResponse.json(invite, { status: 201 });
}

/**
 * GET /api/invitations
 * Lists the caller's invitations (most recent first). Automatically marks
 * expired rows as EXPIRED as a side effect (cheap one-pass sweep).
 */
export async function GET(req: Request) {
  const authz = await requireProfessional();
  if ("error" in authz) return authz.error;
  const { pro } = authz;

  // Best-effort: flip any of the caller's PENDING invites past expiry to
  // EXPIRED. Non-blocking correctness — status is recomputed on verify too.
  await prisma.invitation.updateMany({
    where: {
      professionalId: pro.id,
      status: "PENDING",
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  const items = await prisma.invitation.findMany({
    where: { professionalId: pro.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      token: true,
      email: true,
      firstName: true,
      lastName: true,
      note: true,
      professionalRole: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      usedAt: true,
      usedBy: { select: { id: true, fullName: true, email: true } },
    },
  });

  return NextResponse.json({ items });
}
