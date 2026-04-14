"use client";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { AppointmentStatus } from "@prisma/client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useCancelAppointment,
  useUpdateAppointment,
  type AppointmentDTO,
} from "@/lib/hooks/use-appointments";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/validators/appointment";

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

        {appointment && (
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
          </div>
        )}

        <DialogFooter className="flex flex-wrap justify-end gap-2">
          {professional && appointment?.status === "SCHEDULED" && (
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
          {appointment?.status === "SCHEDULED" && (
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
