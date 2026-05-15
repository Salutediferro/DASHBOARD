import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { resolveCaller } from "@/lib/appointments/access";
import { exchangeCode, googleOAuthConfigured } from "@/lib/google/oauth";
import { prisma } from "@/lib/prisma";

const STATE_COOKIE = "sdf-google-oauth-state";

/**
 * GET /api/google/oauth/callback
 *
 * Google bounces back here after the user grants (or refuses) the
 * consent prompt. We:
 *   1. Compare `state` against the value we tucked in the cookie at
 *      /start — protects against CSRF on the OAuth round trip.
 *   2. Exchange the `code` for tokens, including the long-lived
 *      refresh token (we asked for offline + consent at /start).
 *   3. Upsert a GoogleAccount row keyed by `userId`.
 *   4. Redirect back to the profile page with a status query string so
 *      the UI can render a toast.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const profileRedirect = (status: "ok" | "error" | "denied", role: string) => {
    // Doctor and coach share the same Connetti button; the profile URL
    // differs per role. Default to /dashboard if we can't tell.
    const base =
      role === "COACH"
        ? "/dashboard/coach/profile"
        : role === "DOCTOR"
          ? "/dashboard/doctor/profile"
          : "/dashboard";
    return NextResponse.redirect(
      new URL(`${base}?google=${status}`, url.origin),
    );
  };

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
    return NextResponse.redirect(new URL("/login", url.origin));
  }
  const me = await resolveCaller(user.id);
  if (!me || (me.role !== "DOCTOR" && me.role !== "COACH")) {
    return profileRedirect("error", me?.role ?? "");
  }

  // The user can cancel the Google consent — Google sends back `?error=...`.
  if (url.searchParams.get("error")) {
    return clearStateAndRedirect(profileRedirect("denied", me.role));
  }

  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const stateCookie = req.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.split("=")[1];

  if (!code || !stateParam || !stateCookie || stateParam !== stateCookie) {
    return clearStateAndRedirect(profileRedirect("error", me.role));
  }

  try {
    const tokens = await exchangeCode(code);
    await prisma.googleAccount.upsert({
      where: { userId: me.id },
      update: {
        googleSub: tokens.googleSub,
        email: tokens.email,
        refreshToken: tokens.refreshToken,
        accessToken: tokens.accessToken,
        expiryDate: tokens.expiryDate,
        scope: tokens.scope,
      },
      create: {
        userId: me.id,
        googleSub: tokens.googleSub,
        email: tokens.email,
        refreshToken: tokens.refreshToken,
        accessToken: tokens.accessToken,
        expiryDate: tokens.expiryDate,
        scope: tokens.scope,
      },
    });
    return clearStateAndRedirect(profileRedirect("ok", me.role));
  } catch {
    return clearStateAndRedirect(profileRedirect("error", me.role));
  }
}

function clearStateAndRedirect(res: NextResponse): NextResponse {
  res.cookies.set({
    name: STATE_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/google/oauth",
    maxAge: 0,
  });
  return res;
}
