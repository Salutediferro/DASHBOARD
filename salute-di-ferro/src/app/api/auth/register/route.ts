import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import type { UserRole } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators/auth";
import { rateLimit, requestKey } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/send";
import { welcomeProfessionalEmail } from "@/lib/email/templates";

/**
 * POST /api/auth/register
 *
 * - **Invitation-only PATIENT signup**: the caller must supply
 *   `inviteToken` matching a PENDING, non-expired Invitation. The
 *   Invitation can come from two sources:
 *     - `PROFESSIONAL` — a DOCTOR/COACH onboarded this patient. We
 *       create the CareRelationship transactionally on accept.
 *     - `STRIPE`       — the buyer paid for a seat. No professional
 *       attached yet; the patient picks one inside the app afterward.
 *
 * - Admin-provisioned DOCTOR / COACH: caller must be an authenticated
 *   ADMIN; the request body selects the target role. No invite needed.
 *
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

  // PATIENT signup is invite-only — the registerSchema already enforces
  // that `inviteToken` is present, but we re-check here defensively to
  // prevent any future schema drift from silently re-opening self-serve.
  if (targetRole === "PATIENT" && !inviteToken) {
    return NextResponse.json(
      {
        error:
          "Per registrarti serve un invito. Se hai pagato, controlla la casella email — ti abbiamo inviato il link. Altrimenti scrivi a info@salutediferro.com.",
      },
      { status: 403 },
    );
  }

  // Authorization: only ADMIN may provision DOCTOR/COACH. PATIENT is invite-gated.
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

  // Validate the invite *before* creating any auth user — avoids orphan
  // accounts from bad tokens. The schema guarantees inviteToken is set
  // when targetRole === "PATIENT"; the inner branch is the source-aware
  // expansion (PROFESSIONAL → CareRelationship, STRIPE → user only).
  type ProfessionalInvite = {
    kind: "PROFESSIONAL";
    id: string;
    professionalId: string;
    professionalRole: "DOCTOR" | "COACH";
    stripeCustomerId: null;
  };
  type StripeInvite = {
    kind: "STRIPE";
    id: string;
    professionalId: null;
    professionalRole: null;
    stripeCustomerId: string | null;
  };
  let invite: ProfessionalInvite | StripeInvite | null = null;
  if (inviteToken && targetRole === "PATIENT") {
    const found = await prisma.invitation.findUnique({
      where: { token: inviteToken },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        source: true,
        professionalId: true,
        professionalRole: true,
        stripeCustomerId: true,
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
    if (found.source === "PROFESSIONAL") {
      // DB check constraint guarantees these are non-null when source
      // is PROFESSIONAL, but narrow explicitly for the type.
      if (!found.professionalId || !found.professionalRole) {
        return NextResponse.json(
          { error: "Invito malformato (professionalId mancante)" },
          { status: 500 },
        );
      }
      invite = {
        kind: "PROFESSIONAL",
        id: found.id,
        professionalId: found.professionalId,
        professionalRole: found.professionalRole,
        stripeCustomerId: null,
      };
    } else {
      invite = {
        kind: "STRIPE",
        id: found.id,
        professionalId: null,
        professionalRole: null,
        stripeCustomerId: found.stripeCustomerId,
      };
    }
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
    // PATIENT path: create User + (PROFESSIONAL invite only) the
    // CareRelationship + mark invite consumed, all in one transaction.
    // STRIPE invites have no professional — we just stamp the Stripe
    // customer id onto the User so future Subscription rows can be
    // joined. DOCTOR/COACH provisioning: just create the User.
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
          // Stamp the Stripe customer id when this accept came from a
          // STRIPE invite — keeps Subscription joins working.
          stripeCustomerId:
            invite?.kind === "STRIPE" ? invite.stripeCustomerId : undefined,
        },
        select: { id: true, email: true, role: true, fullName: true },
      });

      if (invite?.kind === "PROFESSIONAL") {
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
      }
      if (invite) {
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
          ? invite.kind === "PROFESSIONAL"
            ? {
                inviteId: invite.id,
                inviteSource: "PROFESSIONAL" as const,
                invitingProfessionalId: invite.professionalId,
                professionalRole: invite.professionalRole,
              }
            : {
                inviteId: invite.id,
                inviteSource: "STRIPE" as const,
                stripeCustomerId: invite.stripeCustomerId,
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
