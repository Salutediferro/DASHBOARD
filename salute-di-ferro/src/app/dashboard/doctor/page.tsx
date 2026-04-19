import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarClock,
  FileText,
  Stethoscope,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { greeting } from "@/lib/greeting";
import {
  getDoctorKpis,
  getProfessionalActivity,
  getProfessionalNextEvent,
} from "@/lib/queries/dashboard";
import PageHeader from "@/components/brand/page-header";
import SectionHeader from "@/components/brand/section-header";
import StatCard from "@/components/brand/stat-card";
import EmptyState from "@/components/brand/empty-state";
import RecentActivity from "@/components/dashboard/recent-activity";
import QuickLinkCard, {
  formatItalianDate,
} from "@/components/dashboard/quick-link-card";

export const metadata = { title: "Dashboard medico — Salute di Ferro" };
export const dynamic = "force-dynamic";

export default async function DoctorDashboardPage() {
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
  if (me.role !== "DOCTOR") redirect("/dashboard");

  const [kpis, activity, nextEvent] = await Promise.all([
    getDoctorKpis(me.id),
    getProfessionalActivity(me.id, 5),
    getProfessionalNextEvent(me.id),
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
        <StatCard label="Pazienti assegnati" value={kpis.activeClients} />
        <StatCard
          label="Visite questa settimana"
          value={kpis.visitsThisWeek ?? 0}
        />
        <StatCard
          label="Referti nuovi (30g)"
          value={kpis.newReports30d ?? 0}
        />
        <StatCard label="Messaggi non letti" value={kpis.unreadMessages} />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Prossimo"
          subtitle="La visita più vicina sull'agenda clinica."
        />
        {nextEvent ? (
          <Link
            href="/dashboard/doctor/calendar"
            className="surface-2 focus-ring flex flex-col gap-1 rounded-xl px-5 py-4 transition-colors hover:bg-muted/30"
          >
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              Prossima visita
            </span>
            <span className="text-display text-xl">{nextEvent.title}</span>
            <span className="text-sm text-muted-foreground capitalize">
              {nextEvent.whenLabel}
            </span>
          </Link>
        ) : (
          <EmptyState
            icon={CalendarClock}
            title="Nessuna visita in programma"
            description="Imposta la disponibilità per consentire ai pazienti di prenotare."
            action={
              <Link
                href="/dashboard/doctor/availability"
                className="focus-ring inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Imposta disponibilità
              </Link>
            }
          />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Attività recente"
          subtitle="Ultime 5 interazioni cliniche."
          action={
            <Link
              href="/dashboard/doctor/reports"
              className="focus-ring rounded text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Tutti i referti →
            </Link>
          }
        />
        <RecentActivity
          items={activity}
          emptyTitle="Nessuna attività recente"
          emptyDescription="Visite, referti e check-in dei pazienti compariranno qui."
        />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader title="Suggeriti" subtitle="Scorciatoie cliniche." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLinkCard
            href="/dashboard/doctor/patients"
            icon={Users}
            title="I miei pazienti"
            description="Lista e inviti."
          />
          <QuickLinkCard
            href="/dashboard/doctor/calendar"
            icon={Stethoscope}
            title="Calendario clinico"
            description="Visite e appuntamenti."
          />
          <QuickLinkCard
            href="/dashboard/doctor/reports"
            icon={FileText}
            title="Referti"
            description="Documenti clinici condivisi."
          />
          <QuickLinkCard
            href="/dashboard/doctor/availability"
            icon={CalendarClock}
            title="Disponibilità"
            description="Slot prenotabili online."
          />
        </div>
      </section>
    </div>
  );
}
