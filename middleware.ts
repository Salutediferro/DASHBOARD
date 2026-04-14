import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

export async function middleware(request: NextRequest) {
  const { user: authUser, response } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // TODO: remove dev bypass — pretend we're logged in as CLIENT in dev
  const devBypass =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_BYPASS === "1";
  const user = devBypass
    ? ({ app_metadata: { role: "CLIENT" }, user_metadata: {} } as unknown as typeof authUser)
    : authUser;

  const isAuthRoute = PUBLIC_AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isDashboard = pathname.startsWith("/dashboard");

  // Already authenticated → keep them out of auth pages.
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Protect dashboard.
  if (!user && isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Role-based routing inside /dashboard.
  if (user && isDashboard && !devBypass) {
    const role =
      (user.app_metadata?.role as string | undefined) ??
      (user.user_metadata?.role as string | undefined);

    const wantsCoach = pathname.startsWith("/dashboard/coach");
    const wantsClient = pathname.startsWith("/dashboard/client");
    const wantsAdmin = pathname.startsWith("/dashboard/admin");

    const allowed =
      (wantsCoach && (role === "COACH" || role === "ADMIN")) ||
      (wantsClient && role === "CLIENT") ||
      (wantsAdmin && role === "ADMIN") ||
      (!wantsCoach && !wantsClient && !wantsAdmin);

    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
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
