"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  CalendarClock,
  FileText,
  Loader2,
  Stethoscope,
  Users,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/lib/hooks/use-user";
import { cn } from "@/lib/utils";
import type { MedicalReportListItem } from "@/lib/hooks/use-medical-records";

type AppointmentRow = {
  id: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  patientId: string;
  patientName: string | null;
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
    weekday: "short",
    day: "numeric",
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

export default function DoctorDashboardPage() {
  const { profile, isLoading: userLoading } = useUser();

  const from = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);
  const to = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, []);

  const patientsQuery = useQuery<ClientsResponse>({
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

  const reportsQuery = useQuery<MedicalReportListItem[]>({
    queryKey: ["medical-reports", {}],
    queryFn: async () => {
      const res = await fetch("/api/medical-reports");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const appointments = React.useMemo(
    () => (appointmentsQuery.data ?? []).filter((a) => a.status !== "CANCELED"),
    [appointmentsQuery.data],
  );
  const todaysApp = appointments.filter((a) => isToday(a.startTime));
  const upcomingApp = appointments.filter((a) => !isToday(a.startTime));

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
          Benvenuto, {profile?.firstName || profile?.fullName?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm">
          Ecco cosa è successo da quando eri via.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Pazienti attivi"
          value={patientsQuery.data?.total ?? "—"}
          href="/dashboard/doctor/patients"
        />
        <StatCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="Appuntamenti oggi"
          value={appointmentsQuery.isLoading ? "—" : todaysApp.length}
          href="/dashboard/doctor/calendar"
          tone={todaysApp.length > 0 ? "accent" : undefined}
        />
        <StatCard
          icon={<Calendar className="h-5 w-5" />}
          label="Prossimi 14 giorni"
          value={appointmentsQuery.isLoading ? "—" : upcomingApp.length}
          href="/dashboard/doctor/calendar"
        />
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Referti condivisi"
          value={reportsQuery.isLoading ? "—" : (reportsQuery.data?.length ?? 0)}
          href="/dashboard/doctor/reports"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Prossimi appuntamenti</CardTitle>
            <Link
              href="/dashboard/doctor/calendar"
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
                      <span>{formatDate(a.startTime).split(" ")[0]}</span>
                      <span className="text-sm font-bold leading-none">
                        {new Date(a.startTime).getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {a.patientName ?? "Paziente"}
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Ultimi referti condivisi</CardTitle>
            <Link
              href="/dashboard/doctor/reports"
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Tutti →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {reportsQuery.isLoading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
              </div>
            ) : (reportsQuery.data ?? []).length === 0 ? (
              <p className="text-muted-foreground p-6 text-center text-sm">
                Nessun referto condiviso con te.
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {(reportsQuery.data ?? []).slice(0, 6).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {initials(r.patient.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {r.patient.fullName} ·{" "}
                        {new Date(r.uploadedAt).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/doctor/patients/${r.patientId}/reports`}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      Apri
                    </Link>
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
            href="/dashboard/doctor/patients"
            icon={<Users className="h-5 w-5" />}
            title="I miei pazienti"
            desc="Lista + inviti"
          />
          <QuickAction
            href="/dashboard/doctor/calendar"
            icon={<Stethoscope className="h-5 w-5" />}
            title="Calendario clinico"
            desc="Visite e appuntamenti"
          />
          <QuickAction
            href="/dashboard/doctor/availability"
            icon={<CalendarClock className="h-5 w-5" />}
            title="Disponibilità"
            desc="Orari prenotabili"
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
  tone?: "accent";
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="flex items-center gap-4 p-4">
          <div
            className={cn(
              "bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-md",
              tone === "accent" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
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
