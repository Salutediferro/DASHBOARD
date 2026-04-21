import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createTherapySchema } from "@/lib/validators/therapy";
import {
  TherapyError,
  createTherapy,
  listTherapy,
} from "@/lib/services/therapy";

/**
 * GET /api/medications
 *
 * Legacy surface — returns the caller's SELF therapy items (supplements).
 * The new surface at /api/therapy supports kind filtering and write by
 * doctors; this route is kept until the UI has been migrated in a
 * follow-up commit.
 */
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

  const explicit = new URL(req.url).searchParams.get("patientId");
  const patientId = explicit && explicit !== me.id ? explicit : me.id;

  try {
    const items = await listTherapy(me, patientId, { kind: "SELF" });
    return NextResponse.json({ items });
  } catch (e) {
    return therapyErrorResponse(e);
  }
}

/**
 * POST /api/medications — PATIENT only; creates a SELF supplement.
 * Doctor-prescribed therapy uses /api/therapy (next commit).
 */
export async function POST(req: Request) {
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

  const body = await req.json();
  const parsed = createTherapySchema.safeParse({ ...body, kind: "SELF" });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const created = await createTherapy(me, parsed.data);
    return NextResponse.json(created, { status: 201 });
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
