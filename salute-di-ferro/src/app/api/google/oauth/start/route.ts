import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

import { createClient } from "@/lib/supabase/server";
import { resolveCaller } from "@/lib/appointments/access";
import { buildAuthUrl, googleOAuthConfigured } from "@/lib/google/oauth";

const STATE_COOKIE = "sdf-google-oauth-state";
const STATE_TTL_SECONDS = 10 * 60; // 10 minutes is plenty for the round trip

/**
 * GET /api/google/oauth/start
 *
 * Kicks off the Google Calendar linking flow:
 *   1. Verifies the caller is a logged-in DOCTOR or COACH (PATIENTs
 *      don't need this).
 *   2. Mints a random `state` and stashes it in an httpOnly cookie.
 *      The callback handler compares it against the value Google
 *      echoes back — that's our CSRF defense.
 *   3. 302s to Google's consent screen.
 */
export async function GET(req: Request) {
  if (!googleOAuthConfigured()) {
    return NextResponse.json(
      { error: "Google OAuth non configurato sul server" },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const me = await resolveCaller(user.id);
  if (!me || (me.role !== "DOCTOR" && me.role !== "COACH")) {
    return NextResponse.json(
      { error: "Solo i professionisti possono collegare Google Calendar" },
      { status: 403 },
    );
  }

  const state = randomBytes(24).toString("base64url");
  const authUrl = buildAuthUrl(state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set({
    name: STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // `lax` (not `strict`) because the callback request originates from
    // Google's domain — `strict` would strip the cookie and break CSRF
    // validation.
    sameSite: "lax",
    path: "/api/google/oauth",
    maxAge: STATE_TTL_SECONDS,
  });
  return res;
}
