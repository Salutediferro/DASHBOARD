import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export class UnauthorizedError extends Error {
  status = 401 as const;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403 as const;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
};

/**
 * Resolve the current Supabase session to a Prisma User row and check its
 * role against the `allowed` list. The DB role is the source of truth
 * (app_metadata is a hint, not authoritative).
 *
 * Throws `UnauthorizedError` if there is no session or no matching Prisma
 * User row; throws `ForbiddenError` if the role is not allowed.
 *
 * Usage in a route handler:
 *
 * ```ts
 * export async function GET() {
 *   try {
 *     const me = await requireRole(["DOCTOR", "COACH"]);
 *     // ...
 *   } catch (e) {
 *     return errorResponse(e);
 *   }
 * }
 * ```
 *
 * Or with the `withRole` helper below to avoid the try/catch boilerplate.
 */
export async function requireRole(
  allowed: UserRole[],
): Promise<AuthenticatedUser> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) throw new UnauthorizedError();

  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, email: true, role: true, deletedAt: true },
  });
  if (!dbUser) throw new UnauthorizedError("Profile not provisioned");
  // Soft-deleted accounts count as unauthenticated — an admin who disables
  // a user must kick them out immediately, even if their access token is
  // still technically valid at the Supabase layer.
  if (dbUser.deletedAt) throw new UnauthorizedError("Account disabled");
  if (!allowed.includes(dbUser.role)) throw new ForbiddenError();

  return { id: dbUser.id, email: dbUser.email, role: dbUser.role };
}

/**
 * Convert an Unauthorized/Forbidden error into a JSON `NextResponse`.
 * Other errors are re-thrown so they hit the normal error pipeline.
 */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  throw err;
}

/**
 * Wraps a handler with requireRole. Returns either the handler's response or
 * a 401/403 JSON response. Usage:
 *
 * ```ts
 * export const GET = () =>
 *   withRole(["ADMIN"], async (me) => NextResponse.json({ ok: true, me }));
 * ```
 */
export async function withRole(
  allowed: UserRole[],
  handler: (user: AuthenticatedUser) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const user = await requireRole(allowed);
    return await handler(user);
  } catch (e) {
    return errorResponse(e);
  }
}
