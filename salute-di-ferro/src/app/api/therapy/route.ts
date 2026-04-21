import { NextResponse } from "next/server";
import { TherapyKind } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createTherapySchema } from "@/lib/validators/therapy";
import {
  TherapyError,
  createTherapy,
  listTherapy,
} from "@/lib/services/therapy";

/**
 * GET /api/therapy
 *
 * List therapy items for a patient. ACL is enforced in the service
 * layer (canReadTherapy). The optional `kind` query param narrows the
 * result to one vertical — PRESCRIBED for the doctor-facing Percorso
 * view, SELF for the patient-facing Supplementi view.
 *
 * Query params:
 *   - patientId: required when the caller is not the target (doctor/coach);
 *     defaults to the caller's id for PATIENT.
 *   - kind:      optional, "PRESCRIBED" | "SELF".
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

  const url = new URL(req.url);
  const explicit = url.searchParams.get("patientId");
  const kindParam = url.searchParams.get("kind");
  const patientId = explicit && explicit !== me.id ? explicit : me.id;

  if (kindParam && kindParam !== "PRESCRIBED" && kindParam !== "SELF") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  try {
    const items = await listTherapy(me, patientId, {
      kind: kindParam ? (kindParam as TherapyKind) : undefined,
    });
    return NextResponse.json({ items });
  } catch (e) {
    return therapyErrorResponse(e);
  }
}

/**
 * POST /api/therapy
 *
 * Body must include `kind` ("PRESCRIBED" | "SELF"). PATIENT callers can
 * only create SELF items on themselves; DOCTOR callers can only create
 * PRESCRIBED items on patients they have an active CareRelationship
 * with. All validation happens in the service layer.
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
  const parsed = createTherapySchema.safeParse(body);
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
