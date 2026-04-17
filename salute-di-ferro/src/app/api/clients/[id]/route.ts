import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function requireProfessional() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!me) return null;
  if (me.role !== "DOCTOR" && me.role !== "COACH" && me.role !== "ADMIN") {
    return null;
  }
  return me;
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const me = await requireProfessional();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Admins can read any patient; doctor/coach must have an active CareRelationship.
  if (me.role !== "ADMIN") {
    const rel = await prisma.careRelationship.findFirst({
      where: { professionalId: me.id, patientId: id, status: "ACTIVE" },
      select: { id: true },
    });
    if (!rel) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const patient = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      avatarUrl: true,
      birthDate: true,
      sex: true,
    },
  });
  if (!patient || (patient as { id: string }).id !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...patient,
    birthDate: patient.birthDate
      ? patient.birthDate.toISOString().slice(0, 10)
      : null,
  });
}
