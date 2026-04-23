import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  ScrollText,
  TicketCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { greeting } from "@/lib/greeting";
import { getAdminActivity, getAdminKpis } from "@/lib/queries/dashboard";
import PageHeader from "@/components/brand/page-header";
import SectionHeader from "@/components/brand/section-header";
import StatCard from "@/components/brand/stat-card";
import EmptyState from "@/components/brand/empty-state";
import RecentActivity from "@/components/dashboard/recent-activity";
import QuickLinkCard, {
  formatItalianDate,
} from "@/components/dashboard/quick-link-card";

export const metadata = { title: "Admin — Salute di Ferro" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
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
  if (me.role !== "ADMIN") redirect("/dashboard");

  const [kpis, activity] = await Promise.all([
    getAdminKpis(),
    getAdminActivity(5),
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
        <StatCard label="Utenti totali" value={kpis.totalUsers} />
        <StatCard
          label="Nuove registrazioni (7g)"
          value={kpis.newSignups7d}
          trend={kpis.sparklines.signups}
        />
        <StatCard
          label="Appuntamenti 7g"
          value={kpis.appointments7d}
          trend={kpis.sparklines.appointments}
        />
        <StatCard
          label="Organizzazioni attive"
          value={kpis.activeOrganizations}
        />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Prossimo"
          subtitle="Cosa richiede attenzione adesso."
        />
        {kpis.newSignups7d > 0 ? (
          <Link
            href="/dashboard/admin/users"
            className="surface-2 focus-ring flex flex-col gap-1 rounded-xl px-5 py-4 transition-colors hover:bg-muted/30"
          >
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <UserPlus className="h-3.5 w-3.5" />
              Onboarding
            </span>
            <span className="text-display text-xl">
              {kpis.newSignups7d} nuove registrazioni negli ultimi 7 giorni
            </span>
            <span className="text-sm text-muted-foreground">
              Controlla i nuovi account, assegna organizzazioni e ruoli.
            </span>
          </Link>
        ) : (
          <EmptyState
            icon={UserPlus}
            title="Nessuna nuova registrazione"
            description="La piattaforma è tranquilla: approfittane per ottimizzare la configurazione."
          />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Attività recente"
          subtitle="Ultime registrazioni e azioni dall'audit log."
          action={
            <Link
              href="/dashboard/admin/audit"
              className="focus-ring rounded text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Audit completo →
            </Link>
          }
        />
        <RecentActivity
          items={activity}
          emptyTitle="Nessuna attività registrata"
          emptyDescription="Quando un utente si registra o un'azione viene auditata, apparirà qui."
        />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader title="Suggeriti" subtitle="Strumenti di amministrazione." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLinkCard
            href="/dashboard/admin/users"
            icon={Users}
            title="Gestione utenti"
            description="Cerca, filtra, modera."
          />
          <QuickLinkCard
            href="/dashboard/admin/users/new"
            icon={UserPlus}
            title="Nuovo professionista"
            description="Invita medico o coach."
          />
          <QuickLinkCard
            href="/dashboard/admin/invitations"
            icon={TicketCheck}
            title="Inviti"
            description="Lista, reinvia, revoca."
          />
          <QuickLinkCard
            href="/dashboard/admin/audit"
            icon={ScrollText}
            title="Audit log"
            description="Tracciabilità GDPR."
          />
          <QuickLinkCard
            href="/dashboard/admin/organizations"
            icon={Building2}
            title="Organizzazioni"
            description="Tenant white-label."
          />
        </div>
      </section>
    </div>
  );
}
