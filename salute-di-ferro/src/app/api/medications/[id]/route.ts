import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { updateMedicationSchema } from "@/lib/validators/medication";

type Ctx = { params: Promise<{ id: string }> };

async function getOwnedSelfItem(userId: string, id: string) {
  const row = await prisma.therapyItem.findUnique({
    where: { id },
    select: { id: true, patientId: true, kind: true },
  });
  if (!row) return null;
  // Legacy endpoint — only patient-owned SELF items are editable here.
  // PRESCRIBED items will be routed through /api/therapy once the service
  // layer lands in the next commit.
  if (row.patientId !== userId) return null;
  if (row.kind !== "SELF") return null;
  return row;
}

export async function PATCH(req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const owned = await getOwnedSelfItem(user.id, id);
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

  const updated = await prisma.therapyItem.update({
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
  const owned = await getOwnedSelfItem(user.id, id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.therapyItem.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
