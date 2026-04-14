import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// TODO: remove dev bypass
export function isDevBypass(req: Request) {
  return (
    process.env.NODE_ENV === "development" &&
    req.headers.get("x-dev-bypass") === "1"
  );
}

const devCache: Record<string, string> = {};

async function resolveDevUserId(email: string): Promise<string | null> {
  if (devCache[email]) return devCache[email];
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (user) devCache[email] = user.id;
  return user?.id ?? null;
}

/**
 * Returns the DB user id for the current request.
 * In dev with x-dev-bypass, falls back to the seeded client (luca@example.com).
 */
async function resolveAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email ?? "" },
    select: { id: true },
  });
  return dbUser?.id ?? null;
}

export async function requireClientId(req: Request): Promise<string | null> {
  if (isDevBypass(req)) return resolveDevUserId("luca@example.com");
  return resolveAuthUserId();
}

export async function requireCoachId(req: Request): Promise<string | null> {
  if (isDevBypass(req)) return resolveDevUserId("coach@saluteferro.it");
  return resolveAuthUserId();
}

/** Generic: any authenticated user (client or coach). Dev bypass → luca. */
export async function requireUserId(req: Request): Promise<string | null> {
  if (isDevBypass(req)) return resolveDevUserId("luca@example.com");
  return resolveAuthUserId();
}
