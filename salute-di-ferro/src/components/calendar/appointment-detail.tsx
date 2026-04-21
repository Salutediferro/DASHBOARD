"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  UserX,
  Video,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { AppointmentStatus } from "@prisma/client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCancelAppointment,
  useUpdateAppointment,
  type AppointmentDTO,
} from "@/lib/hooks/use-appointments";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/validators/appointment";
import { cn } from "@/lib/utils";

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtLong(iso: string) {
  return format(new Date(iso), "EEEE d MMMM 'alle' HH:mm", { locale: it });
}

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: "Confermato",
  COMPLETED: "Completato",
  CANCELED: "Annullato",
  NO_SHOW: "No-show",
};

const STATUS_TONE: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-primary-500/15 text-primary-500 border-primary-500/40",
  COMPLETED: "bg-success/15 text-success border-success/40",
  CANCELED: "bg-muted text-muted-foreground border-border",
  NO_SHOW: "bg-destructive/15 text-destructive border-destructive/40",
};

type Props = {
  appointment: AppointmentDTO | null;
  onClose: () => void;
  /** When true, show COMPLETED/NO_SHOW actions (professional view). */
  professional?: boolean;
  /** Render as side Sheet instead of centered Dialog (pro calendar). */
  asSheet?: boolean;
};

export function AppointmentDetail({
  appointment,
  onClose,
  professional,
  asSheet,
}: Props) {
  const update = useUpdateAppointment(appointment?.id ?? "");
  const cancel = useCancelAppointment();
  const [rescheduling, setRescheduling] = React.useState(false);
  const [newStart, setNewStart] = React.useState("");

  React.useEffect(() => {
    if (!appointment) {
      setRescheduling(false);
      setNewStart("");
    }
  }, [appointment]);

  async function saveReschedule() {
    if (!appointment || !newStart) return;
    try {
      const iso = new Date(newStart).toISOString();
      await update.mutateAsync({ startTime: iso });
      toast.success("Appuntamento spostato");
      setRescheduling(false);
      setNewStart("");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  async function setStatus(status: AppointmentStatus) {
    if (!appointment) return;
    try {
      await update.mutateAsync({ status });
      toast.success("Stato aggiornato");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  async function doCancel() {
    if (!appointment) return;
    if (!confirm("Annullare questo appuntamento? L'orario torna libero.")) return;
    try {
      await cancel.mutateAsync(appointment.id);
      toast.success("Appuntamento annullato");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  const busy = update.isPending || cancel.isPending;

  const body = appointment && rescheduling ? (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-start">Nuova data e ora</Label>
        <Input
          id="new-start"
          type="datetime-local"
          value={newStart}
          onChange={(e) => setNewStart(e.target.value)}
          className="focus-ring"
        />
        <p className="text-xs text-muted-foreground">
          La durata resta invariata. Se l&apos;orario non è disponibile
          riceverai un errore di sovrapposizione.
        </p>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setRescheduling(false)}
          disabled={update.isPending}
        >
          Indietro
        </Button>
        <Button
          type="button"
          onClick={saveReschedule}
          disabled={update.isPending || !newStart}
        >
          {update.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Conferma nuovo orario
        </Button>
      </div>
    </div>
  ) : appointment && !rescheduling ? (
    <div className="flex flex-col gap-3 text-sm">
      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
          STATUS_TONE[appointment.status],
        )}
      >
        {STATUS_LABEL[appointment.status]}
      </span>
      <p className="text-display text-lg capitalize">
        {fmtLong(appointment.startTime)}
      </p>
      <dl className="grid gap-1.5 rounded-xl border border-border/60 bg-muted/20 p-3 text-sm">
        <Row label="Cliente" value={appointment.patientName ?? "—"} />
        <Row
          label="Professionista"
          value={appointment.professionalName ?? "—"}
        />
        <Row label="Tipo" value={APPOINTMENT_TYPE_LABELS[appointment.type]} />
        {appointment.notes && (
          <div className="mt-1 border-t border-border/60 pt-2">
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Note
            </dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-sm">
              {appointment.notes}
            </dd>
          </div>
        )}
      </dl>
      {appointment.meetingUrl && (
        <a
          className="focus-ring inline-flex w-fit items-center gap-1.5 rounded-md border border-border/60 bg-card px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
          href={appointment.meetingUrl}
          target="_blank"
          rel="noreferrer"
        >
          <Video className="h-3.5 w-3.5" aria-hidden />
          Apri meeting
        </a>
      )}
      {appointment.status === "SCHEDULED" && (
        <a
          className="focus-ring inline-flex w-fit items-center gap-1.5 rounded-md border border-border/60 bg-card px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
          href={`/api/appointments/${appointment.id}/ics`}
          download
        >
          <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
          Aggiungi al calendario
        </a>
      )}
    </div>
  ) : null;

  const actions = (
    <>
      {!rescheduling && appointment?.status === "SCHEDULED" && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setNewStart(toLocalInput(appointment.startTime));
            setRescheduling(true);
          }}
          disabled={busy}
        >
          <CalendarClock className="mr-1.5 h-4 w-4" />
          Riprogramma
        </Button>
      )}
      {!rescheduling &&
        professional &&
        appointment?.status === "SCHEDULED" && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatus("NO_SHOW")}
              disabled={busy}
            >
              <UserX className="mr-1.5 h-4 w-4" />
              No-show
            </Button>
            <Button
              type="button"
              onClick={() => setStatus("COMPLETED")}
              disabled={busy}
            >
              {update.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
              )}
              Completato
            </Button>
          </>
        )}
      {!rescheduling && appointment?.status === "SCHEDULED" && (
        <Button
          type="button"
          variant="destructive"
          onClick={doCancel}
          disabled={busy}
        >
          <X className="mr-1.5 h-4 w-4" />
          Annulla
        </Button>
      )}
    </>
  );

  if (asSheet) {
    return (
      <Sheet
        open={!!appointment}
        onOpenChange={(open) => !open && onClose()}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col overflow-y-auto sm:max-w-md"
        >
          <SheetHeader className="border-b border-border/60">
            <SheetTitle>Dettagli appuntamento</SheetTitle>
            <SheetDescription>
              Riprogramma, completa o annulla l&apos;incontro.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 px-4 py-5">{body}</div>
          {!rescheduling && (
            <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t border-border/60">
              {actions}
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog
      open={!!appointment}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appuntamento</DialogTitle>
        </DialogHeader>
        {body}
        {!rescheduling && (
          <DialogFooter className="flex flex-wrap justify-end gap-2">
            {actions}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="truncate text-sm font-medium">{value}</dd>
    </div>
  );
}
