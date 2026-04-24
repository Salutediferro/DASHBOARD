"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  Flame,
  Inbox,
  KeyRound,
  Loader2,
  RefreshCw,
  ScrollText,
  Server,
  ShieldCheck,
  Siren,
  Users,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AdminTilesSkeleton } from "@/components/admin/admin-skeletons";

type Check = {
  ok: boolean;
  configured: boolean;
  latencyMs: number | null;
  error?: string;
  detail?: string;
};

type Cron = {
  path: string;
  schedule: string;
  description: string;
  secretConfigured: boolean;
};

type HealthResponse = {
  ok: boolean;
  timestamp: string;
  checks: {
    prisma: Check;
    supabaseAuth: Check;
    supabaseStorage: Check;
    redis: Check;
    resend: Check;
    sentry: Check;
  };
  stats: {
    totalUsers: number;
    disabledUsers: number;
    totalAppointments: number;
    upcomingAppointments: number;
    totalAuditLogs: number;
    totalMedicalReports: number;
    totalInvitations: number;
    pendingInvitations: number;
  } | null;
  crons: Cron[];
};

const SERVICE_META: Record<
  keyof HealthResponse["checks"],
  { label: string; icon: React.ElementType; critical: boolean }
> = {
  prisma: { label: "Database (Prisma)", icon: Database, critical: true },
  supabaseAuth: { label: "Supabase Auth", icon: ShieldCheck, critical: true },
  supabaseStorage: {
    label: "Supabase Storage",
    icon: Server,
    critical: true,
  },
  redis: { label: "Upstash Redis", icon: Flame, critical: false },
  resend: { label: "Resend (email)", icon: Inbox, critical: false },
  sentry: { label: "Sentry", icon: Siren, critical: false },
};

function statusVisual(check: Check, critical: boolean) {
  if (!check.configured) {
    return {
      label: "Non configurato",
      tone: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
      icon: <AlertCircle className="h-3 w-3" />,
    };
  }
  if (check.ok) {
    return {
      label: "OK",
      tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      icon: <CheckCircle2 className="h-3 w-3" />,
    };
  }
  return {
    label: critical ? "DOWN" : "Degraded",
    tone: critical
      ? "bg-red-500/20 text-red-700 dark:text-red-300"
      : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    icon: <XCircle className="h-3 w-3" />,
  };
}

function formatLatency(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1) return "<1 ms";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AdminHealthPage() {
  const { data, isLoading, isFetching, refetch, error } =
    useQuery<HealthResponse>({
      queryKey: ["admin-health"],
      queryFn: async () => {
        const res = await fetch("/api/admin/health", { cache: "no-store" });
        if (!res.ok) throw new Error("Errore caricamento health");
        return res.json();
      },
      // Auto-refresh every 30s so an admin parked on the page sees live state.
      refetchInterval: 30_000,
      staleTime: 0,
    });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Stato piattaforma
          </h1>
          <p className="text-muted-foreground text-sm">
            Liveness dei servizi esterni + contatori sistema. Auto-refresh ogni 30 s.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.timestamp && (
            <span className="text-muted-foreground text-xs tabular-nums">
              Ultima: {formatTime(data.timestamp)}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Aggiorna
          </Button>
        </div>
      </header>

      {isLoading ? (
        <AdminTilesSkeleton count={6} />
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-red-600">
            {error instanceof Error ? error.message : "Errore"}
          </CardContent>
        </Card>
      ) : data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              Object.keys(SERVICE_META) as Array<keyof typeof SERVICE_META>
            ).map((key) => {
              const meta = SERVICE_META[key];
              const check = data.checks[key];
              const vis = statusVisual(check, meta.critical);
              const Icon = meta.icon;
              return (
                <Card key={key}>
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className="text-muted-foreground h-4 w-4" />
                        <span className="text-sm font-medium">{meta.label}</span>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn("gap-1 text-xs", vis.tone)}
                      >
                        {vis.icon}
                        {vis.label}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-3 text-xs tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatLatency(check.latencyMs)}
                      </span>
                      {meta.critical && (
                        <span className="text-xs uppercase tracking-wider">
                          critico
                        </span>
                      )}
                    </div>
                    {check.detail && (
                      <p className="text-muted-foreground text-xs">
                        {check.detail}
                      </p>
                    )}
                    {check.error && (
                      <p className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-700 dark:text-red-300">
                        {check.error}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </section>

          {data.stats && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Activity className="text-muted-foreground h-4 w-4" />
                <CardTitle className="text-base">Statistiche sistema</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  icon={Users}
                  label="Utenti totali"
                  value={data.stats.totalUsers}
                  muted={`${data.stats.disabledUsers} disabilitati`}
                />
                <Stat
                  icon={Clock}
                  label="Appuntamenti"
                  value={data.stats.totalAppointments}
                  muted={`${data.stats.upcomingAppointments} futuri`}
                />
                <Stat
                  icon={Inbox}
                  label="Inviti"
                  value={data.stats.totalInvitations}
                  muted={`${data.stats.pendingInvitations} pending`}
                />
                <Stat
                  icon={ScrollText}
                  label="Audit log"
                  value={data.stats.totalAuditLogs}
                  muted={`${data.stats.totalMedicalReports} referti`}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <KeyRound className="text-muted-foreground h-4 w-4" />
              <CardTitle className="text-base">Cron job</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-border divide-y">
                {data.crons.map((cron) => (
                  <li
                    key={cron.path}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="text-xs font-semibold">
                          {cron.path}
                        </code>
                        <Badge variant="outline" className="font-mono text-xs">
                          {cron.schedule}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {cron.description}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "gap-1 text-xs",
                        cron.secretConfigured
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                      )}
                    >
                      {cron.secretConfigured ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      {cron.secretConfigured
                        ? "CRON_SECRET ok"
                        : "CRON_SECRET mancante"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  muted: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-muted text-muted-foreground flex h-10 w-10 items-center justify-center rounded-md">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-muted-foreground text-xs uppercase tracking-wider">
          {label}
        </p>
        <p className="font-heading text-2xl font-semibold tabular-nums">
          {value.toLocaleString("it-IT")}
        </p>
        <p className="text-muted-foreground text-xs">{muted}</p>
      </div>
    </div>
  );
}
