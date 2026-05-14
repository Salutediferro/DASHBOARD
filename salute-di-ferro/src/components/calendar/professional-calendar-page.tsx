"use client";

import * as React from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import type { ProfessionalRole } from "@prisma/client";

import PageHeader from "@/components/brand/page-header";
import SectionHeader from "@/components/brand/section-header";
import { Button } from "@/components/ui/button";
import { CalendarView } from "@/components/calendar/calendar-view";
import { AppointmentForm } from "@/components/calendar/appointment-form";
import { AppointmentDetail } from "@/components/calendar/appointment-detail";
import {
  useAcceptAppointmentRequest,
  useAppointments,
  useDeclineAppointmentRequest,
  type AppointmentDTO,
} from "@/lib/hooks/use-appointments";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/validators/appointment";

type Props = {
  role: ProfessionalRole;
};

function fmtRequestWhen(iso: string) {
  return format(new Date(iso), "EEE d MMM 'alle' HH:mm", { locale: it });
}

/**
 * Shared professional calendar page used by both DOCTOR and COACH
 * dashboards. Surfaces the inbox of PENDING requests at the top so the
 * pro can accept/decline without hunting in the grid, and only shows
 * confirmed (non-PENDING) appointments inside the week/day calendar.
 */
export function ProfessionalCalendarPage({ role }: Props) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<AppointmentDTO | null>(null);
  const [initialStart, setInitialStart] = React.useState<string | undefined>();
  const { data: all = [] } = useAppointments();

  const openCreate = React.useCallback((iso?: string) => {
    setInitialStart(iso);
    setCreateOpen(true);
  }, []);

  const nowIso = React.useMemo(() => new Date().toISOString(), []);
  // Sort upcoming pending requests by time, soonest first. Past PENDING
  // requests (slot already gone by) drop off — they are stale and the
  // pro should not be asked to act on them; the daily cleanup or a
  // manual decline will take care of them.
  const pending = React.useMemo(
    () =>
      all
        .filter((a) => a.status === "PENDING" && a.startTime >= nowIso)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [all, nowIso],
  );
  // Calendar grid shows everything that is NOT a pending request —
  // confirmed sessions, completed history, declines/cancellations.
  // Pending requests live in the inbox above; mixing them in the grid
  // would make them look confirmed.
  const gridAppointments = React.useMemo(
    () => all.filter((a) => a.status !== "PENDING"),
    [all],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendario"
        description="L'agenda dei tuoi appuntamenti. Clicca un'ora libera per aggiungerne uno manualmente."
        className="-mx-4 -mt-4 md:-mx-8 md:-mt-8"
        actions={
          <button
            type="button"
            onClick={() => openCreate(undefined)}
            className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nuovo appuntamento
          </button>
        }
      />

      {pending.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader
            title="Richieste in attesa"
            subtitle={
              pending.length === 1
                ? "Una richiesta da gestire. Accettala per confermare lo slot al cliente."
                : `${pending.length} richieste da gestire. Accettale per confermare lo slot al cliente.`
            }
          />
          <ul className="flex flex-col gap-2">
            {pending.map((a) => (
              <PendingRequestRow
                key={a.id}
                appointment={a}
                onOpenDetail={() => setSelected(a)}
              />
            ))}
          </ul>
        </section>
      )}

      <CalendarView
        appointments={gridAppointments}
        onSelect={setSelected}
        onEmptySlotClick={openCreate}
      />

      <AppointmentForm
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v);
          if (!v) setInitialStart(undefined);
        }}
        mode="PROFESSIONAL"
        professionalRole={role}
        initialStart={initialStart}
      />
      <AppointmentDetail
        appointment={selected}
        onClose={() => setSelected(null)}
        onUpdated={setSelected}
        professional
        asSheet
      />
    </div>
  );
}

/**
 * Single PENDING request card in the inbox. Inline Accept/Decline so the
 * pro never has to open the detail sheet for the common case. The whole
 * row is clickable (opens the detail sheet) for cases where the pro
 * needs to read the notes before deciding — the buttons stop propagation
 * to avoid double-firing.
 */
function PendingRequestRow({
  appointment,
  onOpenDetail,
}: {
  appointment: AppointmentDTO;
  onOpenDetail: () => void;
}) {
  const accept = useAcceptAppointmentRequest();
  const decline = useDeclineAppointmentRequest();
  const busy = accept.isPending || decline.isPending;

  async function doAccept(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await accept.mutateAsync(appointment.id);
      toast.success("Richiesta accettata");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  async function doDecline(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Rifiutare questa richiesta? L'orario torna libero.")) return;
    try {
      await decline.mutateAsync(appointment.id);
      toast.success("Richiesta rifiutata");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpenDetail}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenDetail();
          }
        }}
        className="surface-2 focus-ring flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-left transition-colors hover:bg-amber-500/10"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              In attesa
            </span>
            <span className="truncate text-sm font-medium">
              {appointment.patientName ?? "Cliente"}
            </span>
          </div>
          <div className="mt-1 truncate text-xs capitalize text-muted-foreground">
            {fmtRequestWhen(appointment.startTime)} ·{" "}
            {APPOINTMENT_TYPE_LABELS[appointment.type]}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={doDecline}
            disabled={busy}
            aria-label={`Rifiuta richiesta da ${appointment.patientName ?? "cliente"}`}
          >
            {decline.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <X className="mr-1 h-4 w-4" />
                Rifiuta
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={doAccept}
            disabled={busy}
            aria-label={`Accetta richiesta da ${appointment.patientName ?? "cliente"}`}
          >
            {accept.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="mr-1 h-4 w-4" />
                Accetta
              </>
            )}
          </Button>
        </div>
      </div>
    </li>
  );
}
