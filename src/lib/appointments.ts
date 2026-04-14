import { prisma } from "@/lib/prisma";

export type AppointmentType = "IN_PERSON" | "VIDEO_CALL" | "CHECK_IN";
export type AppointmentStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELED"
  | "NO_SHOW";

export type Appointment = {
  id: string;
  coachId: string;
  clientId: string;
  clientName: string;
  startTime: string;
  endTime: string;
  type: AppointmentType;
  status: AppointmentStatus;
  notes: string | null;
  meetingUrl: string | null;
};

export type DayAvailability = {
  start: string;
  end: string;
  closed: boolean;
};

export type Availability = {
  [dayOfWeek: number]: DayAvailability;
};

const DEFAULT_AVAILABILITY: Availability = {
  0: { start: "09:00", end: "13:00", closed: true },
  1: { start: "08:00", end: "20:00", closed: false },
  2: { start: "08:00", end: "20:00", closed: false },
  3: { start: "08:00", end: "20:00", closed: false },
  4: { start: "08:00", end: "20:00", closed: false },
  5: { start: "08:00", end: "20:00", closed: false },
  6: { start: "09:00", end: "13:00", closed: false },
};

let AVAILABILITY: Availability = { ...DEFAULT_AVAILABILITY };

type DbAppointment = {
  id: string;
  coachId: string;
  clientId: string;
  startTime: Date;
  endTime: Date;
  type: AppointmentType;
  status: AppointmentStatus;
  notes: string | null;
  meetingUrl: string | null;
  client: { fullName: string } | null;
};

function serialize(a: DbAppointment): Appointment {
  return {
    id: a.id,
    coachId: a.coachId,
    clientId: a.clientId,
    clientName: a.client?.fullName ?? "Cliente",
    startTime: a.startTime.toISOString(),
    endTime: a.endTime.toISOString(),
    type: a.type,
    status: a.status,
    notes: a.notes,
    meetingUrl: a.meetingUrl,
  };
}

const APPOINTMENT_SELECT = {
  id: true,
  coachId: true,
  clientId: true,
  startTime: true,
  endTime: true,
  type: true,
  status: true,
  notes: true,
  meetingUrl: true,
  client: { select: { fullName: true } },
} as const;

export async function listAppointments(filters?: {
  start?: string;
  end?: string;
  clientId?: string;
  coachId?: string;
}): Promise<Appointment[]> {
  const { start, end, clientId, coachId } = filters ?? {};
  const where: Record<string, unknown> = {};
  if (clientId) where.clientId = clientId;
  if (coachId) where.coachId = coachId;
  if (start || end) {
    const st: Record<string, Date> = {};
    if (start) st.gte = new Date(start);
    if (end) st.lte = new Date(end);
    where.startTime = st;
  }
  const rows = (await prisma.appointment.findMany({
    where,
    select: APPOINTMENT_SELECT,
    orderBy: { startTime: "asc" },
  })) as DbAppointment[];
  return rows.map(serialize);
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  const row = (await prisma.appointment.findUnique({
    where: { id },
    select: APPOINTMENT_SELECT,
  })) as DbAppointment | null;
  return row ? serialize(row) : null;
}

export async function createAppointment(input: {
  coachId: string;
  clientId: string;
  startTime: string;
  endTime: string;
  type: AppointmentType;
  status?: AppointmentStatus;
  notes?: string | null;
  meetingUrl?: string | null;
}): Promise<Appointment> {
  const row = (await prisma.appointment.create({
    data: {
      coachId: input.coachId,
      clientId: input.clientId,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
      type: input.type,
      status: input.status ?? "SCHEDULED",
      notes: input.notes ?? null,
      meetingUrl: input.meetingUrl ?? null,
    },
    select: APPOINTMENT_SELECT,
  })) as DbAppointment;
  return serialize(row);
}

export async function updateAppointment(
  id: string,
  patch: Partial<{
    startTime: string;
    endTime: string;
    type: AppointmentType;
    status: AppointmentStatus;
    notes: string | null;
    meetingUrl: string | null;
  }>,
): Promise<Appointment | null> {
  const data: Record<string, unknown> = {};
  if (patch.startTime !== undefined) data.startTime = new Date(patch.startTime);
  if (patch.endTime !== undefined) data.endTime = new Date(patch.endTime);
  if (patch.type !== undefined) data.type = patch.type;
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.notes !== undefined) data.notes = patch.notes;
  if (patch.meetingUrl !== undefined) data.meetingUrl = patch.meetingUrl;
  try {
    const row = (await prisma.appointment.update({
      where: { id },
      data,
      select: APPOINTMENT_SELECT,
    })) as DbAppointment;
    return serialize(row);
  } catch {
    return null;
  }
}

export async function deleteAppointment(id: string): Promise<boolean> {
  try {
    await prisma.appointment.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export function getAvailability(): Availability {
  return AVAILABILITY;
}

export function setAvailability(next: Availability): Availability {
  AVAILABILITY = next;
  return AVAILABILITY;
}

export async function getAvailableSlots(
  dateStr: string,
  coachId?: string,
): Promise<string[]> {
  const date = new Date(dateStr);
  const dow = date.getDay();
  const day = AVAILABILITY[dow];
  if (!day || day.closed) return [];

  const [startH, startM] = day.start.split(":").map(Number) as [number, number];
  const [endH] = day.end.split(":").map(Number) as [number, number];

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const existing = (await prisma.appointment.findMany({
    where: {
      ...(coachId ? { coachId } : {}),
      startTime: { gte: dayStart, lt: dayEnd },
      status: { in: ["SCHEDULED", "COMPLETED"] },
    },
    select: { startTime: true, endTime: true },
  })) as { startTime: Date; endTime: Date }[];

  const slots: string[] = [];
  const cursor = new Date(date);
  cursor.setHours(startH, startM, 0, 0);
  const endTime = new Date(date);
  endTime.setHours(endH, 0, 0, 0);

  while (cursor < endTime) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
    const conflict = existing.some(
      (a) =>
        a.startTime.getTime() < slotEnd.getTime() &&
        a.endTime.getTime() > slotStart.getTime(),
    );
    if (!conflict) slots.push(slotStart.toISOString());
    cursor.setMinutes(cursor.getMinutes() + 30);
  }
  return slots;
}

export async function resolveCoachForClient(clientId: string): Promise<string | null> {
  const rel = await prisma.coachClient.findFirst({
    where: { clientId, status: "ACTIVE" },
    select: { coachId: true },
    orderBy: { startDate: "desc" },
  });
  return rel?.coachId ?? null;
}
