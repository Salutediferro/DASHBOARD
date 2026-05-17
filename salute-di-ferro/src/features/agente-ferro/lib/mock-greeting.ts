/**
 * Deterministic greeting templates for the Agente di Ferro landing page.
 *
 * Used both as the "MOCK_AGENTE=true" fallback and as the safety net when
 * the live model call fails. Hand-crafted to match the brand tone:
 * calm, firm coach voice, never alarming, never diagnostic, one short
 * sentence prefixed with the user's first name.
 */

import type { BriefingSummary } from "@/lib/data";

const WEEKDAYS_IT: Record<number, string> = {
  0: "domenica",
  1: "lunedì",
  2: "martedì",
  3: "mercoledì",
  4: "giovedì",
  5: "venerdì",
  6: "sabato",
};

function isAppointmentWithinSevenDays(at: Date): boolean {
  const diffMs = at.getTime() - Date.now();
  return diffMs > 0 && diffMs <= 7 * 24 * 60 * 60 * 1000;
}

export function mockGreeting(summary: BriefingSummary): string {
  const firstName = summary.firstName?.trim() || "Atleta";
  const nActions = summary.topActions.length;
  const attentionMarker = summary.bodySystems
    .flatMap((s) => s.markers)
    .find((m) => m.tone === "attention");

  switch (summary.persona) {
    case "onboarding":
      return `${firstName}. Iniziamo dal profilo.`;
    case "early":
      return `${firstName}. Costruiamo le abitudini.`;
    case "mature":
    default: {
      if (
        summary.nextAppointment &&
        isAppointmentWithinSevenDays(summary.nextAppointment.startTime)
      ) {
        const dayName =
          WEEKDAYS_IT[summary.nextAppointment.startTime.getDay()] ?? "presto";
        const proRole =
          summary.nextAppointment.professional.role === "DOCTOR"
            ? "Medico"
            : "Coach";
        const count = nActions > 0 ? nActions : 0;
        const tail =
          count > 0
            ? `${count} ${count === 1 ? "cosa" : "cose"} nel quaderno.`
            : "Tutto pronto.";
        return `${firstName}. ${dayName.charAt(0).toUpperCase()}${dayName.slice(
          1,
        )} col ${proRole}. ${tail}`;
      }

      if (attentionMarker) {
        return `${firstName}. ${attentionMarker.name} vale due minuti col Coach.`;
      }

      if (summary.attentionCount === 0 && nActions <= 1) {
        return "Sereno, atleta. Continua così.";
      }

      return `${firstName}. ${nActions} ${
        nActions === 1 ? "cosa" : "cose"
      } nel quaderno oggi.`;
    }
  }
}
