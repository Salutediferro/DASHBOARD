import { APPOINTMENT_TYPE_LABELS } from "@/lib/validators/appointment";
import type { AppointmentDTO } from "@/lib/hooks/use-appointments";

export type CalendarEvent = {
  title: string;
  startISO: string;
  endISO: string;
  description?: string;
  location?: string;
};

export function appointmentToCalendarEvent(a: AppointmentDTO): CalendarEvent {
  const typeLabel = APPOINTMENT_TYPE_LABELS[a.type] ?? a.type;
  const descLines = [
    `Cliente: ${a.patientName ?? "—"}`,
    `Professionista: ${a.professionalName ?? "—"}`,
    `Tipo: ${typeLabel}`,
  ];
  if (a.notes) descLines.push(`Note: ${a.notes}`);
  if (a.meetingUrl) descLines.push(`Link: ${a.meetingUrl}`);

  return {
    title: `Salute di Ferro · ${typeLabel}`,
    startISO: a.startTime,
    endISO: a.endTime,
    description: descLines.join("\n"),
    location: a.meetingUrl ?? undefined,
  };
}

function toGoogleDate(iso: string): string {
  // Google wants compact UTC: YYYYMMDDTHHMMSSZ
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toGoogleDate(event.startISO)}/${toGoogleDate(event.endISO)}`,
  });
  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(event: CalendarEvent): string {
  // outlook.live.com handles consumer accounts and redirects work
  // accounts to outlook.office.com after sign-in.
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.startISO,
    enddt: event.endISO,
  });
  if (event.description) params.set("body", event.description);
  if (event.location) params.set("location", event.location);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
