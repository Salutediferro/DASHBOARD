/**
 * ProactiveHighlights · Fase 1 arricchimento dashboard Agente di Ferro.
 *
 * Surface dati che `briefing.ts` aggrega ma non mostrava prima:
 *   - Prossimo appuntamento (countdown + professionista)
 *   - Ultimo referto (BLOOD_TEST <= 60gg, snippet 1 frase)
 *   - Aderenza terapie (% ultima settimana per ogni terapia attiva)
 *   - Check-in in ritardo (ambra "attention", mai rosso destructive)
 *   - Profilo clinico dichiarato (badge condizioni / allergie / terapie)
 *
 * Server Component (no client state). Ogni sub-card si auto-nasconde se
 * il dato corrispondente è null/vuoto. Layout: grid 1-col mobile,
 * 2-col >= md.
 *
 * A11y (allineato pattern di sezione esistenti — MissionHero/ActionPlanList):
 *  - <section aria-labelledby> con <h2> visibile.
 *  - Card con icon decorativa aria-hidden="true" + testo descrittivo
 *    accessible name.
 *  - Link CTA con accessible name esplicito (no "Apri" generic).
 *  - Progress bar therapy adherence con role=progressbar + aria-valuenow.
 *  - Tono: ambra (attention) per check-in overdue; mai rosso destructive
 *    su dati clinici (decisione cliente).
 *  - touch target >= 44px (Apple HIG + WCAG 2.5.5 AAA) garantito da
 *    classi tailwind `min-h-[44px]` su tap target.
 */

import Link from "next/link";
import {
  Calendar,
  FileText,
  Pill,
  ClipboardList,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { BriefingSummary } from "@/lib/data";

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

const WEEKDAYS_IT: Record<number, string> = {
  0: "domenica",
  1: "lunedì",
  2: "martedì",
  3: "mercoledì",
  4: "giovedì",
  5: "venerdì",
  6: "sabato",
};

function daysUntil(date: Date): number {
  const diff = date.getTime() - Date.now();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatAppointmentTimeIt(d: Date): string {
  const days = daysUntil(d);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  if (days === 0) return `oggi alle ${hh}:${mm}`;
  if (days === 1) return `domani alle ${hh}:${mm}`;
  if (days < 7) return `${WEEKDAYS_IT[d.getDay()]} alle ${hh}:${mm}`;
  return `fra ${days} giorni, ${hh}:${mm}`;
}

function professionalRoleLabel(role: "DOCTOR" | "COACH"): string {
  return role === "DOCTOR" ? "medico" : "coach";
}

// ---------------------------------------------------------------
// Sub-cards
// ---------------------------------------------------------------

function NextAppointmentCard({
  nextAppointment,
}: Pick<BriefingSummary, "nextAppointment">) {
  if (!nextAppointment) return null;
  const when = formatAppointmentTimeIt(nextAppointment.startTime);
  const roleLabel = professionalRoleLabel(nextAppointment.professional.role);
  return (
    <Link
      href="/dashboard/patient/appointments"
      aria-label={`Prossimo appuntamento ${when} con ${nextAppointment.professional.name}, apri agenda`}
      className="block min-h-[44px] rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="flex h-full items-start gap-3 p-4 transition-colors hover:bg-muted/30">
        <Calendar
          className="mt-0.5 size-5 shrink-0 text-blue-400"
          aria-hidden="true"
        />
        <div className="flex-1 space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Prossimo appuntamento
          </p>
          <p className="text-base font-medium text-foreground">
            {nextAppointment.professional.name}{" "}
            <span className="font-normal text-muted-foreground">
              · {roleLabel}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">{when}</p>
        </div>
        <ChevronRight
          className="mt-1 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </Card>
    </Link>
  );
}

function RecentReportCard({
  recentReport,
}: Pick<BriefingSummary, "recentReport">) {
  if (!recentReport) return null;
  const ageLabel =
    recentReport.daysAgo === 0
      ? "oggi"
      : recentReport.daysAgo === 1
        ? "ieri"
        : `${recentReport.daysAgo} giorni fa`;
  return (
    <Link
      href="/dashboard/patient/records"
      aria-label={`Ultimo referto, ${recentReport.title}, ${ageLabel}, apri sezione referti`}
      className="block min-h-[44px] rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="flex h-full items-start gap-3 p-4 transition-colors hover:bg-muted/30">
        <FileText
          className="mt-0.5 size-5 shrink-0 text-blue-400"
          aria-hidden="true"
        />
        <div className="flex-1 space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Ultimo referto · {ageLabel}
          </p>
          <p className="text-base font-medium text-foreground">
            {recentReport.title}
          </p>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {recentReport.snippet}
          </p>
        </div>
        <ChevronRight
          className="mt-1 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </Card>
    </Link>
  );
}

function TherapyAdherenceCard({
  therapyAdherence,
}: Pick<BriefingSummary, "therapyAdherence">) {
  if (!therapyAdherence || therapyAdherence.length === 0) return null;
  const listId = "therapy-adherence-list-label";
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-3">
        <Pill
          className="size-5 shrink-0 text-blue-400"
          aria-hidden="true"
        />
        <p
          id={listId}
          className="text-base font-medium text-foreground"
        >
          Terapie · ultimi 7 giorni
        </p>
      </div>
      <ul className="space-y-2.5" role="list" aria-labelledby={listId}>
        {therapyAdherence.slice(0, 4).map((t) => {
          const pct = Math.max(0, Math.min(100, Math.round(t.pctAdherence)));
          const barColor =
            pct >= 80
              ? "bg-blue-500/70"
              : pct >= 50
                ? "bg-amber-500/70"
                : "bg-amber-500/50";
          return (
            <li key={t.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-foreground">{t.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {t.takenLast7d}/{t.expectedPerWeek}
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={`${pct}% di aderenza · ${t.takenLast7d} su ${t.expectedPerWeek} dosi`}
                aria-label={t.name}
              >
                <div
                  className={cn("h-full transition-all", barColor)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function CheckInDueCard({
  checkInOverdueDays,
}: Pick<BriefingSummary, "checkInOverdueDays">) {
  if (!checkInOverdueDays || checkInOverdueDays <= 0) return null;
  return (
    <Link
      href="/dashboard/patient/check-in"
      aria-label={`Check-in in ritardo di ${checkInOverdueDays} giorni, completa adesso`}
      className="block min-h-[44px] rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="flex h-full items-start gap-3 border-amber-500/40 bg-amber-500/10 p-4 transition-colors hover:bg-amber-500/15">
        <AlertCircle
          className="mt-0.5 size-5 shrink-0 text-amber-500"
          aria-hidden="true"
        />
        <div className="flex-1 space-y-1">
          {/* text-amber-300 (vs amber-500) garantisce 4.5:1 su bg-amber-500/10.
              Decisione cliente: tono "attention" ambra (mai destructive rosso). */}
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
            Check-in in ritardo
          </p>
          <p className="text-base font-medium text-foreground">
            {checkInOverdueDays === 1
              ? "Da 1 giorno"
              : `Da ${checkInOverdueDays} giorni`}
          </p>
          <p className="text-sm text-muted-foreground">
            Bastano due minuti.
          </p>
        </div>
        <ChevronRight
          className="mt-1 size-4 shrink-0 text-amber-500"
          aria-hidden="true"
        />
      </Card>
    </Link>
  );
}

function ConditionsCard({
  conditions,
}: Pick<BriefingSummary, "conditions">) {
  const items: Array<{ label: string; value: string }> = [];
  if (conditions.medical && conditions.medical.trim() !== "") {
    items.push({ label: "Condizioni", value: conditions.medical });
  }
  if (conditions.allergies && conditions.allergies.trim() !== "") {
    items.push({ label: "Allergie", value: conditions.allergies });
  }
  if (conditions.medications && conditions.medications.trim() !== "") {
    items.push({ label: "Terapie in corso", value: conditions.medications });
  }
  if (items.length === 0) return null;
  const listId = "conditions-list-label";
  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-center gap-3">
        <ClipboardList
          className="size-5 shrink-0 text-blue-400"
          aria-hidden="true"
        />
        <p
          id={listId}
          className="text-base font-medium text-foreground"
        >
          Profilo clinico
        </p>
      </div>
      <dl className="grid gap-2 text-sm" aria-labelledby={listId}>
        {items.map((it) => (
          <div key={it.label} className="grid grid-cols-[110px_1fr] gap-2">
            <dt className="text-muted-foreground">{it.label}</dt>
            <dd className="text-foreground">{it.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

// ---------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------

interface Props {
  briefing: BriefingSummary;
}

export function ProactiveHighlights({ briefing }: Props) {
  // Pre-check: se TUTTI i dati sono vuoti non renderizziamo la sezione
  // (evita un <h2> orfano con grid vuota). Trim per evitare false positive
  // su stringhe di soli spazi (allinea il check ai sub-component).
  const hasConditions =
    !!briefing.conditions.medical?.trim() ||
    !!briefing.conditions.allergies?.trim() ||
    !!briefing.conditions.medications?.trim();
  const hasAny =
    briefing.nextAppointment != null ||
    briefing.recentReport != null ||
    briefing.therapyAdherence.length > 0 ||
    briefing.checkInOverdueDays > 0 ||
    hasConditions;
  if (!hasAny) return null;

  return (
    <section aria-labelledby="proactive-highlights-heading" className="space-y-3">
      <h2
        id="proactive-highlights-heading"
        className="text-base font-medium text-muted-foreground"
      >
        In sintesi
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        <CheckInDueCard checkInOverdueDays={briefing.checkInOverdueDays} />
        <NextAppointmentCard nextAppointment={briefing.nextAppointment} />
        <RecentReportCard recentReport={briefing.recentReport} />
        <TherapyAdherenceCard therapyAdherence={briefing.therapyAdherence} />
        <ConditionsCard conditions={briefing.conditions} />
      </div>
    </section>
  );
}
