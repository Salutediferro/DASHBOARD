"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useAppointments,
  type AppointmentDTO,
} from "@/lib/hooks/use-appointments";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/validators/appointment";
import { CalendarView } from "@/components/calendar/calendar-view";
import { AppointmentForm } from "@/components/calendar/appointment-form";
import { AppointmentDetail } from "@/components/calendar/appointment-detail";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PatientAppointmentsPage() {
  const [bookOpen, setBookOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<AppointmentDTO | null>(null);

  const { data: all = [], isLoading } = useAppointments();

  const now = new Date().toISOString();
  const upcoming = all
    .filter((a) => a.status === "SCHEDULED" && a.startTime >= now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const past = all
    .filter((a) => a.status !== "SCHEDULED" || a.startTime < now)
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, 20);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Appuntamenti
          </h1>
          <p className="text-muted-foreground text-sm">
            I tuoi incontri con medico e coach
          </p>
        </div>
        <Button type="button" onClick={() => setBookOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Prenota
        </Button>
      </header>

      <CalendarView
        appointments={all}
        onSelect={setSelected}
        title="Settimana"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prossimi</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-muted-foreground p-4 text-sm">Caricamento…</p>
            ) : upcoming.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">
                Nessun appuntamento in programma
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {upcoming.map((a) => (
                  <li
                    key={a.id}
                    className="hover:bg-muted/40 cursor-pointer px-4 py-3 text-sm"
                    onClick={() => setSelected(a)}
                  >
                    <p className="font-medium">
                      {fmt(a.startTime)} · {a.professionalName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {APPOINTMENT_TYPE_LABELS[a.type]}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Storico</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {past.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">
                Nessuno storico
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {past.map((a) => (
                  <li
                    key={a.id}
                    className="hover:bg-muted/40 cursor-pointer px-4 py-3 text-sm"
                    onClick={() => setSelected(a)}
                  >
                    <p className="font-medium">
                      {fmt(a.startTime)} · {a.professionalName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {APPOINTMENT_TYPE_LABELS[a.type]} · {a.status}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <AppointmentForm
        open={bookOpen}
        onOpenChange={setBookOpen}
        mode="PATIENT"
      />
      <AppointmentDetail
        appointment={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
