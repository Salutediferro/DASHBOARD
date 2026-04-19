import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

// Canonical dashboard home per role.
const ROLE_HOME: Record<string, string> = {
  ADMIN: "/dashboard/admin",
  DOCTOR: "/dashboard/doctor",
  COACH: "/dashboard/coach",
  PATIENT: "/dashboard/patient",
};

// Routes that stay reachable while a professional is being forced to
// finish 2FA setup — the security page itself, the logout endpoint and
// the whole /api surface so React-Query mutations don't deadlock.
const MFA_ESCAPE_PREFIXES = [
  "/dashboard/settings/security",
  "/auth",
  "/api",
];

const ROLES_REQUIRING_2FA = new Set(["DOCTOR", "COACH", "ADMIN"]);

// Allowed role(s) for each protected dashboard subtree, by URL prefix.
// Longer prefixes must come first so they win the match.
const ROLE_RULES: Array<{ prefix: string; roles: readonly string[] }> = [
  { prefix: "/dashboard/admin", roles: ["ADMIN"] },
  { prefix: "/dashboard/doctor", roles: ["DOCTOR", "ADMIN"] },
  { prefix: "/dashboard/coach", roles: ["COACH", "ADMIN"] },
  { prefix: "/dashboard/patient", roles: ["PATIENT", "ADMIN"] },
];

type DevBypassUser = {
  app_metadata: { role: string };
  user_metadata: Record<string, unknown>;
};

export async function middleware(request: NextRequest) {
  const { user: authUser, aal, response } = await updateSession(request);
  const { pathname, searchParams } = request.nextUrl;

  // ── Dev bypass ────────────────────────────────────────────────────────
  // Enabled only when NODE_ENV=development and NEXT_PUBLIC_DEV_BYPASS=1.
  // The impersonated role can be picked via ?role=doctor|coach|patient|admin
  // (defaults to PATIENT). Query param is read once per request; set it
  // anywhere inside /dashboard/* and it will propagate via the returned
  // user object for the rest of the middleware chain.
  const devBypassEnabled =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_BYPASS === "1";

  let user: typeof authUser | DevBypassUser | null = authUser;
  if (devBypassEnabled) {
    const qRole = searchParams.get("role")?.toUpperCase();
    const role =
      qRole && ["ADMIN", "DOCTOR", "COACH", "PATIENT"].includes(qRole)
        ? qRole
        : "PATIENT";
    user = {
      app_metadata: { role },
      user_metadata: {},
    };
  }

  const isAuthRoute = PUBLIC_AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isDashboard = pathname.startsWith("/dashboard");

  // Authenticated users cannot sit on auth pages — bounce them to their home.
  if (user && isAuthRoute) {
    const role =
      (user.app_metadata?.role as string | undefined) ??
      (user.user_metadata?.role as string | undefined);
    const home = (role && ROLE_HOME[role]) ?? "/dashboard";
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Unauthenticated → any /dashboard route bounces to /login with redirectTo.
  if (!user && isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // 2FA hard-enforce for professional roles. Gated by ENFORCE_2FA=1 so
  // we can roll it out progressively — flipping it on immediately would
  // lock out every existing DOCTOR/COACH/ADMIN that hasn't enrolled yet.
  //
  // Policy when enabled:
  //   - current aal === "aal2" → pass (fully authenticated)
  //   - nextLevel === "aal2" && current === "aal1" → user HAS a verified
  //     factor but hasn't challenged yet. The login form handles the
  //     step-up; we don't block dashboard access just for this.
  //   - else (no enrolled factor) → redirect to settings/security with a
  //     banner flag so the user is forced to complete enrollment.
  const enforce2fa = process.env.ENFORCE_2FA === "1";
  if (
    enforce2fa &&
    user &&
    isDashboard &&
    !devBypassEnabled &&
    !MFA_ESCAPE_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    const role =
      (user.app_metadata?.role as string | undefined) ??
      (user.user_metadata?.role as string | undefined);
    if (role && ROLES_REQUIRING_2FA.has(role)) {
      const currentLevel = aal?.currentLevel ?? null;
      const nextLevel = aal?.nextLevel ?? null;
      const hasEnrolled = nextLevel === "aal2";
      if (currentLevel !== "aal2" && !hasEnrolled) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/settings/security";
        url.search = "";
        url.searchParams.set("reason", "2fa-required");
        return NextResponse.redirect(url);
      }
    }
  }

  // Role-based routing inside /dashboard.
  if (user && isDashboard) {
    const role =
      (user.app_metadata?.role as string | undefined) ??
      (user.user_metadata?.role as string | undefined);

    // /dashboard itself is a router — send each role to its home.
    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      const home = (role && ROLE_HOME[role]) ?? "/login";
      const url = request.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }

    const rule = ROLE_RULES.find((r) => pathname.startsWith(r.prefix));
    if (rule && (!role || !rule.roles.includes(role))) {
      const home = (role && ROLE_HOME[role]) ?? "/login";
      const url = request.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
