import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { updateMedicationSchema } from "@/lib/validators/medication";

type Ctx = { params: Promise<{ id: string }> };

async function getOwnedMedication(userId: string, id: string) {
  const row = await prisma.medication.findUnique({
    where: { id },
    select: { id: true, patientId: true },
  });
  if (!row) return null;
  if (row.patientId !== userId) return null;
  return row;
}

export async function PATCH(req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const owned = await getOwnedMedication(user.id, id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateMedicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.dose !== undefined) updates.dose = data.dose;
  if (data.frequency !== undefined) updates.frequency = data.frequency;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.startDate !== undefined) {
    updates.startDate = data.startDate ? new Date(data.startDate) : null;
  }
  if (data.endDate !== undefined) {
    updates.endDate = data.endDate ? new Date(data.endDate) : null;
  }
  if (data.active !== undefined) updates.active = data.active;

  const updated = await prisma.medication.update({
    where: { id },
    data: updates,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const owned = await getOwnedMedication(user.id, id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.medication.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
