import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  NotebookPen,
  Pill,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { greeting } from "@/lib/greeting";
import {
  getPatientActivity,
  getPatientKpis,
} from "@/lib/queries/dashboard";
import SectionHeader from "@/components/brand/section-header";
import StatCard from "@/components/brand/stat-card";
import { AppointmentsEmptyState } from "@/components/empty-states";
import RecentActivity from "@/components/dashboard/recent-activity";
import QuickLinkCard, {
  formatItalianDate,
} from "@/components/dashboard/quick-link-card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard — Salute di Ferro" };
export const dynamic = "force-dynamic";

export default async function PatientDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, fullName: true, firstName: true, role: true },
  });
  if (!me) redirect("/login");
  if (me.role !== "PATIENT") redirect("/dashboard");

  const [kpis, activity] = await Promise.all([
    getPatientKpis(me.id),
    getPatientActivity(me.id, 5),
  ]);

  const firstName = me.firstName ?? me.fullName.split(" ")[0];

  return (
    <div className="flex flex-col gap-6 pb-6 md:gap-8">
      <PatientHero firstName={firstName} kpis={kpis} />

      <section className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard
          label="Peso corrente"
          value={
            kpis.currentWeightKg != null
              ? kpis.currentWeightKg.toFixed(1)
              : "—"
          }
          unit={kpis.currentWeightKg != null ? "kg" : undefined}
          delta={
            kpis.weightDelta14d != null && kpis.currentWeightKg
              ? (kpis.weightDelta14d / kpis.currentWeightKg) * 100
              : undefined
          }
          trend={kpis.sparklines.weight ?? undefined}
          invertDelta
        />
        <StatCard
          label="BMI"
          value={kpis.bmi != null ? kpis.bmi.toFixed(1) : "—"}
          trend={kpis.sparklines.bmi ?? undefined}
          invertDelta
        />
        <StatCard
          label="Check-in settimana"
          value={kpis.checkInsThisWeek}
          trend={kpis.sparklines.checkIns}
        />
        <StatCard
          label="Prossimo appuntamento"
          value={
            kpis.nextAppointment
              ? kpis.nextAppointment.daysAway === 0
                ? "Oggi"
                : `${kpis.nextAppointment.daysAway}g`
              : "—"
          }
        />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Prossimo"
          subtitle="Il tuo impegno più vicino nel calendario."
        />
        {kpis.nextAppointment ? (
          <Link
            href={kpis.nextAppointment.href ?? "#"}
            className="surface-2 focus-ring flex flex-col gap-1 rounded-xl px-5 py-4 transition-colors hover:bg-muted/30"
          >
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              Prossimo appuntamento
            </span>
            <span className="text-display text-xl">
              {kpis.nextAppointment.title}
            </span>
            <span className="text-sm text-muted-foreground capitalize">
              {kpis.nextAppointment.whenLabel}
            </span>
          </Link>
        ) : (
          <AppointmentsEmptyState />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Attività recente"
          subtitle="Le ultime 5 voci della tua timeline."
          action={
            <Link
              href="/dashboard/patient/timeline"
              className="focus-ring rounded text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Vedi tutto →
            </Link>
          }
        />
        <RecentActivity
          items={activity}
          emptyTitle="Nessuna attività recente"
          emptyDescription="Le voci della tua timeline appariranno qui man mano che usi la piattaforma."
          emptyAction={
            <Link
              href="/dashboard/patient/check-in/new"
              className="focus-ring inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Registra un check-in
            </Link>
          }
        />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader title="Suggeriti" subtitle="Scorciatoie utili." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLinkCard
            href="/dashboard/patient/health"
            icon={HeartPulse}
            title="Dati salute"
            description="Traccia peso, pressione e biometrie."
          />
          <QuickLinkCard
            href="/dashboard/patient/medical-records"
            icon={ClipboardList}
            title="Cartella del cliente"
            description="Referti e documenti condivisi."
          />
          <QuickLinkCard
            href="/dashboard/patient/symptoms"
            icon={NotebookPen}
            title="Diario"
            description="Umore, energia, sintomi del giorno."
          />
          <QuickLinkCard
            href="/dashboard/patient/supplementi"
            icon={Pill}
            title="Supplementi"
            description="Tutto quello che prendi regolarmente."
          />
        </div>
      </section>
    </div>
  );
}

/**
 * Greeting hero specific to the patient home. Replaces the bland
 * PageHeader "Buongiorno, X / 23 aprile" with a motivational block
 * that surfaces one live signal from the user's own data — the weight
 * delta if we have it, otherwise the weekly check-in streak, otherwise
 * the next appointment distance. That way every patient landing here
 * sees "you" in the hero, not a generic date line.
 *
 * Built inline rather than a separate component: it's tied to
 * `PatientKpis` and lives nowhere else.
 */
function PatientHero({
  firstName,
  kpis,
}: {
  firstName: string;
  kpis: Awaited<ReturnType<typeof getPatientKpis>>;
}) {
  const signal = pickHeroSignal(kpis);
  return (
    <section
      className={cn(
        "page-header-glass relative -mx-4 -mt-4 overflow-hidden border-b border-border/60 px-6 py-6 md:-mx-8 md:-mt-8 md:py-8",
      )}
    >
      {/* Soft brand-red radial bloom from the left — visual anchor without
          screaming. Sits behind the text via z-order. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 0% 0%, color-mix(in oklab, var(--primary-500) 12%, transparent), transparent 60%)",
        }}
      />
      <div className="relative flex flex-col gap-2">
        <p className="text-muted-foreground text-xs uppercase tracking-wide">
          {formatItalianDate()}
        </p>
        <h1 className="text-display text-2xl leading-tight md:text-3xl">
          {greeting()}, <span className="text-primary-500">{firstName}</span>
        </h1>
        {signal && (
          <div className="mt-2 inline-flex max-w-max items-center gap-2 rounded-full border border-border/50 bg-card/70 px-3 py-1.5 text-sm">
            <signal.Icon
              className={cn("h-4 w-4 shrink-0", signal.tone)}
              aria-hidden
            />
            <span className="text-foreground">{signal.text}</span>
          </div>
        )}
      </div>
    </section>
  );
}

type HeroSignal = {
  Icon: typeof CheckCircle2;
  tone: string;
  text: string;
};

function pickHeroSignal(
  kpis: Awaited<ReturnType<typeof getPatientKpis>>,
): HeroSignal | null {
  // Priority order — pick the first that yields something meaningful.
  // Weight delta wins when it's significant (non-trivial motion) because
  // that's what a long-term patient cares about most.
  if (
    kpis.currentWeightKg != null &&
    kpis.weightDelta14d != null &&
    Math.abs(kpis.weightDelta14d) >= 0.2
  ) {
    const delta = kpis.weightDelta14d;
    const down = delta < 0;
    return {
      Icon: down ? TrendingDown : TrendingUp,
      tone: down
        ? "text-emerald-500 dark:text-emerald-400"
        : "text-amber-500 dark:text-amber-400",
      text: `${down ? "−" : "+"}${Math.abs(delta).toFixed(1)} kg in 14 giorni · sei a ${kpis.currentWeightKg.toFixed(1)} kg`,
    };
  }
  if (kpis.nextAppointment) {
    const days = kpis.nextAppointment.daysAway;
    const when =
      days === 0
        ? "oggi"
        : days === 1
          ? "domani"
          : `fra ${days} giorni`;
    return {
      Icon: CalendarClock,
      tone: "text-primary-500",
      text: `Prossimo appuntamento ${when}`,
    };
  }
  if (kpis.checkInsThisWeek > 0) {
    return {
      Icon: CheckCircle2,
      tone: "text-emerald-500 dark:text-emerald-400",
      text: `${kpis.checkInsThisWeek} check-in questa settimana — continua così`,
    };
  }
  return null;
}
