import { NextResponse } from "next/server";
import { z } from "zod";

import { rateLimit, requestKey } from "@/lib/rate-limit";
import { getFeatureFlag } from "@/lib/feature-flags";
import {
  GOOGLE_SIGNUP_COOKIE,
  GOOGLE_SIGNUP_TTL_SECONDS,
  issueGoogleSignupToken,
} from "@/lib/auth/google-signup-token";

const bodySchema = z.object({
  acceptTerms: z.literal(true),
  acceptHealthDataProcessing: z.literal(true),
  inviteToken: z.string().min(10).max(200).nullable().optional(),
});

/**
 * POST /api/auth/google-signup/prepare
 *
 * Called by the "Continua con Google" button on /register *before*
 * supabase.auth.signInWithOAuth fires. The body carries the two GDPR
 * consent flags and an optional invite token; we validate them
 * server-side and set a short-lived signed cookie that the
 * /auth/callback handler reads after Google bounces the user back.
 *
 * If this endpoint isn't called (or returns non-200), the callback
 * won't find the cookie and will refuse to create a public.User row —
 * the user is bounced back to /register with an error toast.
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

  // Same gate as password signup — if the feature flag is off, don't
  // hand out signup cookies either.
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

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Devi accettare privacy, termini e il trattamento dei dati sanitari per registrarti con Google.",
      },
      { status: 400 },
    );
  }

  const token = issueGoogleSignupToken({
    inviteToken: parsed.data.inviteToken ?? null,
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
