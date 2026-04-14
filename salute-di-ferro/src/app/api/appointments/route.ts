import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createAppointment,
  listAppointments,
} from "@/lib/mock-appointments";
import { createAppointmentSchema } from "@/lib/validators/appointment";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start") ?? undefined;
  const end = searchParams.get("end") ?? undefined;
  const clientId = searchParams.get("clientId") ?? undefined;
  return NextResponse.json(listAppointments({ start, end, clientId }));
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  return NextResponse.json(createAppointment(parsed.data), { status: 201 });
}
