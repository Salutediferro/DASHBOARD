import { NextResponse } from "next/server";
import { z } from "zod";

import { rateLimit, requestKey } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import {
  GOOGLE_SIGNUP_COOKIE,
  GOOGLE_SIGNUP_TTL_SECONDS,
  issueGoogleSignupToken,
} from "@/lib/auth/google-signup-token";

// inviteToken is **required** — there is no self-serve patient signup
// anymore (post-Stripe-invite refactor). Body schema enforces presence.
const bodySchema = z.object({
  acceptTerms: z.literal(true),
  acceptHealthDataProcessing: z.literal(true),
  inviteToken: z.string().min(10).max(200),
});

/**
 * POST /api/auth/google-signup/prepare
 *
 * Called by the "Continua con Google" button on /register *before*
 * supabase.auth.signInWithOAuth fires. The body carries the two GDPR
 * consent flags and a **mandatory** invite token; we validate them
 * server-side (including verifying the token resolves to a PENDING,
 * non-expired Invitation) and set a short-lived signed cookie that
 * the /auth/callback handler reads after Google bounces the user back.
 *
 * No invite → no cookie → no signup. The /auth/callback handler will
 * also refuse to create a public.User row without a valid signup
 * cookie, so this is defense-in-depth, not the sole gate.
 */
export async function POST(req: Request) {
  // Same rate limit as /api/auth/register: 5 per IP per 10 minutes.
  const rl = await rateLimit({
    key: requestKey(req, "auth-google-signup-prepare"),
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
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Per registrarti con Google serve un invito valido e devi accettare privacy, termini e il trattamento dei dati sanitari.",
      },
      { status: 400 },
    );
  }

  // Verify the invite is real and still usable BEFORE bouncing through
  // Google — saves the user a futile OAuth round-trip when the link is
  // stale (e.g. they're refreshing an old email).
  const invite = await prisma.invitation.findUnique({
    where: { token: parsed.data.inviteToken },
    select: { id: true, status: true, expiresAt: true },
  });
  if (
    !invite ||
    invite.status !== "PENDING" ||
    invite.expiresAt.getTime() < Date.now()
  ) {
    return NextResponse.json(
      { error: "Invito non valido o scaduto" },
      { status: 400 },
    );
  }

  const token = issueGoogleSignupToken({
    inviteToken: parsed.data.inviteToken,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: GOOGLE_SIGNUP_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // `lax` so the cookie survives the Google → Supabase → us redirect.
    // `strict` would strip it on the OAuth bounce-back and we'd lose
    // the consent payload.
    sameSite: "lax",
    path: "/",
    maxAge: GOOGLE_SIGNUP_TTL_SECONDS,
  });
  return res;
}
