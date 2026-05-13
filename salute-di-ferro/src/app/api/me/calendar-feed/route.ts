import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type FeedResponse = { url: string | null };

function feedUrl(req: Request, token: string | null): string | null {
  if (!token) return null;
  const origin = new URL(req.url).origin;
  return `${origin}/api/calendar/feed/${token}`;
}

async function getCallerOr401(): Promise<
  | { ok: true; userId: string }
  | { ok: false; res: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, userId: user.id };
}

/**
 * GET /api/me/calendar-feed
 *
 * Returns the current subscription URL (or null if the user hasn't
 * generated one yet).
 */
export async function GET(req: Request) {
  const caller = await getCallerOr401();
  if (!caller.ok) return caller.res;

  const me = await prisma.user.findUnique({
    where: { id: caller.userId },
    select: { calendarFeedToken: true },
  });
  const body: FeedResponse = { url: feedUrl(req, me?.calendarFeedToken ?? null) };
  return NextResponse.json(body);
}

/**
 * POST /api/me/calendar-feed
 *
 * Generates a new subscription token (rotating any existing one). The
 * previous URL stops working immediately — subscribers will start
 * returning 404 until the user updates their calendar subscription.
 */
export async function POST(req: Request) {
  const caller = await getCallerOr401();
  if (!caller.ok) return caller.res;

  const token = randomBytes(24).toString("base64url");
  await prisma.user.update({
    where: { id: caller.userId },
    data: { calendarFeedToken: token },
  });
  const body: FeedResponse = { url: feedUrl(req, token) };
  return NextResponse.json(body);
}

/**
 * DELETE /api/me/calendar-feed
 *
 * Revokes the subscription token. Existing subscribers will 404 on
 * their next refresh.
 */
export async function DELETE() {
  const caller = await getCallerOr401();
  if (!caller.ok) return caller.res;

  await prisma.user.update({
    where: { id: caller.userId },
    data: { calendarFeedToken: null },
  });
  const body: FeedResponse = { url: null };
  return NextResponse.json(body);
}
