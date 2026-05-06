import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getActivePlanForPatient } from "@/lib/queries/nutrition";

// Returns the caller's currently active nutrition plan. Patients call
// this for their own plan; professionals can pass `?patientId=` to read
// a specific patient's plan (subject to the same care-relationship ACL
// applied to plan reads).
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const explicit = searchParams.get("patientId");
  const targetPatientId = explicit && me.role !== "PATIENT" ? explicit : me.id;

  // Block professionals from peeking at unrelated patients.
  if (me.role !== "PATIENT" && me.role !== "ADMIN" && targetPatientId !== me.id) {
    const link = await prisma.careRelationship.findFirst({
      where: {
        professionalId: me.id,
        patientId: targetPatientId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (!link) return NextResponse.json({ plan: null }, { status: 200 });
  }

  const plan = await getActivePlanForPatient(targetPatientId);
  return NextResponse.json({ plan });
}
