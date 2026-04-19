"use client";

import * as React from "react";
import { CalendarPlus, Plus } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

import PageHeader from "@/components/brand/page-header";
import SectionHeader from "@/components/brand/section-header";
import EmptyState from "@/components/brand/empty-state";
import {
  useAppointments,
  type AppointmentDTO,
} from "@/lib/hooks/use-appointments";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/validators/appointment";
import { AppointmentForm } from "@/components/calendar/appointment-form";
import { AppointmentDetail } from "@/components/calendar/appointment-detail";

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Confermato",
  COMPLETED: "Completato",
  CANCELED: "Annullato",
  NO_SHOW: "No-show",
};

function fmtLong(iso: string) {
  return format(new Date(iso), "EEEE d MMMM 'alle' HH:mm", { locale: it });
}

function fmtShort(iso: string) {
  return format(new Date(iso), "EEE d MMM", { locale: it });
}

function fmtTime(iso: string) {
  return format(new Date(iso), "HH:mm");
}

export default function PatientAppointmentsPage() {
  const [bookOpen, setBookOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<AppointmentDTO | null>(null);

  const { data: all = [], isLoading } = useAppointments();

  const nowIso = new Date().toISOString();
  const upcoming = all
    .filter((a) => a.status === "SCHEDULED" && a.startTime >= nowIso)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const past = all
    .filter((a) => a.status !== "SCHEDULED" || a.startTime < nowIso)
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, 20);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Appuntamenti"
        description="Visite e sessioni con medico e coach. Prenota un nuovo incontro in pochi passaggi."
        className="-mx-4 -mt-4 md:-mx-8 md:-mt-8"
        actions={
          <button
            type="button"
            onClick={() => setBookOpen(true)}
            className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Prenota appuntamento
          </button>
        }
      />

      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Prossimi"
          subtitle="I tuoi impegni confermati."
        />
        {isLoading ? (
          <div className="surface-1 h-24 animate-pulse rounded-xl" />
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarPlus}
            title="Nessun appuntamento in programma"
            description="Prenota il primo appuntamento — vedrai qui data, orario e link al meeting."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setSelected(a)}
                  className="surface-2 focus-ring flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-muted/30"
                >
                  <span
                    aria-hidden
                    className="flex h-11 w-11 flex-col items-center justify-center rounded-md bg-primary-500/10 text-[10px] font-semibold uppercase text-primary-500"
                  >
                    <span>{fmtShort(a.startTime).split(" ")[0]}</span>
                    <span className="text-sm leading-none">
                      {new Date(a.startTime).getDate()}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium capitalize">
                      {fmtLong(a.startTime)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {a.professionalName ?? "—"} · {APPOINTMENT_TYPE_LABELS[a.type]}
                    </span>
                  </span>
                  <a
                    href={`/api/appointments/${a.id}/ics`}
                    download
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Aggiungi al calendario"
                    className="focus-ring inline-flex h-8 items-center gap-1 rounded-md border border-border/60 px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
                    .ics
                  </a>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Storico" subtitle="Ultimi 20 incontri." />
        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuno storico ancora.</p>
        ) : (
          <ul className="surface-1 divide-y divide-border/60 overflow-hidden rounded-xl">
            {past.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setSelected(a)}
                  className="focus-ring flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/40"
                >
                  <span className="w-20 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {fmtShort(a.startTime)} · {fmtTime(a.startTime)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {a.professionalName ?? "—"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {APPOINTMENT_TYPE_LABELS[a.type]} · {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
