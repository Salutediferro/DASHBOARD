"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Calendar,
  CheckCircle2,
  HeartPulse,
  Mail,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AdminCardsSkeleton } from "@/components/admin/admin-skeletons";

type MetricsResponse = {
  windowDays: number;
  signupTrend: Array<{ date: string; count: number }>;
  onboardingFunnel: {
    cohortTotal: number;
    onboarded: number;
    firstBiometric: number;
    firstAppointment: number;
  };
  invites: {
    total: number;
    pending: number;
    accepted: number;
    expired: number;
    revoked: number;
    acceptanceRate: number;
  };
  engagement: {
    totalActivePatients: number;
    active7d: number;
    active30d: number;
    breakdown7d: {
      biometric: number;
      checkIn: number;
      appointment: number;
    };
  };
};

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });
}

export default function AdminMetricsPage() {
  const { data, isLoading, isError, error } = useQuery<MetricsResponse>({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/metrics");
      if (!res.ok) throw new Error("Errore caricamento metriche");
      return res.json();
    },
    staleTime: 30_000,
  });

  const maxSignup = React.useMemo(() => {
    if (!data) return 0;
    return Math.max(1, ...data.signupTrend.map((r) => r.count));
  }, [data]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Metriche di prodotto
        </h1>
        <p className="text-muted-foreground text-sm">
          Andamento registrazioni, funnel onboarding, tasso accettazione inviti,
          engagement pazienti. Finestra 30 giorni salvo diversa indicazione.
        </p>
      </header>

      {isLoading ? (
        <AdminCardsSkeleton count={4} />
      ) : isError || !data ? (
        <Card>
          <CardContent className="p-6 text-sm text-red-600">
            {error instanceof Error ? error.message : "Errore"}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <BarChart3 className="text-muted-foreground h-4 w-4" />
              <CardTitle className="text-base">
                Signup pazienti · ultimi {data.windowDays} giorni
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SignupTrend data={data.signupTrend} max={maxSignup} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <TrendingUp className="text-muted-foreground h-4 w-4" />
              <CardTitle className="text-base">
                Funnel onboarding · coorte 30g
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Funnel
                stages={[
                  {
                    icon: Users,
                    label: "Registrati",
                    value: data.onboardingFunnel.cohortTotal,
                  },
                  {
                    icon: UserCheck,
                    label: "Onboarding completato",
                    value: data.onboardingFunnel.onboarded,
                  },
                  {
                    icon: HeartPulse,
                    label: "Prima misurazione",
                    value: data.onboardingFunnel.firstBiometric,
                  },
                  {
                    icon: Calendar,
                    label: "Primo appuntamento",
                    value: data.onboardingFunnel.firstAppointment,
                  },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Mail className="text-muted-foreground h-4 w-4" />
              <CardTitle className="text-base">
                Inviti · tasso di accettazione
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-heading text-4xl font-semibold tabular-nums">
                  {Math.round(data.invites.acceptanceRate * 100)}%
                </span>
                <span className="text-muted-foreground text-sm">
                  {data.invites.accepted}/{data.invites.total} inviti accettati
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <InviteStat
                  label="Pending"
                  value={data.invites.pending}
                  tone="bg-amber-500/15 text-amber-700 dark:text-amber-300"
                />
                <InviteStat
                  label="Accettati"
                  value={data.invites.accepted}
                  tone="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                />
                <InviteStat
                  label="Scaduti"
                  value={data.invites.expired}
                  tone="bg-slate-500/15 text-slate-700 dark:text-slate-300"
                />
                <InviteStat
                  label="Revocati"
                  value={data.invites.revoked}
                  tone="bg-red-500/15 text-red-700 dark:text-red-300"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Activity className="text-muted-foreground h-4 w-4" />
              <CardTitle className="text-base">
                Engagement pazienti
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-muted-foreground text-sm">
                Pazienti attivi = almeno una misurazione, check-in o
                appuntamento nella finestra. Base = pazienti non disabilitati
                ({data.engagement.totalActivePatients}).
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <EngagementTile
                  label="Attivi 7 giorni"
                  count={data.engagement.active7d}
                  total={data.engagement.totalActivePatients}
                />
                <EngagementTile
                  label="Attivi 30 giorni"
                  count={data.engagement.active30d}
                  total={data.engagement.totalActivePatients}
                />
              </div>
              <div className="text-muted-foreground text-xs">
                Breakdown 7 giorni:{" "}
                <span className="text-foreground">
                  {data.engagement.breakdown7d.biometric}
                </span>{" "}
                misurazioni ·{" "}
                <span className="text-foreground">
                  {data.engagement.breakdown7d.checkIn}
                </span>{" "}
                check-in ·{" "}
                <span className="text-foreground">
                  {data.engagement.breakdown7d.appointment}
                </span>{" "}
                appuntamenti
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SignupTrend({
  data,
  max,
}: {
  data: MetricsResponse["signupTrend"];
  max: number;
}) {
  const total = data.reduce((s, r) => s + r.count, 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <span className="font-heading text-3xl font-semibold tabular-nums">
          {total}
        </span>
        <span className="text-muted-foreground text-sm">
          nuovi pazienti totali · picco {max}/giorno
        </span>
      </div>
      <div className="flex h-32 items-end gap-[2px] overflow-x-auto">
        {data.map((row) => {
          const h = Math.max(2, Math.round((row.count / max) * 100));
          return (
            <div
              key={row.date}
              className="bg-primary/70 hover:bg-primary group relative flex w-[3%] min-w-[6px] flex-col justify-end rounded-sm transition-colors"
              style={{ height: `${h}%` }}
              title={`${formatShortDate(row.date)}: ${row.count}`}
            >
              <span className="bg-foreground text-background pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-xs opacity-0 group-hover:opacity-100">
                {formatShortDate(row.date)}: {row.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Funnel({
  stages,
}: {
  stages: Array<{ icon: React.ElementType; label: string; value: number }>;
}) {
  const base = Math.max(1, stages[0]?.value ?? 0);
  return (
    <ul className="flex flex-col gap-3">
      {stages.map((stage, idx) => {
        const Icon = stage.icon;
        const percent = pct(stage.value, base);
        const dropFromPrev =
          idx > 0 ? stages[idx - 1].value - stage.value : 0;
        return (
          <li
            key={stage.label}
            className="flex flex-wrap items-center gap-3"
          >
            <Icon className="text-muted-foreground h-4 w-4" />
            <span className="w-48 text-sm">{stage.label}</span>
            <div className="relative h-7 flex-1 min-w-[160px] overflow-hidden rounded-md bg-muted">
              <div
                className={cn(
                  "bg-primary h-full transition-all",
                  idx === 0 && "bg-primary/70",
                )}
                style={{ width: `${percent}%` }}
              />
              <span className="absolute inset-0 flex items-center px-2 text-xs font-medium">
                {stage.value.toLocaleString("it-IT")} · {percent}%
              </span>
            </div>
            {idx > 0 && dropFromPrev > 0 && (
              <span className="text-muted-foreground tabular-nums text-xs">
                −{dropFromPrev}
              </span>
            )}
            {idx === stages.length - 1 && stage.value > 0 && (
              <Badge
                variant="secondary"
                className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs"
              >
                <CheckCircle2 className="h-3 w-3" />
                attivati
              </Badge>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function InviteStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Badge
        variant="secondary"
        className={cn("w-fit gap-1 text-xs", tone)}
      >
        {label}
      </Badge>
      <span className="font-heading text-2xl font-semibold tabular-nums">
        {value.toLocaleString("it-IT")}
      </span>
    </div>
  );
}

function EngagementTile({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const percent = pct(count, total);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs uppercase tracking-wider">
        {label}
      </p>
      <div className="flex items-baseline gap-3">
        <span className="font-heading text-3xl font-semibold tabular-nums">
          {count.toLocaleString("it-IT")}
        </span>
        <span className="text-muted-foreground text-sm">
          {percent}% del totale
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="bg-primary h-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
