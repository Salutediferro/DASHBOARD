import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  deleteAppointment,
  getAppointment,
  updateAppointment,
} from "@/lib/appointments";
import { updateAppointmentSchema } from "@/lib/validators/appointment";

type Ctx = { params: Promise<{ id: string }> };

async function canAccess(
  userId: string,
  appointmentId: string,
): Promise<boolean> {
  const a = await getAppointment(appointmentId);
  if (!a) return false;
  return a.clientId === userId || a.coachId === userId;
}

export async function GET(_req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const a = await getAppointment(id);
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (a.clientId !== user.id && a.coachId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(a);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canAccess(user.id, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const updated = await updateAppointment(id, parsed.data);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await canAccess(user.id, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const ok = await deleteAppointment(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
