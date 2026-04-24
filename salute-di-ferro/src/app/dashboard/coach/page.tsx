import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarClock,
  ClipboardCheck,
  LineChart,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { greeting } from "@/lib/greeting";
import {
  getCoachKpis,
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

export const metadata = { title: "Dashboard coach — Salute di Ferro" };
export const dynamic = "force-dynamic";

export default async function CoachDashboardPage() {
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
  if (me.role !== "COACH") redirect("/dashboard");

  const [kpis, activity, nextEvent] = await Promise.all([
    getCoachKpis(me.id),
    getProfessionalActivity(me.id, 5),
    getProfessionalNextEvent(me.id),
  ]);

  const firstName = me.firstName ?? me.fullName.split(" ")[0];

  return (
    <div className="page-in-stagger flex flex-col gap-6 pb-6 md:gap-8">
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={formatItalianDate()}
        sticky={false}
        className="-mx-4 -mt-4 md:-mx-8 md:-mt-8"
      />

      <section className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard
          label="Assistiti attivi"
          value={kpis.activeClients}
        />
        <StatCard
          label="Appuntamenti oggi"
          value={kpis.appointmentsToday}
        />
        <StatCard
          label="Check-in in attesa"
          value={kpis.checkInsPending ?? 0}
        />
        <StatCard
          label="Nuovi messaggi"
          value={kpis.unreadMessages}
        />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Prossimo"
          subtitle="Il prossimo impegno sul calendario."
        />
        {nextEvent ? (
          <Link
            href="/dashboard/coach/calendar"
            className="surface-2 focus-ring flex flex-col gap-1 rounded-xl px-5 py-4 transition-colors hover:bg-muted/30"
          >
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              Prossimo appuntamento
            </span>
            <span className="text-display text-xl">{nextEvent.title}</span>
            <span className="text-sm text-muted-foreground capitalize">
              {nextEvent.whenLabel}
            </span>
          </Link>
        ) : (
          <EmptyState
            icon={CalendarClock}
            title="Nessun appuntamento in programma"
            description="Pubblica la tua disponibilità o contatta i tuoi assistiti."
            action={
              <Link
                href="/dashboard/coach/availability"
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
          subtitle="Ultime 5 interazioni con i tuoi assistiti."
          action={
            <Link
              href="/dashboard/coach/monitoring"
              className="focus-ring rounded text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Monitoraggio →
            </Link>
          }
        />
        <RecentActivity
          items={activity}
          emptyTitle="Nessuna attività recente"
          emptyDescription="Appuntamenti, check-in e feedback dei tuoi assistiti compariranno qui."
        />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader title="Suggeriti" subtitle="Scorciatoie operative." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLinkCard
            href="/dashboard/coach/patients"
            icon={Users}
            title="I miei assistiti"
            description="Lista e inviti clienti."
          />
          <QuickLinkCard
            href="/dashboard/coach/monitoring"
            icon={ClipboardCheck}
            title="Monitoraggio"
            description="Check-in da rivedere e feedback."
          />
          <QuickLinkCard
            href="/dashboard/coach/calendar"
            icon={CalendarClock}
            title="Calendario"
            description="Agenda sessioni e visite."
          />
          <QuickLinkCard
            href="/dashboard/coach/availability"
            icon={LineChart}
            title="Disponibilità"
            description="Slot prenotabili online."
          />
        </div>
      </section>
    </div>
  );
}
