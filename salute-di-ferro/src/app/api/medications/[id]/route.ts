import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { updateTherapySchema } from "@/lib/validators/therapy";
import {
  TherapyError,
  deleteTherapy,
  updateTherapy,
} from "@/lib/services/therapy";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
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

  const { id } = await params;
  const body = await req.json();
  const parsed = updateTherapySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const updated = await updateTherapy(me, id, parsed.data);
    return NextResponse.json(updated);
  } catch (e) {
    return therapyErrorResponse(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
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

  const { id } = await params;
  try {
    await deleteTherapy(me, id);
    return NextResponse.json({ deleted: true });
  } catch (e) {
    return therapyErrorResponse(e);
  }
}

function therapyErrorResponse(e: unknown) {
  if (e instanceof TherapyError) {
    if (e.code === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (e.code === "not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (e.code === "kind_immutable") {
      return NextResponse.json(
        { error: "Il tipo di una terapia non può essere modificato" },
        { status: 400 },
      );
    }
    if (e.code === "missing_patient_id") {
      return NextResponse.json({ error: "patientId richiesto" }, { status: 400 });
    }
  }
  throw e;
}
