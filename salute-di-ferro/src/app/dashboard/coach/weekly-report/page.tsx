"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Clock, Flame, Loader2, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type WeeklyReport = {
  windowFrom: string;
  windowTo: string;
  mostActive: Array<{ clientId: string; fullName: string; sessions: number }>;
  leastActive: Array<{ clientId: string; fullName: string; sessions: number }>;
  checkInsDone: number;
  pendingCheckIns: number;
  prsCount: number;
  revenue: number | null;
};

// TODO: remove dev bypass
function devHeaders(): HeadersInit {
  return process.env.NODE_ENV === "development" ? { "x-dev-bypass": "1" } : {};
}

export default function WeeklyReportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["weekly-report"],
    queryFn: async (): Promise<WeeklyReport> => {
      const res = await fetch("/api/coach/weekly-report", { headers: devHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const from = new Date(data.windowFrom);
  const to = new Date(data.windowTo);

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Report settimanale
        </h1>
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <CalendarDays className="h-4 w-4" />
          {from.toLocaleDateString("it-IT", { day: "numeric", month: "short" })} —{" "}
          {to.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat icon={CheckCircle2} label="Check-in completati" value={data.checkInsDone} />
        <Stat icon={Clock} label="Check-in in attesa" value={data.pendingCheckIns} />
        <Stat icon={Trophy} label="Nuovi PR (stima)" value={data.prsCount} />
        <Stat
          icon={Flame}
          label="Revenue settimana"
          value={data.revenue !== null ? `€${data.revenue}` : "—"}
          hint={data.revenue === null ? "Disponibile quando Stripe è configurato" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListCard title="Clienti più attivi" rows={data.mostActive} empty="Nessun dato" />
        <ListCard title="Clienti meno attivi" rows={data.leastActive} empty="Nessun dato" />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {hint && <p className="text-muted-foreground text-[10px]">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ListCard({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Array<{ clientId: string; fullName: string; sessions: number }>;
  empty: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">{empty}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {rows.map((r) => (
              <li
                key={r.clientId}
                className="flex items-center justify-between rounded-md border p-2.5"
              >
                <span className="text-sm font-medium">{r.fullName}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {r.sessions} sessioni
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
