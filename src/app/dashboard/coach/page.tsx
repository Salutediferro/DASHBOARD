"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Play,
  Users,
  Video,
  Dumbbell,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { AdherenceList } from "@/components/coach/adherence-list";
import type { CoachDashboardData } from "@/lib/mock-data";

function formatEur(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "ora";
  if (mins < 60) return `${mins}m fa`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.round(hours / 24);
  return `${days}g fa`;
}

function adherenceColor(pct: number) {
  if (pct >= 80) return "#22c55e";
  if (pct >= 50) return "#eab308";
  return "#ef4444";
}

const appointmentIcon = {
  IN_PERSON: Users,
  VIDEO_CALL: Video,
  CHECK_IN: ClipboardList,
} as const;

const activityIcon = {
  WORKOUT_LOG: Dumbbell,
  CHECK_IN: CheckCircle2,
  NEW_CLIENT: Sparkles,
  PAYMENT: CreditCard,
} as const;

function Trend({ value }: { value: number }) {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        up ? "text-green-500" : "text-red-500",
      )}
    >
      <Icon className="h-3 w-3" />
      {up ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-muted animate-pulse rounded-md", className)} />;
}

function CardShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("animate-in fade-in-50 duration-500", className)}>
      {children}
    </Card>
  );
}

export default function CoachDashboardPage() {
  const { data, isLoading } = useQuery<CoachDashboardData>({
    queryKey: ["dashboard", "coach"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/coach", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm">
          Panoramica della tua attività di oggi
        </p>
      </header>

      <AdherenceList />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        {/* 1. OGGI — hero, full width */}
        <CardShell className="lg:col-span-6">
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardDescription className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {data
                  ? new Date(data.today.date).toLocaleDateString("it-IT", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  : "—"}
              </CardDescription>
              <CardTitle className="font-heading mt-1 text-2xl">
                {isLoading ? (
                  <Skeleton className="h-7 w-40" />
                ) : (
                  `${data?.today.appointments.length ?? 0} appuntamenti oggi`
                )}
              </CardTitle>
            </div>
            <button
              type="button"
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors"
            >
              <Play className="h-4 w-4" />
              Avvia sessione
            </button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {data?.today.appointments.slice(0, 3).map((a) => {
                  const Icon = appointmentIcon[a.type];
                  return (
                    <li
                      key={a.id}
                      className="border-border bg-background/40 flex items-center gap-4 rounded-md border p-3"
                    >
                      <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-md">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{a.clientName}</p>
                        <p className="text-muted-foreground text-xs">
                          {a.type.replace("_", " ").toLowerCase()}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-semibold">
                        {a.time}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </CardShell>

        {/* 2. CLIENTI ATTIVI — 1/3 */}
        <CardShell className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardDescription className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Clienti attivi
            </CardDescription>
            {!isLoading && data && <Trend value={data.activeClients.trendPercent} />}
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <p className="font-heading text-4xl font-semibold">
                {data?.activeClients.total}
              </p>
            )}
            <div className="flex flex-col gap-2">
              {(data?.activeClients.recent ?? []).map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                      {c.name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-sm">{c.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {timeAgo(c.joinedAt)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </CardShell>

        {/* 3. CHECK-IN IN ATTESA — 1/3 */}
        <CardShell className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardDescription className="flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4" /> Check-in in attesa
            </CardDescription>
            {!isLoading && data && data.pendingCheckins.oldestDays > 3 && (
              <Badge className="bg-destructive text-destructive-foreground">
                Urgente
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <>
                <p className="font-heading text-4xl font-semibold">
                  {data?.pendingCheckins.count}
                </p>
                <p className="text-muted-foreground text-xs">
                  Il più vecchio è di {data?.pendingCheckins.oldestDays} giorni fa
                </p>
              </>
            )}
            <a
              href="/dashboard/coach/clients?tab=checkins"
              className="text-primary hover:underline inline-block text-sm"
            >
              Vai alla lista →
            </a>
          </CardContent>
        </CardShell>

        {/* 4. REVENUE — 1/3 */}
        <CardShell className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardDescription className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" /> MRR
            </CardDescription>
            {!isLoading && data && <Trend value={data.revenue.trendPercent} />}
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <p className="font-heading text-4xl font-semibold">
                {formatEur(data?.revenue.mrrCents ?? 0)}
              </p>
            )}
            <div className="flex flex-col gap-1">
              <p className="text-muted-foreground text-xs font-medium">
                Rinnovi questa settimana
              </p>
              {(data?.revenue.upcomingRenewals ?? []).slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="truncate">{r.clientName}</span>
                  <span className="font-mono">{formatEur(r.amountCents)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </CardShell>

        {/* 5. ADERENZA — 1/2 */}
        <CardShell className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Aderenza clienti</CardTitle>
            <CardDescription>Top 5 per completamento allenamenti</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data?.adherence ?? []}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fill: "#a1a1a1", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "#ededed", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={72}
                    />
                    <Tooltip
                      cursor={{ fill: "#ffffff10" }}
                      contentStyle={{
                        background: "#1a1a1a",
                        border: "1px solid #2a2a2a",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v) => [`${v}%`, "Aderenza"] as [string, string]}
                    />
                    <Bar dataKey="percent" radius={[0, 4, 4, 0]}>
                      {(data?.adherence ?? []).map((e) => (
                        <Cell key={e.name} fill={adherenceColor(e.percent)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </CardShell>

        {/* 6. ATTIVITÀ RECENTE — 1/2 */}
        <CardShell className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Attività recente</CardTitle>
            <CardDescription>Ultimi eventi dai tuoi clienti</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <ol className="flex flex-col gap-4">
                {data?.activity.map((ev) => {
                  const Icon = activityIcon[ev.type];
                  return (
                    <li key={ev.id} className="flex items-start gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                          {ev.actorInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{ev.actorName}</span>{" "}
                          <span className="text-muted-foreground">
                            {ev.message}
                          </span>
                        </p>
                        <p className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Icon className="h-3 w-3" />
                          {timeAgo(ev.timestamp)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </CardShell>
      </div>
    </div>
  );
}
