import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, MEDICAL_REPORTS_BUCKET } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { updateMedicalReportSchema } from "@/lib/validators/medical-report";

type Ctx = { params: Promise<{ id: string }> };

async function loadOwned(id: string, userId: string) {
  const row = await prisma.medicalReport.findUnique({ where: { id } });
  if (!row || row.patientId !== userId) return null;
  return row;
}

export async function PATCH(req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await loadOwned(id, user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateMedicalReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.category !== undefined) data.category = parsed.data.category;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  if (parsed.data.issuedAt !== undefined)
    data.issuedAt = parsed.data.issuedAt ? new Date(parsed.data.issuedAt) : null;

  const updated = await prisma.medicalReport.update({ where: { id }, data });
  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    category: updated.category,
    notes: updated.notes,
    issuedAt: updated.issuedAt ? updated.issuedAt.toISOString().slice(0, 10) : null,
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await loadOwned(id, user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  await admin.storage.from(MEDICAL_REPORTS_BUCKET).remove([existing.fileUrl]);
  await prisma.medicalReport.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
