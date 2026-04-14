import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAvailability,
  getAvailableSlots,
  setAvailability,
} from "@/lib/mock-appointments";
import { availabilitySchema } from "@/lib/validators/appointment";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (date) {
    return NextResponse.json({ slots: getAvailableSlots(date) });
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
  // Convert string keys to numbers
  const next: Record<number, (typeof parsed.data)[string]> = {};
  for (const [k, v] of Object.entries(parsed.data)) next[Number(k)] = v;
  return NextResponse.json(setAvailability(next));
}
