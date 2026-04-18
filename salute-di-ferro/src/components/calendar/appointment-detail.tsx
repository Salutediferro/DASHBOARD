"use client";

import * as React from "react";
import { toast } from "sonner";
import { CalendarClock, CalendarPlus, Loader2 } from "lucide-react";
import type { AppointmentStatus } from "@prisma/client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCancelAppointment,
  useUpdateAppointment,
  type AppointmentDTO,
} from "@/lib/hooks/use-appointments";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/validators/appointment";

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
  appointment: AppointmentDTO | null;
  onClose: () => void;
  /** When true, show COMPLETED/NO_SHOW actions (professional view). */
  professional?: boolean;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AppointmentDetail({
  appointment,
  onClose,
  professional,
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
    if (!confirm("Annullare questo appuntamento?")) return;
    try {
      await cancel.mutateAsync(appointment.id);
      toast.success("Appuntamento annullato");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  const busy = update.isPending || cancel.isPending;

  return (
    <Dialog
      open={!!appointment}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appuntamento</DialogTitle>
        </DialogHeader>

        {appointment && rescheduling && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-start">Nuova data e ora</Label>
              <Input
                id="new-start"
                type="datetime-local"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
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
        )}

        {appointment && !rescheduling && (
          <div className="flex flex-col gap-2 text-sm">
            <p>
              <span className="text-muted-foreground">Quando:</span>{" "}
              <span className="font-medium">{fmt(appointment.startTime)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Paziente:</span>{" "}
              <span className="font-medium">
                {appointment.patientName ?? "—"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Professionista:</span>{" "}
              <span className="font-medium">
                {appointment.professionalName ?? "—"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Tipo:</span>{" "}
              {APPOINTMENT_TYPE_LABELS[appointment.type]}
            </p>
            <p>
              <span className="text-muted-foreground">Stato:</span>{" "}
              {appointment.status}
            </p>
            {appointment.notes && (
              <p className="border-border mt-2 rounded-md border p-2 text-xs whitespace-pre-wrap">
                {appointment.notes}
              </p>
            )}
            {appointment.meetingUrl && (
              <a
                className="text-primary text-xs hover:underline"
                href={appointment.meetingUrl}
                target="_blank"
                rel="noreferrer"
              >
                Apri meeting
              </a>
            )}
            {appointment.status === "SCHEDULED" && (
              <a
                className="text-primary inline-flex w-fit items-center gap-1 text-xs hover:underline"
                href={`/api/appointments/${appointment.id}/ics`}
                download
              >
                <CalendarPlus className="h-3 w-3" />
                Aggiungi al calendario
              </a>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-wrap justify-end gap-2">
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
              <CalendarClock className="mr-2 h-4 w-4" />
              Sposta
            </Button>
          )}
          {!rescheduling && professional && appointment?.status === "SCHEDULED" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStatus("NO_SHOW")}
                disabled={busy}
              >
                No-show
              </Button>
              <Button
                type="button"
                onClick={() => setStatus("COMPLETED")}
                disabled={busy}
              >
                {update.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Completa
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
              Annulla
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
