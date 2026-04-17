import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { updateCheckInSchema } from "@/lib/validators/checkin";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Authorize caller for a specific check-in:
 *   - PATIENT must own it
 *   - DOCTOR / COACH must be the assigned professional
 *   - ADMIN unconditionally allowed
 */
async function authorizeForCheckIn(authUserId: string, checkInId: string) {
  const me = await prisma.user.findUnique({
    where: { id: authUserId },
    select: { id: true, role: true },
  });
  if (!me) return { error: "Unauthorized" as const, status: 401 as const };

  const checkIn = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    select: {
      id: true,
      patientId: true,
      professionalId: true,
      professionalRole: true,
    },
  });
  if (!checkIn) return { error: "Not found" as const, status: 404 as const };

  const authorized =
    me.role === "ADMIN" ||
    (me.role === "PATIENT" && checkIn.patientId === me.id) ||
    ((me.role === "COACH" || me.role === "DOCTOR") &&
      checkIn.professionalId === me.id);

  if (!authorized) return { error: "Forbidden" as const, status: 403 as const };
  return { me, checkIn };
}

/**
 * GET /api/check-ins/[id]
 * Returns the current check-in + previous check-in by the same patient (for
 * before/after comparison) + the full history for that patient. All three
 * are scoped by the same access rule as the current one.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const authz = await authorizeForCheckIn(authUser.id, id);
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const baseSelect = {
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
    aiAnalysis: true,
    status: true,
    patientId: true,
    professionalId: true,
    professionalRole: true,
    patient: { select: { id: true, fullName: true, email: true } },
  } as const;

  const current = await prisma.checkIn.findUnique({
    where: { id },
    select: baseSelect,
  });
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const previous = await prisma.checkIn.findFirst({
    where: {
      patientId: current.patientId,
      date: { lt: current.date },
    },
    orderBy: { date: "desc" },
    select: baseSelect,
  });

  const history = await prisma.checkIn.findMany({
    where: { patientId: current.patientId },
    orderBy: { date: "asc" },
    select: baseSelect,
  });

  return NextResponse.json({ current, previous, history });
}

/**
 * PATCH /api/check-ins/[id]
 * Professional marks a check-in as REVIEWED and/or writes feedback.
 * Patients cannot edit check-ins after submit (they should create a new
 * one if they need to correct — preserves the timeline).
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const authz = await authorizeForCheckIn(authUser.id, id);
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  if (authz.me.role === "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateCheckInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const updated = await prisma.checkIn.update({
    where: { id },
    data: {
      professionalFeedback: parsed.data.professionalFeedback ?? undefined,
      aiAnalysis: parsed.data.aiAnalysis ?? undefined,
      status: parsed.data.status ?? undefined,
    },
    select: {
      id: true,
      professionalFeedback: true,
      aiAnalysis: true,
      status: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(updated);
}
