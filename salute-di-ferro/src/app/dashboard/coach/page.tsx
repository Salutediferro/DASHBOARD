"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  ClipboardCheck,
  Hourglass,
  LineChart,
  Loader2,
  Scale,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@/lib/hooks/use-user";
import { cn } from "@/lib/utils";

type AppointmentRow = {
  id: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  patientId: string;
  patientName: string | null;
};

type CheckInRow = {
  id: string;
  date: string;
  weight: number | null;
  rating: number | null;
  status: "PENDING" | "REVIEWED";
  patientId: string;
  patient: { id: string; fullName: string };
};

type ClientsResponse = {
  items: Array<{ id: string; patient: { id: string; fullName: string } }>;
  total: number;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function CoachDashboardPage() {
  const { profile, isLoading: userLoading } = useUser();

  const from = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);
  const to = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString();
  }, []);

  const clientsQuery = useQuery<ClientsResponse>({
    queryKey: ["my-patients"],
    queryFn: async () => {
      const res = await fetch("/api/clients?status=ACTIVE");
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });

  const appointmentsQuery = useQuery<AppointmentRow[]>({
    queryKey: ["appointments", { from, to, scope: "dashboard" }],
    queryFn: async () => {
      const sp = new URLSearchParams({ from, to });
      const res = await fetch(`/api/appointments?${sp.toString()}`);
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });

  const checkInsQuery = useQuery<{ items: CheckInRow[] }>({
    queryKey: ["coach-check-ins", { status: "PENDING" }],
    queryFn: async () => {
      const res = await fetch("/api/check-ins?status=PENDING");
      if (!res.ok) return { items: [] };
      return res.json();
    },
  });

  const appointments = React.useMemo(
    () => (appointmentsQuery.data ?? []).filter((a) => a.status !== "CANCELED"),
    [appointmentsQuery.data],
  );
  const todaysApp = appointments.filter((a) => isToday(a.startTime));
  const pending = checkInsQuery.data?.items ?? [];

  if (userLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Ciao {profile?.firstName || profile?.fullName?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm">
          Sintesi operativa dei tuoi assistiti.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Assistiti attivi"
          value={clientsQuery.data?.total ?? "—"}
          href="/dashboard/coach/patients"
        />
        <StatCard
          icon={<Hourglass className="h-5 w-5" />}
          label="Check-in da rivedere"
          value={checkInsQuery.isLoading ? "—" : pending.length}
          href="/dashboard/coach/monitoring"
          tone={pending.length > 0 ? "warning" : undefined}
        />
        <StatCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="Appuntamenti oggi"
          value={appointmentsQuery.isLoading ? "—" : todaysApp.length}
          href="/dashboard/coach/calendar"
        />
        <StatCard
          icon={<LineChart className="h-5 w-5" />}
          label="Prossimi 14 giorni"
          value={appointmentsQuery.isLoading ? "—" : appointments.length}
          href="/dashboard/coach/calendar"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Check-in in attesa di feedback
            </CardTitle>
            <Link
              href="/dashboard/coach/monitoring"
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Tutti →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {checkInsQuery.isLoading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
              </div>
            ) : pending.length === 0 ? (
              <p className="text-muted-foreground p-6 text-center text-sm">
                Tutto revisionato. Ottimo.
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {pending.slice(0, 6).map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {initials(c.patient.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {c.patient.fullName}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-3 text-xs">
                        <span>{formatDate(c.date)}</span>
                        {c.weight != null && (
                          <span className="inline-flex items-center gap-1">
                            <Scale className="h-3 w-3" /> {c.weight.toFixed(1)}{" "}
                            kg
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <Hourglass className="h-3 w-3" /> Pending
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Prossimi appuntamenti</CardTitle>
            <Link
              href="/dashboard/coach/calendar"
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Calendario →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {appointmentsQuery.isLoading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
              </div>
            ) : appointments.length === 0 ? (
              <p className="text-muted-foreground p-6 text-center text-sm">
                Nessun appuntamento in programma.
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {appointments.slice(0, 6).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 px-4 py-3 text-sm"
                  >
                    <div className="bg-primary/10 text-primary flex h-10 w-10 flex-col items-center justify-center rounded-md text-[10px] font-semibold uppercase">
                      <span>{formatDate(a.startTime)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {a.patientName ?? "Assistito"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatTime(a.startTime)} – {formatTime(a.endTime)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {a.type}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Azioni rapide</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <QuickAction
            href="/dashboard/coach/monitoring"
            icon={<ClipboardCheck className="h-5 w-5" />}
            title="Monitoraggio check-in"
            desc="Revisiona e dai feedback"
          />
          <QuickAction
            href="/dashboard/coach/patients"
            icon={<Users className="h-5 w-5" />}
            title="I miei assistiti"
            desc="Lista + inviti"
          />
          <QuickAction
            href="/dashboard/coach/availability"
            icon={<CalendarClock className="h-5 w-5" />}
            title="Disponibilità"
            desc="Slot prenotabili"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  href: string;
  tone?: "warning";
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="flex items-center gap-4 p-4">
          <div
            className={cn(
              "bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-md",
              tone === "warning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            )}
          >
            {icon}
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider">
              {label}
            </p>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {value}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="border-border hover:bg-muted/40 flex items-center gap-3 rounded-md border p-3"
    >
      <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-md">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">{desc}</p>
      </div>
    </Link>
  );
}
