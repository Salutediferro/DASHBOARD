"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  CalendarPlus,
  ClipboardCheck,
  ClipboardList,
  HeartPulse,
  Loader2,
  Plus,
  Scale,
  Stethoscope,
  UserRound,
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

type AppointmentRow = {
  id: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  professionalId: string;
  professionalName: string | null;
};

type CheckInRow = {
  id: string;
  date: string;
  weight: number | null;
  rating: number | null;
  status: "PENDING" | "REVIEWED";
  professionalFeedback: string | null;
};

type ProfessionalsResponse = Array<{
  relationshipId: string;
  professionalRole: "DOCTOR" | "COACH";
  professional: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}>;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

export default function PatientDashboardPage() {
  const { profile, isLoading: userLoading } = useUser();

  const from = React.useMemo(() => new Date().toISOString(), []);
  const to = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString();
  }, []);

  const apptQuery = useQuery<AppointmentRow[]>({
    queryKey: ["appointments", { from, to, scope: "patient-dashboard" }],
    queryFn: async () => {
      const sp = new URLSearchParams({ from, to });
      const res = await fetch(`/api/appointments?${sp.toString()}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const checkInsQuery = useQuery<{ items: CheckInRow[] }>({
    queryKey: ["patient-check-ins"],
    queryFn: async () => {
      const res = await fetch("/api/check-ins?status=ALL");
      if (!res.ok) return { items: [] };
      return res.json();
    },
  });

  const profsQuery = useQuery<ProfessionalsResponse>({
    queryKey: ["my-professionals"],
    queryFn: async () => {
      const res = await fetch("/api/me/professionals");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const nextAppt = (apptQuery.data ?? []).find(
    (a) => a.status === "SCHEDULED",
  );
  const lastCheckIn = checkInsQuery.data?.items[0];
  const professionals = profsQuery.data ?? [];
  const doctor = professionals.find((p) => p.professionalRole === "DOCTOR");
  const coach = professionals.find((p) => p.professionalRole === "COACH");

  // Pin "now" at mount so subsequent re-renders (e.g. from a query refetch)
  // don't rebuild the derived `daysSinceCheckIn` with a moving reference.
  // A lazy useState initializer runs outside render, which React Compiler
  // accepts (useMemo factory counts as "during render" and is rejected).
  const [nowMs] = React.useState(() => Date.now());

  if (userLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const daysSinceCheckIn = lastCheckIn
    ? Math.floor(
        (nowMs - new Date(lastCheckIn.date).getTime()) / 86400000,
      )
    : null;
  const checkInOverdue = daysSinceCheckIn == null || daysSinceCheckIn >= 7;

  return (
    <div className="flex flex-col gap-6 pb-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Ciao{profile?.firstName ? `, ${profile.firstName}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm">
          La tua centrale salute.
        </p>
      </header>

      {/* Primary CTA: weekly check-in */}
      <Card
        className={
          checkInOverdue
            ? "border-primary/40 bg-primary/5"
            : undefined
        }
      >
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="bg-primary/15 text-primary flex h-12 w-12 items-center justify-center rounded-md">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {checkInOverdue
                ? "È ora del check-in settimanale"
                : "Ultimo check-in inviato"}
            </p>
            <p className="text-muted-foreground text-xs">
              {lastCheckIn
                ? `Ultimo: ${formatDate(lastCheckIn.date)} · ${daysSinceCheckIn === 0 ? "oggi" : `${daysSinceCheckIn} giorni fa`}`
                : "Non hai ancora inviato nessun check-in."}
            </p>
          </div>
          <Link
            href="/dashboard/patient/check-in/new"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Nuovo check-in
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Prossimo appuntamento</CardTitle>
            <Link
              href="/dashboard/patient/appointments"
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Tutti →
            </Link>
          </CardHeader>
          <CardContent>
            {apptQuery.isLoading ? (
              <div className="flex h-20 items-center justify-center">
                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
              </div>
            ) : nextAppt ? (
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-md">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {formatDateTime(nextAppt.startTime)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Con {nextAppt.professionalName ?? "professionista"}
                  </p>
                  <Badge variant="outline" className="mt-2 text-[10px]">
                    {nextAppt.type}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-muted-foreground text-sm">
                  Nessun appuntamento in programma.
                </p>
                <Link
                  href="/dashboard/patient/appointments"
                  className="border-border hover:bg-muted inline-flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Prenota
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">I tuoi professionisti</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {profsQuery.isLoading ? (
              <div className="flex h-20 items-center justify-center">
                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
              </div>
            ) : professionals.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nessun professionista collegato. Attendi un invito o chiedilo
                al tuo medico/coach.
              </p>
            ) : (
              <>
                {doctor && (
                  <ProfessionalRow
                    role="Medico"
                    icon={<Stethoscope className="h-4 w-4" />}
                    name={doctor.professional.fullName}
                  />
                )}
                {coach && (
                  <ProfessionalRow
                    role="Coach"
                    icon={<UserRound className="h-4 w-4" />}
                    name={coach.professional.fullName}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {lastCheckIn?.professionalFeedback && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Feedback sul tuo ultimo check-in
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-wrap text-sm">
                {lastCheckIn.professionalFeedback}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Check-in del {formatDate(lastCheckIn.date)}
                {lastCheckIn.weight != null &&
                  ` · ${lastCheckIn.weight.toFixed(1)} kg`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scorciatoie</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href="/dashboard/patient/health"
            icon={<HeartPulse className="h-5 w-5" />}
            title="Dati salute"
            desc="Biometria & trend"
          />
          <QuickAction
            href="/dashboard/patient/medical-records"
            icon={<ClipboardList className="h-5 w-5" />}
            title="Cartella clinica"
            desc="Referti & permessi"
          />
          <QuickAction
            href="/dashboard/patient/appointments"
            icon={<Calendar className="h-5 w-5" />}
            title="Appuntamenti"
            desc="Prenota & storico"
          />
          <QuickAction
            href="/dashboard/patient/check-in/new"
            icon={<Scale className="h-5 w-5" />}
            title="Check-in"
            desc="Peso, foto, note"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ProfessionalRow({
  role,
  icon,
  name,
}: {
  role: string;
  icon: React.ReactNode;
  name: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-primary/20 text-primary text-xs">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-muted-foreground inline-flex items-center gap-1 text-xs">
          {icon} {role}
        </p>
      </div>
    </div>
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
