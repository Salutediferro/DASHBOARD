import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { metricTargetUpsertSchema } from "@/lib/validators/metric-target";
import { OVERVIEW_METRIC_KEYS } from "@/lib/overview-metric-keys";

/**
 * Resolve which patient's targets the caller may read or write.
 *
 *   - PATIENT: only their own (any explicit patientId must match).
 *   - DOCTOR / COACH: read targets for patients they have an ACTIVE
 *     CareRelationship with; cannot write (yet).
 *   - ADMIN: read everywhere; cannot write (audit-only role).
 */
async function authorize(
  authUserId: string,
  explicitPatientId: string | null,
): Promise<
  | { patientId: string; canWrite: boolean }
  | { error: string; status: number }
> {
  const me = await prisma.user.findUnique({
    where: { id: authUserId },
    select: { id: true, role: true },
  });
  if (!me) return { error: "Unauthorized", status: 401 };

  if (me.role === "PATIENT") {
    const targetId = explicitPatientId ?? me.id;
    if (targetId !== me.id) return { error: "Forbidden", status: 403 };
    return { patientId: me.id, canWrite: true };
  }
  if (!explicitPatientId) return { error: "patientId required", status: 400 };
  if (me.role === "ADMIN") return { patientId: explicitPatientId, canWrite: false };
  if (me.role === "DOCTOR" || me.role === "COACH") {
    const rel = await prisma.careRelationship.findFirst({
      where: {
        professionalId: me.id,
        patientId: explicitPatientId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (!rel) return { error: "Forbidden", status: 403 };
    return { patientId: explicitPatientId, canWrite: false };
  }
  return { error: "Forbidden", status: 403 };
}

/**
 * GET /api/metric-targets — list all targets for the current patient
 * (or the resolved patient, for professionals). Returns a flat array;
 * the client groups by `metricKey`.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const explicit = new URL(req.url).searchParams.get("patientId");
  const auth = await authorize(user.id, explicit);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const items = await prisma.metricTarget.findMany({
    where: { patientId: auth.patientId },
    select: { metricKey: true, value: true, secondary: true, updatedAt: true },
  });
  return NextResponse.json({ items });
}

/**
 * PUT /api/metric-targets — upsert one target. Idempotent set; the same
 * row keyed by (patient, metricKey) gets overwritten on each call.
 */
export async function PUT(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const explicit = new URL(req.url).searchParams.get("patientId");
  const auth = await authorize(user.id, explicit);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = metricTargetUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { metricKey, value, secondary } = parsed.data;
  const upserted = await prisma.metricTarget.upsert({
    where: { patientId_metricKey: { patientId: auth.patientId, metricKey } },
    create: {
      patientId: auth.patientId,
      metricKey,
      value,
      secondary: secondary ?? null,
    },
    update: {
      value,
      secondary: secondary ?? null,
    },
    select: { metricKey: true, value: true, secondary: true, updatedAt: true },
  });
  return NextResponse.json(upserted);
}

/**
 * DELETE /api/metric-targets?metricKey=... — clear one target. 404 is
 * fine here, but we collapse to 204-style success so the client UX
 * (clearing twice) doesn't show a phantom error.
 */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const explicit = url.searchParams.get("patientId");
  const metricKey = url.searchParams.get("metricKey");
  if (!metricKey || !(OVERVIEW_METRIC_KEYS as readonly string[]).includes(metricKey)) {
    return NextResponse.json({ error: "Invalid metricKey" }, { status: 400 });
  }

  const auth = await authorize(user.id, explicit);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.metricTarget.deleteMany({
    where: { patientId: auth.patientId, metricKey },
  });
  return NextResponse.json({ ok: true });
}
