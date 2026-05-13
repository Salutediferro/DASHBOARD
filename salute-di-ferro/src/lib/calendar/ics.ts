import { APPOINTMENT_TYPE_LABELS } from "@/lib/validators/appointment";

export function toICSDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export function escapeICSText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** RFC 5545 §3.1 — lines must not exceed 75 octets, fold the rest. */
export function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    const chunk = line.slice(i, i === 0 ? 75 : i + 74);
    out.push(i === 0 ? chunk : ` ${chunk}`);
    i += i === 0 ? 75 : 74;
  }
  return out.join("\r\n");
}

export function serializeICS(lines: string[]): string {
  return lines.map(foldLine).join("\r\n");
}

type AppointmentLike = {
  id: string;
  startTime: Date;
  endTime: Date;
  type: keyof typeof APPOINTMENT_TYPE_LABELS | string;
  status: string;
  notes: string | null;
  meetingUrl: string | null;
  updatedAt: Date;
  patient: { fullName: string } | null;
  professional: { fullName: string } | null;
};

/**
 * Build a single VEVENT block for an appointment. Caller wraps it
 * in VCALENDAR (single .ics download vs. multi-event feed).
 */
export function appointmentVEvent(a: AppointmentLike): string[] {
  const typeLabel =
    APPOINTMENT_TYPE_LABELS[a.type as keyof typeof APPOINTMENT_TYPE_LABELS] ??
    a.type;
  const summary = `Salute di Ferro · ${typeLabel}`;
  const descLines = [
    `Cliente: ${a.patient?.fullName ?? "—"}`,
    `Professionista: ${a.professional?.fullName ?? "—"}`,
    `Tipo: ${typeLabel}`,
    `Stato: ${a.status}`,
  ];
  if (a.notes) descLines.push(`Note: ${a.notes}`);
  if (a.meetingUrl) descLines.push(`Link: ${a.meetingUrl}`);

  const block = [
    "BEGIN:VEVENT",
    `UID:appointment-${a.id}@salutediferro.com`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(a.startTime)}`,
    `DTEND:${toICSDate(a.endTime)}`,
    // SEQUENCE bumps whenever the row is updated so subscribers replace
    // the previous version of the event on next refresh.
    `SEQUENCE:${Math.floor(a.updatedAt.getTime() / 1000)}`,
    `SUMMARY:${escapeICSText(summary)}`,
    `DESCRIPTION:${escapeICSText(descLines.join("\n"))}`,
  ];
  if (a.meetingUrl) block.push(`URL:${escapeICSText(a.meetingUrl)}`);
  block.push(
    `STATUS:${a.status === "CANCELED" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
  );
  return block;
}
