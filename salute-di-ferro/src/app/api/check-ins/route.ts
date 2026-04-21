import { NextResponse } from "next/server";
import type { Prisma, ProfessionalRole } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createCheckInSchema } from "@/lib/validators/checkin";
import { createNotification } from "@/lib/services/notifications";

type CheckInStatusFilter = "ALL" | "PENDING" | "REVIEWED";

/**
 * GET /api/check-ins
 *
 * Role-scoped list:
 *   - PATIENT → their own check-ins only
 *   - COACH / DOCTOR → check-ins of patients they have an ACTIVE
 *     CareRelationship with (implicit via CheckIn.professionalId = self).
 *   - ADMIN → everything (for the audit console)
 *
 * Query params: status (ALL|PENDING|REVIEWED), patientId, q (name search).
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, role: true },
  });
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = (searchParams.get("status") ?? "ALL") as CheckInStatusFilter;
  const patientIdParam = searchParams.get("patientId") ?? undefined;
  const q = searchParams.get("q")?.trim() || undefined;

  const where: Prisma.CheckInWhereInput = {};

  if (statusParam === "PENDING" || statusParam === "REVIEWED") {
    where.status = statusParam;
  }

  if (me.role === "PATIENT") {
    where.patientId = me.id;
  } else if (me.role === "COACH" || me.role === "DOCTOR") {
    where.professionalId = me.id;
    if (patientIdParam) where.patientId = patientIdParam;
  } else if (me.role === "ADMIN") {
    if (patientIdParam) where.patientId = patientIdParam;
  }

  if (q) {
    where.patient = {
      fullName: { contains: q, mode: "insensitive" },
    };
  }

  const items = await prisma.checkIn.findMany({
    where,
    orderBy: { date: "desc" },
    take: 100,
    select: {
      id: true,
      date: true,
      weight: true,
      measurements: true,
      frontPhotoUrl: true,
      sidePhotoUrl: true,
      backPhotoUrl: true,
      notes: true,
      rating: true,
      professionalFeedback: true,
      status: true,
      patientId: true,
      patient: { select: { id: true, fullName: true, email: true } },
      professionalId: true,
      professionalRole: true,
    },
  });

  return NextResponse.json({ items });
}

/**
 * POST /api/check-ins
 *
 * A PATIENT submits a weekly check-in. The server auto-resolves the
 * target professional from the patient's active CareRelationships:
 *   1. Prefer an active COACH (body-progress check-ins are coach-facing).
 *   2. Otherwise fall back to an active DOCTOR.
 *   3. If neither, reject with 400 — the patient must be onboarded to
 *      at least one professional before check-ins are meaningful.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, role: true },
  });
  if (!me || me.role !== "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createCheckInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  // Resolve target professional: prefer COACH, fall back to DOCTOR.
  const relations = await prisma.careRelationship.findMany({
    where: { patientId: me.id, status: "ACTIVE" },
    select: { professionalId: true, professionalRole: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const coach = relations.find((r) => r.professionalRole === "COACH");
  const doctor = relations.find((r) => r.professionalRole === "DOCTOR");
  const target = coach ?? doctor;
  if (!target) {
    return NextResponse.json(
      {
        error:
          "Prima di inviare un check-in devi avere almeno un professionista di riferimento.",
      },
      { status: 400 },
    );
  }

  const professionalRole: ProfessionalRole = target.professionalRole;

  const created = await prisma.checkIn.create({
    data: {
      patientId: me.id,
      professionalId: target.professionalId,
      professionalRole,
      date: new Date(),
      weight: parsed.data.weightKg,
      // Prisma stores arbitrary JSON — the shape is validated by Zod.
      measurements: parsed.data.measurements as Prisma.InputJsonValue,
      frontPhotoUrl: parsed.data.frontPhotoUrl,
      sidePhotoUrl: parsed.data.sidePhotoUrl,
      backPhotoUrl: parsed.data.backPhotoUrl,
      notes: parsed.data.clientNotes,
      rating: parsed.data.rating,
    },
    select: {
      id: true,
      date: true,
      weight: true,
      status: true,
    },
  });

  // Fetch the patient's display name once so the professional's inbox
  // shows who submitted — saves a join in the notification read path.
  const patient = await prisma.user.findUnique({
    where: { id: me.id },
    select: { fullName: true },
  });

  const reviewUrl =
    professionalRole === "COACH"
      ? "/dashboard/coach/monitoring"
      : "/dashboard/doctor/patients";

  await createNotification({
    userId: target.professionalId,
    type: "CHECK_IN",
    title: "Nuovo check-in da revisionare",
    body: `${patient?.fullName ?? "Un cliente"} ha inviato il check-in settimanale${
      parsed.data.weightKg ? ` (${parsed.data.weightKg} kg)` : ""
    }.`,
    actionUrl: reviewUrl,
  }).catch(() => undefined);

  return NextResponse.json(created, { status: 201 });
}
