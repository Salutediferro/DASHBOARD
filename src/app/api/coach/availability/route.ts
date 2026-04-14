import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  getAvailability,
  getAvailableSlots,
  setAvailability,
  resolveProfessionalForPatient,
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
    // Professionals see their own slots. Patients see the slots of their
    // assigned coach by default (role can be overridden via ?role=DOCTOR).
    const roleParam = searchParams.get("role");
    const preferredRole: "DOCTOR" | "COACH" =
      roleParam === "DOCTOR" ? "DOCTOR" : "COACH";
    const professionalId =
      me?.role === "DOCTOR" || me?.role === "COACH"
        ? user.id
        : await resolveProfessionalForPatient(user.id, preferredRole);
    return NextResponse.json({
      slots: await getAvailableSlots(date, professionalId ?? undefined),
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
