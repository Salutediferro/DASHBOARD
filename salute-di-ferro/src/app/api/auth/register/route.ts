import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import type { UserRole } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators/auth";
import { rateLimit, requestKey } from "@/lib/rate-limit";
import { getFeatureFlag } from "@/lib/feature-flags";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/send";
import { welcomeProfessionalEmail } from "@/lib/email/templates";

/**
 * POST /api/auth/register
 *
 * - Public PATIENT signup: anyone may call with role=PATIENT. Creates a
 *   Supabase auth user (password set) + Prisma User row with role PATIENT.
 * - Admin-provisioned DOCTOR / COACH: caller must be an authenticated
 *   ADMIN; the request body selects the target role.
 * - ADMIN creation is NOT exposed here (seed or manual promotion).
 *
 * The role is mirrored into Supabase app_metadata so the middleware can
 * dispatch without hitting Prisma on every request. The Prisma row remains
 * the source of truth.
 */
export async function POST(req: Request) {
  // Rate limit: 5 registrations per IP per 10 minutes. Protects against
  // basic enumeration / flood.
  const rl = await rateLimit({
    key: requestKey(req, "auth-register"),
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Troppi tentativi, riprova più tardi" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) },
      },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues },
      { status: 400 },
    );
  }

  const {
    email,
    password,
    firstName,
    lastName,
    sex,
    birthDate,
    role: targetRole,
    inviteToken,
    acceptTerms,
    acceptHealthDataProcessing,
  } = parsed.data;

  // Feature flag: if PATIENT signup is globally closed (e.g. soft-launch
  // or incident), reject early with a 503 so the client can show the
  // dedicated "chiuso" message. Admin-provisioned DOCTOR/COACH still
  // go through — the flag gates public signups only.
  if (targetRole === "PATIENT") {
    const registrationOpen = await getFeatureFlag("patient-registration-open");
    if (!registrationOpen) {
      return NextResponse.json(
        {
          error:
            "Registrazione pazienti temporaneamente chiusa. Contattare info@salutediferro.com per assistenza.",
        },
        { status: 503 },
      );
    }
  }

  // Authorization: only ADMIN may provision DOCTOR/COACH. PATIENT is public.
  if (targetRole !== "PATIENT") {
    const supabase = await createClient();
    const {
      data: { user: callerAuth },
    } = await supabase.auth.getUser();
    if (!callerAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const caller = await prisma.user.findUnique({
      where: { id: callerAuth.id },
      select: { role: true },
    });
    if (!caller || caller.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // If an invite token was provided, validate it *before* creating any
  // auth user — avoids orphan accounts from bad tokens. Only PATIENT
  // self-signup consumes invites.
  let invite: {
    id: string;
    professionalId: string;
    professionalRole: "DOCTOR" | "COACH";
  } | null = null;
  if (inviteToken && targetRole === "PATIENT") {
    const found = await prisma.invitation.findUnique({
      where: { token: inviteToken },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        professionalId: true,
        professionalRole: true,
      },
    });
    if (!found) {
      return NextResponse.json(
        { error: "Invito non trovato" },
        { status: 400 },
      );
    }
    const effectivelyInvalid =
      found.status !== "PENDING" ||
      found.expiresAt.getTime() < Date.now();
    if (effectivelyInvalid) {
      return NextResponse.json(
        { error: "Invito scaduto o già utilizzato" },
        { status: 400 },
      );
    }
    invite = {
      id: found.id,
      professionalId: found.professionalId,
      professionalRole: found.professionalRole,
    };
  }

  const org = await prisma.organization.findFirst({
    where: { slug: "salute-di-ferro" },
    select: { id: true },
  });
  if (!org) {
    return NextResponse.json(
      { error: "Default organization missing" },
      { status: 500 },
    );
  }

  const admin = createAdminClient();

  // Email-verification policy:
  //   - PATIENT public signup → email_confirm: false. The auth-form
  //     then triggers supabase.auth.resend({ type: 'signup' }) to send
  //     the confirmation email; the user cannot log in until they
  //     click it.
  //   - ADMIN-provisioning DOCTOR/COACH → email_confirm: true (the admin
  //     vouches for the address) + a random throw-away password nobody
  //     will ever know. We then generate a "recovery" action-link via
  //     supabase.auth.admin.generateLink and email it so the pro can
  //     set their own password and sign in.
  const requireEmailConfirmation = targetRole === "PATIENT";
  const isProProvisioning = targetRole !== "PATIENT";

  // For pros the body doesn't carry a password — mint a high-entropy
  // one that never leaves the server. Used only until the pro completes
  // setup via the recovery link.
  const effectivePassword =
    password ?? randomBytes(48).toString("base64url");

  // Create the Supabase auth user with role in app_metadata.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: effectivePassword,
    email_confirm: !requireEmailConfirmation,
    app_metadata: { role: targetRole satisfies UserRole },
    user_metadata: { firstName, lastName },
  });
  if (createErr || !created.user) {
    return NextResponse.json(
      { error: createErr?.message ?? "Auth user creation failed" },
      { status: 400 },
    );
  }

  const fullName = `${firstName} ${lastName}`.trim();

  try {
    // If this is a PATIENT signup with a valid invite, create the user,
    // the CareRelationship, and mark the invite consumed in one
    // transaction. Otherwise just create the user.
    const dbUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          id: created.user.id,
          email,
          fullName,
          firstName,
          lastName,
          sex: sex ?? null,
          birthDate: birthDate ? new Date(birthDate) : null,
          role: targetRole,
          organizationId: org.id,
        },
        select: { id: true, email: true, role: true, fullName: true },
      });

      if (invite) {
        await tx.careRelationship.upsert({
          where: {
            professionalId_patientId_professionalRole: {
              professionalId: invite.professionalId,
              patientId: u.id,
              professionalRole: invite.professionalRole,
            },
          },
          create: {
            professionalId: invite.professionalId,
            patientId: u.id,
            professionalRole: invite.professionalRole,
            status: "ACTIVE",
          },
          update: { status: "ACTIVE" },
        });
        await tx.invitation.update({
          where: { id: invite.id },
          data: {
            status: "ACCEPTED",
            usedAt: new Date(),
            usedByUserId: u.id,
          },
        });
      }
      return u;
    });

    // For admin-provisioned pros, send a branded welcome email with a
    // password-setup link. Best-effort: email failure doesn't roll back
    // the account (admin can resend from the UI — future improvement).
    let setupEmailStatus:
      | "sent"
      | "failed"
      | "skipped"
      | "link-only" = "skipped";
    let setupLinkFallback: string | null = null;
    if (isProProvisioning) {
      const origin = new URL(req.url).origin;
      const { data: linkData, error: linkErr } =
        await admin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: {
            redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/set-password")}`,
          },
        });
      const actionLink = linkData?.properties?.action_link;
      if (linkErr || !actionLink) {
        setupEmailStatus = "failed";
      } else {
        const tmpl = welcomeProfessionalEmail({
          setupUrl: actionLink,
          firstName,
          role: targetRole as "DOCTOR" | "COACH",
        });
        const sent = await sendEmail({
          to: email,
          subject: tmpl.subject,
          html: tmpl.html,
          text: tmpl.text,
          tags: [
            { name: "type", value: "welcome-professional" },
            { name: "role", value: targetRole },
          ],
        });
        if (sent.ok) {
          setupEmailStatus = "sent";
        } else {
          // The link is valid — let the admin UI copy/paste it out of
          // band as a fallback.
          setupEmailStatus = "link-only";
          setupLinkFallback = actionLink;
        }
      }
    }

    await logAudit({
      actorId: dbUser.id,
      action:
        targetRole === "PATIENT" ? "USER_REGISTER" : "ADMIN_USER_PROVISION",
      entityType: "User",
      entityId: dbUser.id,
      metadata: {
        role: targetRole,
        email,
        // Record the explicit consents so the audit trail carries a
        // timestamped proof of lawful basis for the Art. 9 processing.
        ...(targetRole === "PATIENT"
          ? {
              acceptedTerms: acceptTerms === true,
              acceptedHealthDataProcessing:
                acceptHealthDataProcessing === true,
              consentAt: new Date().toISOString(),
            }
          : {}),
        ...(invite
          ? {
              inviteId: invite.id,
              invitingProfessionalId: invite.professionalId,
              professionalRole: invite.professionalRole,
            }
          : {}),
        ...(isProProvisioning ? { setupEmailStatus } : {}),
      },
      request: req,
    });
    return NextResponse.json(
      {
        ...dbUser,
        requiresEmailConfirmation: requireEmailConfirmation,
        ...(isProProvisioning
          ? {
              setupEmailStatus,
              // Only exposed when the email couldn't be delivered so
              // the admin can copy it manually — never shown on success.
              setupLinkFallback,
            }
          : {}),
      },
      { status: 201 },
    );
  } catch (e) {
    // Roll back the auth user if the Prisma insert fails so we don't leave
    // an orphaned auth record.
    await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    const message = e instanceof Error ? e.message : "DB insert failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
