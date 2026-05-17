import "server-only";

import { revalidateTag } from "next/cache";

import { dataSource } from "@/lib/data";
import type {
  AppointmentSummary,
  BodySystemKey,
  BodySystemStatus,
  BriefingAction,
  BriefingMission,
  BriefingSummary,
  Persona,
  SystemMarker,
  SystemTone,
  TherapyAdherenceItem,
} from "@/lib/data";

// ---------------------------------------------------------------
// Persona
// ---------------------------------------------------------------

function pickPersona(completeness: number, daysActive: number): Persona {
  if (completeness < 60) return "onboarding";
  if (daysActive < 30) return "early";
  return "mature";
}

// ---------------------------------------------------------------
// Tone aggregation
// ---------------------------------------------------------------

const TONE_ORDER: Record<SystemTone, number> = {
  silent: 0,
  informational: 1,
  attention: 2,
};

function worstTone(markers: SystemMarker[]): SystemTone {
  if (markers.length === 0) return "silent";
  return markers.reduce<SystemTone>(
    (acc, m) => (TONE_ORDER[m.tone] > TONE_ORDER[acc] ? m.tone : acc),
    "silent",
  );
}

// ---------------------------------------------------------------
// Body system mapping
// ---------------------------------------------------------------

function recoveryMarkers(
  sleepHours: number | null,
  energy: number | null,
): SystemMarker[] {
  const out: SystemMarker[] = [];
  if (sleepHours != null) {
    let tone: SystemTone = "silent";
    let value = "in range";
    if (sleepHours < 6.5) {
      tone = "attention";
      value = "sotto il tuo obiettivo";
    } else if (sleepHours < 7) {
      tone = "informational";
      value = "leggermente sotto";
    }
    out.push({ name: "Sonno", value, range: "7-8h", tone });
  }
  if (energy != null) {
    let tone: SystemTone = "silent";
    let value = "in range";
    if (energy < 3) {
      tone = "attention";
      value = "bassa";
    } else if (energy < 3.6) {
      tone = "informational";
      value = "altalenante";
    }
    out.push({ name: "Energia", value, range: "≥ 3.5/5", tone });
  }
  return out;
}

function cardioMarkers(
  sys: number | null,
  dia: number | null,
): SystemMarker[] {
  if (sys == null || dia == null) return [];
  let tone: SystemTone = "silent";
  let value = "in range";
  if (sys >= 140 || dia >= 90) {
    tone = "attention";
    value = "elevata";
  } else if (sys >= 130 || dia >= 85) {
    tone = "informational";
    value = "leggermente sopra";
  }
  return [{ name: "Pressione", value, range: "< 130/85", tone }];
}

function metabolicMarkers(
  weightDelta: number,
  hasTarget: boolean,
): SystemMarker[] {
  if (!hasTarget) return [];
  let tone: SystemTone = "silent";
  let value = "stabile";
  if (Math.abs(weightDelta) >= 2) {
    tone = "informational";
    value = weightDelta > 0 ? "in aumento" : "in calo";
  }
  return [{ name: "Peso", value, range: "verso obiettivo", tone }];
}

function energyLabMarkers(
  reports: { category: string; summary?: string }[],
): SystemMarker[] {
  // LLM-safe: never expose raw lab numbers. Use report `summary` cues
  // planted by the mock / authored by professionals on real reports.
  for (const r of reports.slice(0, 5)) {
    const s = r.summary?.toLowerCase() ?? "";
    if (
      s.includes("sotto range") ||
      s.includes("rivedere") ||
      s.includes("fuori")
    ) {
      return [
        {
          name: "Marker laboratorio",
          value: "1 marker da rivedere",
          range: "intervallo personale",
          tone: "attention",
        },
      ];
    }
  }
  return [];
}

function hormonesMarkers(
  reports: { category: string; summary?: string }[],
): SystemMarker[] {
  const endo = reports.find((r) => r.category === "ENDOCRINOLOGY");
  if (!endo) return [];
  const s = endo.summary?.toLowerCase() ?? "";
  if (s.includes("fuori") || s.includes("alterato")) {
    return [
      {
        name: "Profilo ormonale",
        value: "da rivedere",
        range: "intervallo personale",
        tone: "attention",
      },
    ];
  }
  return [
    {
      name: "Profilo ormonale",
      value: "monitorato",
      range: "intervallo personale",
      tone: "informational",
    },
  ];
}

function summarizeSystem(
  system: BodySystemKey,
  tone: SystemTone,
  markers: SystemMarker[],
): string {
  if (markers.length === 0) {
    return "Nessun dato recente — aggiorna le tue misurazioni quando puoi.";
  }
  switch (system) {
    case "recovery":
      return tone === "attention"
        ? "Recupero da rinforzare. Ottimizza sonno e gestione carico."
        : tone === "informational"
          ? "Recupero discreto. Piccoli aggiustamenti su sonno e ritmo."
          : "Recupero in ordine. Continua così.";
    case "cardio":
      return tone === "attention"
        ? "Pressione da osservare. Ne parli col Medico al prossimo incontro."
        : "Cardio nella norma.";
    case "metabolic":
      return tone === "informational"
        ? "Peso in movimento. Tieni costante l'allenamento."
        : "Peso allineato all'obiettivo.";
    case "energy":
      return tone === "attention"
        ? "Un marker fuori intervallo. Sono due minuti col Coach."
        : "Energia di laboratorio nei limiti attesi.";
    case "hormones":
      return tone === "attention"
        ? "Pannello ormonale da rivedere col Medico."
        : "Ormonale monitorato — nulla di urgente.";
  }
}

// ---------------------------------------------------------------
// Top-action ranker
// ---------------------------------------------------------------

function buildTopActions(input: {
  persona: Persona;
  therapy: TherapyAdherenceItem[];
  checkInOverdueDays: number;
  attentionMarkers: number;
  nextAppointment: AppointmentSummary | null;
  hasTeamCoach: boolean;
}): BriefingAction[] {
  const out: BriefingAction[] = [];

  if (input.persona === "onboarding") {
    out.push({ label: "Completa il profilo", urgency: 100, kind: "profile" });
  }

  for (const t of input.therapy) {
    if (t.pctAdherence < 70) {
      out.push({
        label: `Ripristina la routine: ${t.name}`,
        urgency: 70 + (100 - t.pctAdherence) / 2,
        kind: "therapy",
        itemId: t.id,
      });
    }
  }

  if (input.checkInOverdueDays > 0) {
    out.push({
      label: `Check-in in ritardo di ${input.checkInOverdueDays}gg`,
      urgency: 80 + Math.min(20, input.checkInOverdueDays * 5),
      kind: "checkin",
    });
  }

  if (input.attentionMarkers > 0) {
    out.push({
      label: "Rivedi i marker fuori range",
      urgency: 75,
      kind: "marker",
    });
  }

  if (input.nextAppointment) {
    const daysUntil = Math.max(
      0,
      Math.floor(
        (input.nextAppointment.startTime.getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      ),
    );
    if (daysUntil <= 7) {
      out.push({
        label: `Prepara la call con ${input.nextAppointment.professional.name}`,
        urgency: 60 + (7 - daysUntil) * 3,
        kind: "appointment",
        itemId: input.nextAppointment.id,
      });
    }
  }

  if (input.persona === "mature" && out.length < 3) {
    out.push({
      label: "Pianifica il prossimo pannello",
      urgency: 30,
      kind: "panel",
    });
  }

  if (out.length === 0) {
    out.push({
      label: "Mantieni la routine — stai facendo bene",
      urgency: 10,
      kind: "routine",
    });
  }

  return out.sort((a, b) => b.urgency - a.urgency).slice(0, 5);
}

// ---------------------------------------------------------------
// Mission
// ---------------------------------------------------------------

function buildMission(input: {
  persona: Persona;
  attentionMarkers: number;
  checkInOverdueDays: number;
  nextAppointment: AppointmentSummary | null;
}): BriefingMission {
  if (input.persona === "onboarding") {
    return {
      text: "Iniziamo dal profilo — bastano cinque minuti.",
      ctaLabel: "Completa il profilo",
      ctaHref: "/dashboard/patient/profile",
    };
  }
  if (input.attentionMarkers > 0) {
    return {
      text: "Un marker da rivedere col tuo Team.",
      ctaLabel: "Apri i referti",
      ctaHref: "/dashboard/patient/records",
    };
  }
  if (input.checkInOverdueDays > 0) {
    return {
      text: "Il check-in ti aspetta. Sono due minuti.",
      ctaLabel: "Vai al check-in",
      ctaHref: "/dashboard/patient/check-in",
    };
  }
  if (input.nextAppointment) {
    const daysUntil = Math.floor(
      (input.nextAppointment.startTime.getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );
    if (daysUntil <= 7) {
      return {
        text: `Preparati alla call con ${input.nextAppointment.professional.name}.`,
        ctaLabel: "Apri agenda",
        ctaHref: "/dashboard/patient/appointments",
      };
    }
  }
  return {
    text: "Continua così. Ogni mattina, gli stessi gesti.",
    ctaLabel: "Apri il quaderno",
    ctaHref: "/dashboard/patient",
  };
}

// ---------------------------------------------------------------
// Main entry — cached, deterministic, LLM-safe
// ---------------------------------------------------------------

export async function buildBriefing(userId: string): Promise<BriefingSummary> {

  const [
    profile,
    appointments,
    biometrics,
    therapy,
    notifications,
    team,
    reports,
    checkIns,
    subscription,
  ] = await Promise.all([
    dataSource.getUserProfile(userId),
    dataSource.getAppointments(userId),
    dataSource.getBiometricsSummary(userId),
    dataSource.getTherapyAdherence(userId),
    dataSource.getNotifications(userId),
    dataSource.getMyTeam(userId),
    dataSource.getReports(userId),
    dataSource.getCheckIns(userId),
    dataSource.getActiveSubscription(userId),
  ]);

  const completeness = profile?.completeness ?? 0;
  const daysActive = profile?.daysActive ?? 0;
  const firstName = profile?.firstName ?? "";
  const persona = pickPersona(completeness, daysActive);

  // Overdue check-in
  const now = Date.now();
  const overdue = checkIns.find(
    (c) => c.completedAt == null && c.dueDate.getTime() < now,
  );
  const checkInOverdueDays = overdue
    ? Math.floor((now - overdue.dueDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Body system mapping
  const recovery = recoveryMarkers(
    biometrics.sleepHours.value,
    biometrics.energyLevel.value,
  );
  const cardio = cardioMarkers(
    biometrics.bloodPressure.sys,
    biometrics.bloodPressure.dia,
  );
  const metabolic = metabolicMarkers(
    biometrics.weight.delta,
    profile?.targetWeightKg != null,
  );
  const energyLab = energyLabMarkers(reports);
  const hormones = hormonesMarkers(reports);

  const seeds: BodySystemStatus[] = [
    {
      system: "recovery",
      markers: recovery,
      tone: worstTone(recovery),
      summary: "",
    },
    {
      system: "cardio",
      markers: cardio,
      tone: worstTone(cardio),
      summary: "",
    },
    {
      system: "metabolic",
      markers: metabolic,
      tone: worstTone(metabolic),
      summary: "",
    },
    {
      system: "energy",
      markers: energyLab,
      tone: worstTone(energyLab),
      summary: "",
    },
    {
      system: "hormones",
      markers: hormones,
      tone: worstTone(hormones),
      summary: "",
    },
  ];

  const bodySystems: BodySystemStatus[] = seeds.map((s) => ({
    ...s,
    summary: summarizeSystem(s.system, s.tone, s.markers),
  }));

  const attentionMarkers = bodySystems.reduce(
    (acc, s) => acc + (s.tone === "attention" ? s.markers.length : 0),
    0,
  );

  const nextAppointment = appointments[0] ?? null;

  const topActions = buildTopActions({
    persona,
    therapy,
    checkInOverdueDays,
    attentionMarkers,
    nextAppointment,
    hasTeamCoach: team.coach != null,
  });

  const mission = buildMission({
    persona,
    attentionMarkers,
    checkInOverdueDays,
    nextAppointment,
  });

  // Reserved for future briefing inputs; reading them here keeps the
  // Promise.all fan-out warm for cache hits when we wire them in.
  void notifications;
  void subscription;

  return {
    persona,
    mission,
    stats: biometrics,
    topActions,
    bodySystems,
    firstName,
    completeness,
    attentionCount: attentionMarkers,
    nextAppointment,
  };
}

// Client-safe helpers live in `./urgency.ts`. Importers must reach for that
// file directly — never re-export here, otherwise Turbopack drags this
// server-only module into client bundles via the reverse export edge.
