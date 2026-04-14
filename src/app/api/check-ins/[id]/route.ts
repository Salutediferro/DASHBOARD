import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getCheckIn,
  getClientCheckInHistory,
  getPreviousCheckIn,
  updateCheckIn,
} from "@/lib/mock-checkins";
import { updateCheckInSchema } from "@/lib/validators/checkin";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const current = getCheckIn(id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const previous = getPreviousCheckIn(id);
  const history = getClientCheckInHistory(current.clientId);
  return NextResponse.json({ current, previous, history });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateCheckInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const updated = updateCheckIn(id, parsed.data);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
