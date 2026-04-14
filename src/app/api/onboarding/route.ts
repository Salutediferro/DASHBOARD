import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Persist onboarding flag (best-effort; falls through if the DB user row
  // is not yet linked).
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { onboardingCompleted: true },
    });
  } catch {
    // ignore — row may not exist yet in mock/unlinked accounts
  }

  // Keep the full onboarding payload for logging; real persistence TODO.
  const _body = await req.json().catch(() => ({}));

  return NextResponse.json({ ok: true });
}
