import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

// Canonical dashboard home per role.
// NOTE: patient pages still live under /dashboard/client for historical
// reasons; /dashboard/patient is treated as a reserved alias until the
// routes get renamed in a dedicated pass.
const ROLE_HOME: Record<string, string> = {
  ADMIN: "/dashboard/admin",
  DOCTOR: "/dashboard/doctor",
  COACH: "/dashboard/coach",
  PATIENT: "/dashboard/client",
};

// Allowed role(s) for each protected dashboard subtree, by URL prefix.
// Longer prefixes must come first so they win the match.
const ROLE_RULES: Array<{ prefix: string; roles: readonly string[] }> = [
  { prefix: "/dashboard/admin", roles: ["ADMIN"] },
  { prefix: "/dashboard/doctor", roles: ["DOCTOR", "ADMIN"] },
  { prefix: "/dashboard/coach", roles: ["COACH", "ADMIN"] },
  { prefix: "/dashboard/patient", roles: ["PATIENT", "ADMIN"] },
  // Legacy alias: patient UI still mounted here until routes are renamed.
  { prefix: "/dashboard/client", roles: ["PATIENT", "ADMIN"] },
];

type DevBypassUser = {
  app_metadata: { role: string };
  user_metadata: Record<string, unknown>;
};

export async function middleware(request: NextRequest) {
  const { user: authUser, response } = await updateSession(request);
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
