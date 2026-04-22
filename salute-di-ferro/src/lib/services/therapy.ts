import type { TherapyItem, TherapyKind, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CreateTherapyInput,
  UpdateTherapyInput,
} from "@/lib/validators/therapy";

export type Actor = { id: string; role: UserRole };

export class TherapyError extends Error {
  constructor(
    public code:
      | "forbidden"
      | "not_found"
      | "kind_immutable"
      | "missing_patient_id",
  ) {
    super(code);
    this.name = "TherapyError";
  }
}

/**
 * Read access to a patient's therapy timeline.
 *   - PATIENT: only their own row
 *   - DOCTOR / COACH: active CareRelationship with that patient
 *   - ADMIN: always
 */
export async function canReadTherapy(
  actor: Actor,
  patientId: string,
): Promise<boolean> {
  if (actor.role === "ADMIN") return true;
  if (actor.id === patientId) return true;
  if (actor.role === "PATIENT") return false;

  const rel = await prisma.careRelationship.findFirst({
    where: {
      professionalId: actor.id,
      patientId,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  return !!rel;
}

/**
 * Write access depends on `kind`:
 *   - SELF:       only the patient themselves
 *   - PRESCRIBED: only a DOCTOR with an active CareRelationship
 *                 (professionalRole=DOCTOR) with the patient
 * ADMIN is intentionally not allowed to write on a patient's behalf —
 * corrections should go through the audit-logged admin flows.
 */
export async function canWriteTherapy(
  actor: Actor,
  patientId: string,
  kind: TherapyKind,
): Promise<boolean> {
  if (kind === "SELF") {
    return actor.role === "PATIENT" && actor.id === patientId;
  }
  if (actor.role !== "DOCTOR") return false;
  const rel = await prisma.careRelationship.findFirst({
    where: {
      professionalId: actor.id,
      patientId,
      professionalRole: "DOCTOR",
      status: "ACTIVE",
    },
    select: { id: true },
  });
  return !!rel;
}

export async function listTherapy(
  actor: Actor,
  patientId: string,
  opts: { kind?: TherapyKind } = {},
): Promise<TherapyItem[]> {
  if (!(await canReadTherapy(actor, patientId))) {
    throw new TherapyError("forbidden");
  }
  return prisma.therapyItem.findMany({
    where: {
      patientId,
      ...(opts.kind ? { kind: opts.kind } : {}),
    },
    orderBy: [
      { active: "desc" },
      { startDate: "desc" },
      { createdAt: "desc" },
    ],
    take: 100,
    include: {
      prescribedBy: {
        select: { id: true, fullName: true },
      },
    },
  });
}

export async function createTherapy(
  actor: Actor,
  input: CreateTherapyInput,
): Promise<TherapyItem> {
  // The patient is implicit for PATIENT actors writing SELF; explicit
  // for DOCTOR actors writing PRESCRIBED on behalf of a patient.
  const patientId =
    input.patientId ?? (actor.role === "PATIENT" ? actor.id : null);
  if (!patientId) {
    throw new TherapyError("missing_patient_id");
  }
  if (!(await canWriteTherapy(actor, patientId, input.kind))) {
    throw new TherapyError("forbidden");
  }

  return prisma.therapyItem.create({
    data: {
      patientId,
      kind: input.kind,
      prescribedById: input.kind === "PRESCRIBED" ? actor.id : null,
      name: input.name,
      dose: input.dose ?? null,
      frequency: input.frequency ?? null,
      notes: input.notes ?? null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      active: input.active ?? true,
      reminderTime:
        input.kind === "SELF" && input.reminderTime
          ? parseHHMM(input.reminderTime)
          : null,
      reminderEnabled:
        input.kind === "SELF" ? (input.reminderEnabled ?? false) : false,
    },
  });
}

export async function updateTherapy(
  actor: Actor,
  id: string,
  patch: UpdateTherapyInput & { kind?: TherapyKind },
): Promise<TherapyItem> {
  const existing = await prisma.therapyItem.findUnique({
    where: { id },
    select: { id: true, patientId: true, kind: true },
  });
  if (!existing) throw new TherapyError("not_found");

  // Immutability guard: if the caller tried to flip PRESCRIBED ↔ SELF,
  // reject with a 400 so the mistake surfaces in the UI instead of
  // silently re-scoping ownership.
  if (patch.kind !== undefined && patch.kind !== existing.kind) {
    throw new TherapyError("kind_immutable");
  }

  if (!(await canWriteTherapy(actor, existing.patientId, existing.kind))) {
    throw new TherapyError("forbidden");
  }

  const updates: Record<string, unknown> = {};
  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.dose !== undefined) updates.dose = patch.dose;
  if (patch.frequency !== undefined) updates.frequency = patch.frequency;
  if (patch.notes !== undefined) updates.notes = patch.notes;
  if (patch.startDate !== undefined) {
    updates.startDate = patch.startDate ? new Date(patch.startDate) : null;
  }
  if (patch.endDate !== undefined) {
    updates.endDate = patch.endDate ? new Date(patch.endDate) : null;
  }
  if (patch.active !== undefined) updates.active = patch.active;
  // Reminder fields are only honoured on SELF items; silently ignored
  // on PRESCRIBED so a stray doctor-side PATCH can't plant a reminder
  // on a row the patient doesn't own.
  if (existing.kind === "SELF") {
    if (patch.reminderTime !== undefined) {
      updates.reminderTime = patch.reminderTime
        ? parseHHMM(patch.reminderTime)
        : null;
    }
    if (patch.reminderEnabled !== undefined) {
      updates.reminderEnabled = patch.reminderEnabled;
    }
  }

  return prisma.therapyItem.update({
    where: { id },
    data: updates,
  });
}

export async function deleteTherapy(actor: Actor, id: string): Promise<void> {
  const existing = await prisma.therapyItem.findUnique({
    where: { id },
    select: { id: true, patientId: true, kind: true },
  });
  if (!existing) throw new TherapyError("not_found");
  if (!(await canWriteTherapy(actor, existing.patientId, existing.kind))) {
    throw new TherapyError("forbidden");
  }
  await prisma.therapyItem.delete({ where: { id } });
}

// Store HH:MM as a Date anchored at 1970-01-01 UTC so Postgres Time
// round-trips cleanly through Prisma (@db.Time drops the date part).
function parseHHMM(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(0);
  d.setUTCHours(h, m, 0, 0);
  return d;
}
