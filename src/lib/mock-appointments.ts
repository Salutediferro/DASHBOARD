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
  start: string; // "08:00"
  end: string; // "20:00"
  closed: boolean;
};

export type Availability = {
  // 0 = Domenica, 1 = Lun, ..., 6 = Sab
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

function addHours(date: Date, h: number) {
  const d = new Date(date);
  d.setHours(d.getHours() + h);
  return d;
}
function setTime(date: Date, h: number, m = 0) {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function seed(): Appointment[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mk = (
    dayOffset: number,
    hour: number,
    minute: number,
    durationMin: number,
    clientName: string,
    clientId: string,
    type: AppointmentType,
    notes: string | null = null,
  ): Appointment => {
    const start = setTime(new Date(today.getTime() + dayOffset * 86400000), hour, minute);
    const end = new Date(start.getTime() + durationMin * 60000);
    return {
      id: `apt-${dayOffset}-${hour}-${minute}`,
      coachId: "coach-1",
      clientId,
      clientName,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      type,
      status: "SCHEDULED",
      notes,
      meetingUrl: type === "VIDEO_CALL" ? "https://meet.example.com/demo" : null,
    };
  };

  return [
    mk(0, 9, 30, 60, "Luca Bianchi", "c1", "IN_PERSON"),
    mk(0, 11, 0, 45, "Sara Rossi", "c2", "VIDEO_CALL"),
    mk(0, 15, 30, 30, "Marco Conti", "c3", "CHECK_IN"),
    mk(1, 10, 0, 60, "Giulia Neri", "c4", "IN_PERSON"),
    mk(1, 16, 0, 45, "Paolo Gatti", "c5", "VIDEO_CALL"),
    mk(2, 9, 0, 60, "Luca Bianchi", "c1", "IN_PERSON"),
    mk(3, 14, 0, 30, "Sara Rossi", "c2", "CHECK_IN"),
    mk(5, 10, 30, 60, "Elisa Moretti", "c6", "IN_PERSON"),
    mk(7, 11, 0, 45, "Davide Russo", "c7", "VIDEO_CALL"),
    mk(-2, 18, 0, 60, "Luca Bianchi", "c1", "IN_PERSON"),
  ];
}

let APPOINTMENTS: Appointment[] = seed();

export function listAppointments(filters?: {
  start?: string;
  end?: string;
  clientId?: string;
}): Appointment[] {
  const { start, end, clientId } = filters ?? {};
  return APPOINTMENTS.filter((a) => {
    if (clientId && a.clientId !== clientId) return false;
    if (start && a.startTime < start) return false;
    if (end && a.startTime > end) return false;
    return true;
  }).sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
}

export function getAppointment(id: string): Appointment | null {
  return APPOINTMENTS.find((a) => a.id === id) ?? null;
}

export function createAppointment(
  input: Omit<Appointment, "id" | "coachId" | "status"> & {
    coachId?: string;
    status?: AppointmentStatus;
  },
): Appointment {
  const apt: Appointment = {
    id: `apt-${Date.now()}`,
    coachId: input.coachId ?? "coach-1",
    status: input.status ?? "SCHEDULED",
    ...input,
  };
  APPOINTMENTS = [...APPOINTMENTS, apt];
  return apt;
}

export function updateAppointment(
  id: string,
  patch: Partial<Appointment>,
): Appointment | null {
  const idx = APPOINTMENTS.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  APPOINTMENTS[idx] = { ...APPOINTMENTS[idx]!, ...patch };
  return APPOINTMENTS[idx]!;
}

export function deleteAppointment(id: string): boolean {
  const len = APPOINTMENTS.length;
  APPOINTMENTS = APPOINTMENTS.filter((a) => a.id !== id);
  return APPOINTMENTS.length < len;
}

export function getAvailability(): Availability {
  return AVAILABILITY;
}

export function setAvailability(next: Availability): Availability {
  AVAILABILITY = next;
  return AVAILABILITY;
}

export function getAvailableSlots(dateStr: string): string[] {
  const date = new Date(dateStr);
  const dow = date.getDay();
  const day = AVAILABILITY[dow];
  if (!day || day.closed) return [];

  const [startH, startM] = day.start.split(":").map(Number) as [number, number];
  const [endH] = day.end.split(":").map(Number) as [number, number];

  const slots: string[] = [];
  const cursor = setTime(new Date(date), startH, startM);
  const endTime = setTime(new Date(date), endH);

  while (cursor < endTime) {
    const slotStart = new Date(cursor);
    const slotEnd = addHours(slotStart, 1);
    const conflict = APPOINTMENTS.some((a) => {
      const as = new Date(a.startTime).getTime();
      const ae = new Date(a.endTime).getTime();
      return (
        as < slotEnd.getTime() && ae > slotStart.getTime()
      );
    });
    if (!conflict) slots.push(slotStart.toISOString());
    cursor.setMinutes(cursor.getMinutes() + 30);
  }
  return slots;
}
