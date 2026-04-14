import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  getAvailability,
  getAvailableSlots,
  setAvailability,
  resolveCoachForClient,
} from "@/lib/appointments";
import { availabilitySchema } from "@/lib/validators/appointment";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (date) {
    const coachId =
      me?.role === "COACH" ? user.id : await resolveCoachForClient(user.id);
    return NextResponse.json({
      slots: await getAvailableSlots(date, coachId ?? undefined),
    });
  }
  return NextResponse.json(getAvailability());
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = availabilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const next: Record<number, (typeof parsed.data)[string]> = {};
  for (const [k, v] of Object.entries(parsed.data)) next[Number(k)] = v;
  return NextResponse.json(setAvailability(next));
}
