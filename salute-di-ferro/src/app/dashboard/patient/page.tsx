import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarClock,
  ClipboardList,
  HeartPulse,
  NotebookPen,
  Pill,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { greeting } from "@/lib/greeting";
import {
  getPatientActivity,
  getPatientKpis,
} from "@/lib/queries/dashboard";
import PageHeader from "@/components/brand/page-header";
import SectionHeader from "@/components/brand/section-header";
import StatCard from "@/components/brand/stat-card";
import EmptyState from "@/components/brand/empty-state";
import { AppointmentsEmptyState } from "@/components/empty-states";
import RecentActivity from "@/components/dashboard/recent-activity";
import QuickLinkCard, {
  formatItalianDate,
} from "@/components/dashboard/quick-link-card";

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
    <div className="flex flex-col gap-8 pb-6">
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={formatItalianDate()}
        sticky={false}
        className="-mx-4 -mt-4 md:-mx-8 md:-mt-8"
      />

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
