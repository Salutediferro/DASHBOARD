import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

type TimelineEvent = {
  id: string;
  kind:
    | "CHECK_IN"
    | "BIOMETRIC"
    | "APPOINTMENT"
    | "REPORT"
    | "FEEDBACK"
    | "MEDICATION"
    | "SYMPTOM";
  date: string;
  title: string;
  description: string | null;
  href: string | null;
  meta: Record<string, unknown> | null;
};

/**
 * GET /api/me/timeline
 *
 * Unified chronological feed of the PATIENT's health events: check-ins
 * (+ professional feedback as separate entry when present), biometric
 * logs, appointments, medical reports. Returned sorted by date desc.
 *
 * Limit kept bounded (last N items across all sources) to keep it
 * cheap — infinite scroll / pagination can be added later if needed.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!me || me.role !== "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [checkIns, biometrics, appointments, reports, medications, symptoms] =
    await Promise.all([
    prisma.checkIn.findMany({
      where: { patientId: me.id },
      orderBy: { date: "desc" },
      take: 30,
      select: {
        id: true,
        date: true,
        weight: true,
        status: true,
        rating: true,
        professionalFeedback: true,
        notes: true,
      },
    }),
    prisma.biometricLog.findMany({
      where: { patientId: me.id },
      orderBy: { date: "desc" },
      take: 30,
      select: {
        id: true,
        date: true,
        weight: true,
        systolicBP: true,
        diastolicBP: true,
      },
    }),
    prisma.appointment.findMany({
      where: { patientId: me.id },
      orderBy: { startTime: "desc" },
      take: 30,
      select: {
        id: true,
        startTime: true,
        type: true,
        status: true,
        professional: { select: { fullName: true } },
      },
    }),
    prisma.medicalReport.findMany({
      where: { patientId: me.id },
      orderBy: [{ issuedAt: "desc" }, { uploadedAt: "desc" }],
      take: 30,
      select: {
        id: true,
        title: true,
        category: true,
        issuedAt: true,
        uploadedAt: true,
      },
    }),
    prisma.therapyItem.findMany({
      where: { patientId: me.id },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      take: 20,
      select: {
        id: true,
        name: true,
        dose: true,
        frequency: true,
        startDate: true,
        endDate: true,
        active: true,
        createdAt: true,
      },
    }),
    prisma.symptomLog.findMany({
      where: { patientId: me.id },
      orderBy: { date: "desc" },
      take: 30,
      select: {
        id: true,
        date: true,
        mood: true,
        energy: true,
        sleepQuality: true,
        symptoms: true,
      },
    }),
  ]);

  const events: TimelineEvent[] = [];

  for (const c of checkIns) {
    events.push({
      id: `checkin:${c.id}`,
      kind: "CHECK_IN",
      date: c.date.toISOString(),
      title: "Check-in settimanale",
      description: [
        c.weight != null ? `${c.weight.toFixed(1)} kg` : null,
        c.rating != null ? `rating ${c.rating}/5` : null,
        c.notes ? `"${c.notes.slice(0, 80)}${c.notes.length > 80 ? "…" : ""}"` : null,
      ]
        .filter(Boolean)
        .join(" · ") || null,
      href: "/dashboard/patient",
      meta: { status: c.status },
    });
    if (c.professionalFeedback) {
      events.push({
        id: `feedback:${c.id}`,
        kind: "FEEDBACK",
        date: c.date.toISOString(),
        title: "Feedback dal tuo professionista",
        description: c.professionalFeedback.slice(0, 160),
        href: "/dashboard/patient",
        meta: null,
      });
    }
  }

  for (const b of biometrics) {
    const parts: string[] = [];
    if (b.weight != null) parts.push(`${b.weight.toFixed(1)} kg`);
    if (b.systolicBP != null && b.diastolicBP != null) {
      parts.push(`${b.systolicBP}/${b.diastolicBP} mmHg`);
    }
    events.push({
      id: `biometric:${b.id}`,
      kind: "BIOMETRIC",
      date: b.date.toISOString(),
      title: "Misurazione registrata",
      description: parts.join(" · ") || null,
      href: "/dashboard/patient/health",
      meta: null,
    });
  }

  for (const a of appointments) {
    events.push({
      id: `appt:${a.id}`,
      kind: "APPOINTMENT",
      date: a.startTime.toISOString(),
      title:
        a.status === "SCHEDULED"
          ? "Appuntamento in programma"
          : a.status === "COMPLETED"
            ? "Appuntamento svolto"
            : a.status === "CANCELED"
              ? "Appuntamento annullato"
              : "Appuntamento",
      description: `${a.type} · ${a.professional?.fullName ?? "—"}`,
      href: "/dashboard/patient/appointments",
      meta: { status: a.status },
    });
  }

  for (const r of reports) {
    events.push({
      id: `report:${r.id}`,
      kind: "REPORT",
      date: (r.issuedAt ?? r.uploadedAt).toISOString(),
      title: r.title,
      description: `Referto · ${r.category}`,
      href: "/dashboard/patient/medical-records",
      meta: null,
    });
  }

  for (const m of medications) {
    events.push({
      id: `med:${m.id}`,
      kind: "MEDICATION",
      date: (m.startDate ?? m.createdAt).toISOString(),
      title: m.active
        ? `Supplemento avviato: ${m.name}`
        : `Supplemento archiviato: ${m.name}`,
      description: [m.dose, m.frequency].filter(Boolean).join(" · ") || null,
      href: "/dashboard/patient/supplementi",
      meta: { active: m.active },
    });
  }

  for (const s of symptoms) {
    const parts: string[] = [];
    if (s.mood != null) parts.push(`umore ${s.mood}/5`);
    if (s.energy != null) parts.push(`energia ${s.energy}/5`);
    if (s.sleepQuality != null) parts.push(`sonno ${s.sleepQuality}/5`);
    if (s.symptoms.length) parts.push(s.symptoms.slice(0, 3).join(", "));
    events.push({
      id: `symptom:${s.id}`,
      kind: "SYMPTOM",
      date: s.date.toISOString(),
      title: "Diario salute",
      description: parts.join(" · ") || null,
      href: "/dashboard/patient/symptoms",
      meta: null,
    });
  }

  events.sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json({ events: events.slice(0, 80) });
}
