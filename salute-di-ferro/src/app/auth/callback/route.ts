import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import {
  GOOGLE_SIGNUP_COOKIE,
  verifyGoogleSignupToken,
} from "@/lib/auth/google-signup-token";

/**
 * Supabase redirects here after any email-based auth action and after
 * Google OAuth completes. We exchange the one-shot `code` for a session
 * and then bounce to `next` (dashboard by default).
 *
 * Three branches once the exchange succeeds:
 *
 * 1. **Existing user** (public.User row already exists) → just audit
 *    a LOGIN and redirect. This is the *only* way Google sign-in
 *    succeeds — it implicitly gates Google login on "user paid"
 *    (because the User row only exists post-invitation).
 *
 * 2. **New Google user with a valid signup cookie carrying a valid
 *    invite token** → create the public.User as PATIENT, consume the
 *    invite (CareRelationship for PROFESSIONAL source, customer-id
 *    stamp for STRIPE source), audit USER_REGISTER with consent flags.
 *    The cookie was minted by /api/auth/google-signup/prepare *before*
 *    the OAuth round trip, which already verified the invite exists.
 *
 * 3. **New auth.users with no signup cookie or no valid invite** →
 *    someone hit Google sign-in from /login without an account, or
 *    tried to register via Google without a paid invitation. We
 *    delete the orphan auth user and bounce them to /login with an
 *    error toast — paid invite is the only legal entry point.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=callback", url.origin));
  }

  const supabase = await createClient();
  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeErr) {
    return NextResponse.redirect(new URL("/login?error=callback", url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=callback", url.origin));
  }

  // Is this Google OAuth? Identities include "google" as the provider
  // for accounts created via signInWithOAuth.
  const isGoogle = (user.identities ?? []).some(
    (i) => i.provider === "google",
  );

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  });

  if (existing) {
    // Branch 1: returning user. Cover both email-link and Google here.
    try {
      await logAudit({
        actorId: user.id,
        action: "LOGIN",
        entityType: "User",
        entityId: user.id,
        metadata: { method: isGoogle ? "google" : "email-link" },
        request,
      });
    } catch {
      // Never block the redirect on an audit hiccup.
    }
    return clearSignupCookie(
      NextResponse.redirect(new URL(next, url.origin)),
    );
  }

  // From here down: new auth.users row that has no matching public.User
  // yet. Only Google can land here legitimately (the password flow
  // pre-creates the public.User inside /api/auth/register and only then
  // signs the user in).
  if (!isGoogle) {
    // Defensive: if a non-Google flow somehow gets here, send the user
    // to login. We don't auto-create the User because we have no
    // consent record.
    return NextResponse.redirect(
      new URL("/login?error=callback", url.origin),
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieToken = cookieHeader
    .split("; ")
    .find((c) => c.startsWith(`${GOOGLE_SIGNUP_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  const verified = verifyGoogleSignupToken(cookieToken);
  if (!verified.ok) {
    // Branch 3: new Google user, no consent → reject and clean up.
    const admin = createAdminClient();
    await admin.auth.admin
      .deleteUser(user.id)
      .catch(() => undefined);
    // Best-effort: sign them out of the session that was just created.
    await supabase.auth.signOut().catch(() => undefined);
    return clearSignupCookie(
      NextResponse.redirect(
        new URL("/register?error=google-needs-consent", url.origin),
      ),
    );
  }

  // Branch 2: new Google user, consent on file. Build the public.User.
  const org = await prisma.organization.findFirst({
    where: { slug: "salute-di-ferro" },
    select: { id: true },
  });
  if (!org) {
    return NextResponse.redirect(
      new URL("/register?error=org-missing", url.origin),
    );
  }

  // Pull name from Google's user_metadata. Falls back to splitting the
  // email when Google sent us nothing usable (rare).
  const meta = (user.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
  };
  const fullNameRaw =
    meta.full_name?.trim() ||
    meta.name?.trim() ||
    [meta.given_name, meta.family_name].filter(Boolean).join(" ").trim() ||
    (user.email ? user.email.split("@")[0] : "Utente");
  const firstName =
    meta.given_name?.trim() ||
    fullNameRaw.split(/\s+/).slice(0, -1).join(" ") ||
    fullNameRaw;
  const lastName =
    meta.family_name?.trim() ||
    (fullNameRaw.split(/\s+/).length > 1
      ? fullNameRaw.split(/\s+/).slice(-1).join(" ")
      : "");
  const email = user.email;
  if (!email) {
    return NextResponse.redirect(
      new URL("/register?error=google-no-email", url.origin),
    );
  }

  // If a public.User with this email already exists (a previous
  // password signup, for instance), we can't safely link — Supabase
  // created a brand-new auth.users row with a different id and our
  // public.User.email is unique. Bounce out cleanly.
  const byEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (byEmail) {
    const admin = createAdminClient();
    await admin.auth.admin
      .deleteUser(user.id)
      .catch(() => undefined);
    await supabase.auth.signOut().catch(() => undefined);
    return clearSignupCookie(
      NextResponse.redirect(
        new URL("/login?error=google-email-exists", url.origin),
      ),
    );
  }

  // Validate the invite. After the invite-only refactor an invite is
  // MANDATORY for Google signups — without one we have no proof the
  // user paid or was professionally invited, so we reject. Same shape
  // as /api/auth/register so the branches behave identically.
  const inviteToken = verified.inviteToken;
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
  if (inviteToken) {
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
    if (
      found &&
      found.status === "PENDING" &&
      found.expiresAt.getTime() >= Date.now()
    ) {
      if (
        found.source === "PROFESSIONAL" &&
        found.professionalId &&
        found.professionalRole
      ) {
        invite = {
          kind: "PROFESSIONAL",
          id: found.id,
          professionalId: found.professionalId,
          professionalRole: found.professionalRole,
          stripeCustomerId: null,
        };
      } else if (found.source === "STRIPE") {
        invite = {
          kind: "STRIPE",
          id: found.id,
          professionalId: null,
          professionalRole: null,
          stripeCustomerId: found.stripeCustomerId,
        };
      }
    }
  }

  // No usable invite → reject. Clean up the orphan auth user so the
  // visitor can re-try with a fresh link without "email already in use"
  // errors. The toast on /login explains they need a paid invitation.
  if (!invite) {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(user.id).catch(() => undefined);
    await supabase.auth.signOut().catch(() => undefined);
    return clearSignupCookie(
      NextResponse.redirect(
        new URL("/login?error=invite-required", url.origin),
      ),
    );
  }

  // Stamp the role into Supabase app_metadata so middleware can
  // dispatch without hitting Prisma. Same as the password path.
  try {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { role: "PATIENT" },
      user_metadata: { firstName, lastName, full_name: fullNameRaw },
    });
  } catch {
    // Non-fatal: the Prisma row is the source of truth. Middleware
    // falls back to a DB lookup when app_metadata.role is missing.
  }

  try {
    const dbUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          id: user.id,
          email,
          fullName: fullNameRaw,
          firstName,
          lastName: lastName || null,
          role: "PATIENT",
          organizationId: org.id,
          stripeCustomerId:
            invite.kind === "STRIPE" ? invite.stripeCustomerId : undefined,
        },
        select: { id: true, email: true, fullName: true },
      });
      if (invite.kind === "PROFESSIONAL") {
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
      await tx.invitation.update({
        where: { id: invite.id },
        data: {
          status: "ACCEPTED",
          usedAt: new Date(),
          usedByUserId: u.id,
        },
      });
      return u;
    });

    await logAudit({
      actorId: dbUser.id,
      action: "USER_REGISTER",
      entityType: "User",
      entityId: dbUser.id,
      metadata: {
        role: "PATIENT",
        email,
        method: "google",
        // Same consent shape as the password path so audit consumers
        // can read both flows uniformly.
        acceptedTerms: true,
        acceptedHealthDataProcessing: true,
        consentAt: new Date().toISOString(),
        ...(invite.kind === "PROFESSIONAL"
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
            }),
      },
      request,
    });
  } catch {
    // If the Prisma write blew up, roll back the auth row so the user
    // doesn't get stuck with a half-account they can't escape.
    const admin = createAdminClient();
    await admin.auth.admin
      .deleteUser(user.id)
      .catch(() => undefined);
    await supabase.auth.signOut().catch(() => undefined);
    return clearSignupCookie(
      NextResponse.redirect(
        new URL("/register?error=signup-failed", url.origin),
      ),
    );
  }

  return clearSignupCookie(
    NextResponse.redirect(new URL("/dashboard/patient", url.origin)),
  );
}

function clearSignupCookie(res: NextResponse): NextResponse {
  res.cookies.set({
    name: GOOGLE_SIGNUP_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
