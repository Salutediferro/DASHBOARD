import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { resolveCaller } from "@/lib/appointments/access";
import { googleOAuthConfigured } from "@/lib/google/oauth";

/**
 * GET /api/google/status
 *
 * Tells the GoogleCalendarCard whether the calling pro has a linked
 * Google account, and if so which email it's tied to. Also exposes
 * `configured: false` so the dev UI can hide the Connetti button when
 * the operator hasn't filled in GOOGLE_CLIENT_* yet.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const me = await resolveCaller(user.id);
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.googleAccount.findUnique({
    where: { userId: me.id },
    select: { email: true, createdAt: true },
  });

  return NextResponse.json({
    configured: googleOAuthConfigured(),
    connected: Boolean(row),
    email: row?.email ?? null,
    connectedAt: row?.createdAt.toISOString() ?? null,
  });
}
