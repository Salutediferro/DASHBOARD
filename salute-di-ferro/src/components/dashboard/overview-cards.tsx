"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock, HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCard } from "../brand";
import type { PatientKpis, PatientMetricKey } from "@/lib/queries/dashboard";
import type { MetricGrade } from "@/lib/health/metric-thresholds";
import { GRADE_TONE } from "@/lib/health/grade-with-target";

/**
 * Each overview card has its own visual treatment — they share the
 * `surface-1` shell and the height contract via `size-full`, but their
 * insides are intentionally different (sparkline vs. classification
 * chip vs. bar chart vs. link card). A single generic StatCard would
 * smash them into the same shape and bury the differences that matter.
 */

export function WeightCard({ kpis, grade }: { kpis: PatientKpis; grade?: MetricGrade | null }) {
  return (
    <StatCard
      label="Peso corrente"
      value={kpis.currentWeightKg != null ? kpis.currentWeightKg.toFixed(1) : "—"}
      unit={kpis.currentWeightKg != null ? "kg" : undefined}
      delta={
        kpis.weightDelta14d != null && kpis.currentWeightKg
          ? (kpis.weightDelta14d / kpis.currentWeightKg) * 100
          : undefined
      }
      trend={kpis.sparklines.weight ?? undefined}
      invertDelta
      className={grade ? GRADE_TONE[grade] : undefined}
    />
  );
}

export function WeightDeltaCard({ kpis }: { kpis: PatientKpis }) {
  const delta = kpis.weightDelta14d;
  const hasDelta = delta != null && Number.isFinite(delta);
  const down = hasDelta && (delta as number) < 0;
  const up = hasDelta && (delta as number) > 0;
  const Icon = down ? ArrowDownRight : up ? ArrowUpRight : ArrowRight;
  // We don't know the user's goal direction here, so colour stays neutral
  // for "down" — it might be intentional cutting or unintended loss.
  const tone = "text-muted-foreground";

  return (
    <div className="surface-1 flex size-full flex-col p-3 md:p-4">
      <p className="text-muted-foreground text-xs font-medium">Variazione 14 giorni</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <Icon className={cn("h-6 w-6 self-center", tone)} aria-hidden />
        <span className="text-display text-2xl tabular-nums md:text-3xl">
          {hasDelta ? `${(delta as number) > 0 ? "+" : ""}${(delta as number).toFixed(1)}` : "—"}
        </span>
        {hasDelta && <span className="text-muted-foreground text-sm">kg</span>}
      </div>
      <p className="text-muted-foreground mt-2 text-[11px] leading-snug">
        Differenza tra la pesata più vecchia e quella più recente nelle ultime due settimane.
      </p>
    </div>
  );
}

const BMI_CLASSES: { max: number; label: string; tone: string }[] = [
  // WHO adult cut-offs.
  { max: 18.5, label: "Sottopeso", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { max: 25, label: "Normopeso", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  { max: 30, label: "Sovrappeso", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { max: Infinity, label: "Obesità", tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
];

export function BMICard({
  kpis,
  grade,
}: {
  kpis: PatientKpis;
  grade?: MetricGrade | null;
}) {
  const bmi = kpis.bmi;
  const klass = bmi != null ? (BMI_CLASSES.find((c) => bmi < c.max) ?? null) : null;
  return (
    <div
      className={cn(
        "surface-1 flex size-full flex-col p-3 md:p-4",
        grade && GRADE_TONE[grade],
      )}
    >
      <p className="text-muted-foreground text-xs font-medium">BMI</p>
      <span className="text-display mt-1 text-2xl tabular-nums md:text-3xl">
        {bmi != null ? bmi.toFixed(1) : "—"}
      </span>
      {klass && (
        <span
          className={cn(
            "mt-2 inline-flex max-w-max rounded-full px-2 py-0.5 text-[10px] font-semibold",
            klass.tone,
          )}
        >
          {klass.label}
        </span>
      )}
      <p className="text-muted-foreground mt-auto text-[11px] leading-snug">
        Calcolato dal tuo peso più recente e dall&apos;altezza nel profilo.
      </p>
    </div>
  );
}

export function CheckInsCard({ kpis }: { kpis: PatientKpis }) {
  // Bars over the last ~14 days. A daily check-in is discrete (0 or 1+),
  // so the smoothed area sparkline that StatCard renders fakes continuity
  // that isn't there. Bars read more honestly.
  const series = (kpis.sparklines.checkIns ?? []).slice(-14);
  const max = Math.max(1, ...series);
  return (
    <div className="surface-1 flex size-full flex-col p-3 md:p-4">
      <p className="text-muted-foreground text-xs font-medium">Check-in settimana</p>
      <span className="text-display mt-1 text-2xl tabular-nums md:text-3xl">
        {kpis.checkInsThisWeek}
      </span>
      <div className="mt-3 flex h-7 items-end gap-0.5" aria-hidden>
        {series.length === 0 ? (
          <div className="bg-muted h-full w-full rounded-sm opacity-40" />
        ) : (
          series.map((v, i) => (
            <div
              key={i}
              className="bg-primary-500/40 flex-1 rounded-sm"
              style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
            />
          ))
        )}
      </div>
      <p className="text-muted-foreground mt-2 text-[11px] leading-snug">Ultimi 14 giorni.</p>
    </div>
  );
}

// Generic card backed by `kpis.metrics[key]`. Most overview cards just
// show a number with a sparkline — same shape as StatCard. The opinionated
// ones (BMI classification, check-in bars, BP composite, next appointment)
// keep their bespoke layouts above/below.
export function SimpleMetricCard({
  kpis,
  metricKey,
  label,
  unit,
  invertDelta = false,
  format,
  grade,
}: {
  kpis: PatientKpis;
  metricKey: PatientMetricKey;
  label: string;
  unit?: string;
  invertDelta?: boolean;
  format?: (v: number) => string;
  grade?: MetricGrade | null;
}) {
  const m = kpis.metrics[metricKey];
  const value = m.current;
  const fmt = format ?? ((v: number) => v.toFixed(1));
  // Express the 14-day delta as a percentage of the current reading — same
  // convention as WeightCard so colour/arrow logic stays consistent.
  const deltaPct =
    m.delta14d != null && value && value !== 0 ? (m.delta14d / value) * 100 : undefined;
  return (
    <StatCard
      label={label}
      value={value != null ? fmt(value) : "—"}
      unit={value != null ? unit : undefined}
      delta={deltaPct}
      trend={m.hasData && m.series.length > 1 ? m.series : undefined}
      invertDelta={invertDelta}
      className={grade ? GRADE_TONE[grade] : undefined}
    />
  );
}

// Blood pressure is two values that only make sense together — "120/80"
// is the canonical reading. Classification follows ACC/AHA-ish bands so
// the chip mirrors BMICard's normo/sopra/elevato style.
const BP_CLASSES: { sys: number; dia: number; label: string; tone: string }[] = [
  { sys: 120, dia: 80, label: "Ottimale", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  { sys: 130, dia: 85, label: "Normale", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  { sys: 140, dia: 90, label: "Pre-ipertensione", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { sys: Infinity, dia: Infinity, label: "Ipertensione", tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
];

export function BloodPressureCard({
  kpis,
  grade,
}: {
  kpis: PatientKpis;
  grade?: MetricGrade | null;
}) {
  const sys = kpis.metrics.systolicBP.current;
  const dia = kpis.metrics.diastolicBP.current;
  const klass =
    sys != null && dia != null
      ? (BP_CLASSES.find((c) => sys < c.sys && dia < c.dia) ?? BP_CLASSES[BP_CLASSES.length - 1])
      : null;
  return (
    <div
      className={cn(
        "surface-1 flex size-full flex-col p-3 md:p-4",
        grade && GRADE_TONE[grade],
      )}
    >
      <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
        <HeartPulse className="h-3.5 w-3.5" aria-hidden />
        Pressione arteriosa
      </p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-display text-2xl tabular-nums md:text-3xl">
          {sys != null ? sys : "—"}
          <span className="text-muted-foreground mx-1 text-xl">/</span>
          {dia != null ? dia : "—"}
        </span>
        {(sys != null || dia != null) && (
          <span className="text-muted-foreground text-sm">mmHg</span>
        )}
      </div>
      {klass && (
        <span
          className={cn(
            "mt-2 inline-flex max-w-max rounded-full px-2 py-0.5 text-[10px] font-semibold",
            klass.tone,
          )}
        >
          {klass.label}
        </span>
      )}
      <p className="text-muted-foreground mt-auto text-[11px] leading-snug">
        Ultima rilevazione registrata.
      </p>
    </div>
  );
}

export function NextAppointmentCard({ kpis }: { kpis: PatientKpis }) {
  const a = kpis.nextAppointment;
  if (!a) {
    return (
      <div className="surface-1 flex size-full flex-col p-3 md:p-4">
        <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          Prossimo appuntamento
        </p>
        <span className="text-display mt-1 text-2xl tabular-nums md:text-3xl">—</span>
        <p className="text-muted-foreground mt-2 text-[11px] leading-snug">
          Nessun impegno in programma.
        </p>
      </div>
    );
  }
  const when =
    a.daysAway === 0 ? "Oggi" : a.daysAway === 1 ? "Domani" : `Tra ${a.daysAway} giorni`;
  return (
    <Link
      href={a.href ?? "#"}
      className="surface-1 hover:bg-muted/30 focus-ring flex size-full flex-col p-3 transition-colors md:p-4"
    >
      <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
        <CalendarClock className="h-3.5 w-3.5" aria-hidden />
        Prossimo appuntamento
      </p>
      <span className="text-display mt-1 text-2xl tabular-nums md:text-3xl">{when}</span>
      <p className="text-foreground/80 mt-1 line-clamp-1 text-xs">{a.title}</p>
      <p className="text-muted-foreground mt-auto line-clamp-1 text-[11px] capitalize">
        {a.whenLabel}
      </p>
    </Link>
  );
}
