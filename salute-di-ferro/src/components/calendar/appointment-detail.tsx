"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
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
  useAcceptAppointmentRequest,
  useCancelAppointment,
  useDeclineAppointmentRequest,
  useUpdateAppointment,
  type AppointmentDTO,
} from "@/lib/hooks/use-appointments";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/validators/appointment";
import { AddToCalendarButtons } from "@/components/calendar/add-to-calendar-buttons";
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
  PENDING: "In attesa",
  SCHEDULED: "Confermato",
  COMPLETED: "Completato",
  CANCELED: "Annullato",
  NO_SHOW: "No-show",
};

const STATUS_TONE: Record<AppointmentStatus, string> = {
  PENDING:
    "bg-amber-500/15 text-amber-600 border-amber-500/40 dark:text-amber-400",
  SCHEDULED: "bg-primary-500/15 text-primary-500 border-primary-500/40",
  COMPLETED: "bg-success/15 text-success border-success/40",
  CANCELED: "bg-muted text-muted-foreground border-border",
  NO_SHOW: "bg-destructive/15 text-destructive border-destructive/40",
};

type Props = {
  appointment: AppointmentDTO | null;
  onClose: () => void;
  /**
   * Called when a mutation produces a new appointment state that should
   * keep the dialog/sheet open (e.g. after the professional accepts a
   * pending request, so they can add it to their calendar and paste
   * the Meet link). The parent should update its `selected` state so
   * the detail re-renders with the new appointment. If omitted, the
   * detail falls back to closing on every successful mutation —
   * preserving the previous behaviour for callers that don't care.
   */
  onUpdated?: (next: AppointmentDTO) => void;
  /** When true, show COMPLETED/NO_SHOW actions (professional view). */
  professional?: boolean;
  /** Render as side Sheet instead of centered Dialog (pro calendar). */
  asSheet?: boolean;
};

export function AppointmentDetail({
  appointment,
  onClose,
  onUpdated,
  professional,
  asSheet,
}: Props) {
  const update = useUpdateAppointment(appointment?.id ?? "");
  const cancel = useCancelAppointment();
  const accept = useAcceptAppointmentRequest();
  const decline = useDeclineAppointmentRequest();
  const [rescheduling, setRescheduling] = React.useState(false);
  const [newStart, setNewStart] = React.useState("");
  // Local draft for the meeting URL field shown to the professional
  // after they accept. Mirrors `appointment.meetingUrl`; the "Salva"
  // button is enabled only when the input diverges from the persisted
  // value.
  const [meetingUrlInput, setMeetingUrlInput] = React.useState("");

  React.useEffect(() => {
    if (!appointment) {
      setRescheduling(false);
      setNewStart("");
      setMeetingUrlInput("");
      return;
    }
    setMeetingUrlInput(appointment.meetingUrl ?? "");
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

  async function doAccept() {
    if (!appointment) return;
    try {
      const next = await accept.mutateAsync(appointment.id);
      toast.success("Richiesta accettata");
      // Keep the sheet open on the professional side so the doctor
      // can immediately add the appointment to their calendar and
      // paste the generated Meet link. If the caller didn't wire
      // `onUpdated`, fall back to the old close-on-success behaviour.
      if (onUpdated) {
        onUpdated(next);
      } else {
        onClose();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  async function saveMeetingUrl() {
    if (!appointment) return;
    const value = meetingUrlInput.trim();
    try {
      const next = await update.mutateAsync({
        meetingUrl: value === "" ? null : value,
      });
      toast.success(value === "" ? "Link rimosso" : "Link salvato");
      if (onUpdated) onUpdated(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  async function doDecline() {
    if (!appointment) return;
    if (!confirm("Rifiutare questa richiesta? L'orario torna libero.")) return;
    try {
      await decline.mutateAsync(appointment.id);
      toast.success("Richiesta rifiutata");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  const busy =
    update.isPending || cancel.isPending || accept.isPending || decline.isPending;

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
      {/* PENDING — show an explicit "awaiting approval" banner instead
          of meeting / calendar affordances. Until the pro accepts, the
          appointment is a request; the patient must not be encouraged
          to treat it as confirmed, and the pro must see at a glance
          that this slot is still waiting on them. */}
      {appointment.status === "PENDING" && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {professional
              ? "Richiesta in attesa: accetta per confermare lo slot al cliente e abilitare promemoria, link meeting e calendari."
              : "In attesa che il professionista accetti la tua richiesta. Riceverai promemoria e link meeting solo dopo la conferma."}
          </span>
        </div>
      )}

      {/* "Apri meeting" link is gated on SCHEDULED — never expose the
          meeting URL for a PENDING request. The professional gets a
          richer panel below (link + editor) so we hide the simple
          link in that case to avoid duplication. */}
      {appointment.meetingUrl &&
        appointment.status === "SCHEDULED" &&
        !professional && (
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

      {/* Professional, status SCHEDULED — the post-accept workspace:
          add to calendar (which generates the Meet) and paste the
          resulting link so the patient sees it on their side. */}
      {professional && appointment.status === "SCHEDULED" && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary-500/30 bg-primary-500/5 p-3">
          <p className="text-xs leading-relaxed text-foreground/85">
            Aggiungi l&apos;appuntamento al tuo calendario e attiva Google
            Meet per generare il link. Poi incollalo qui sotto e salva —
            il cliente lo vedrà subito nel suo dettaglio appuntamento.
          </p>
          <AddToCalendarButtons appointment={appointment} />
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="meet-url-input"
              className="text-[11px] uppercase tracking-wide text-muted-foreground"
            >
              Link meeting da condividere col cliente
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="meet-url-input"
                type="url"
                value={meetingUrlInput}
                onChange={(e) => setMeetingUrlInput(e.target.value)}
                placeholder="https://meet.google.com/…"
                className="focus-ring text-xs"
                disabled={update.isPending}
              />
              {appointment.meetingUrl && (
                <a
                  href={appointment.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex h-9 items-center justify-center rounded-md border border-border/60 bg-card px-2 text-xs font-medium transition-colors hover:bg-muted"
                  aria-label="Apri link salvato"
                  title="Apri link salvato"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              )}
              <Button
                type="button"
                size="sm"
                onClick={saveMeetingUrl}
                disabled={
                  update.isPending ||
                  meetingUrlInput.trim() === (appointment.meetingUrl ?? "")
                }
              >
                {update.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Salva"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Patient view, status SCHEDULED — same calendar affordance,
          without the Meet-link editor (the patient consumes the link
          but doesn't set it). */}
      {!professional && appointment.status === "SCHEDULED" && (
        <AddToCalendarButtons appointment={appointment} />
      )}
    </div>
  ) : null;

  const actions = (
    <>
      {!rescheduling && professional && appointment?.status === "PENDING" && (
        <>
          <Button
            type="button"
            variant="destructive"
            onClick={doDecline}
            disabled={busy}
          >
            {decline.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <X className="mr-1.5 h-4 w-4" />
            )}
            Rifiuta
          </Button>
          <Button type="button" onClick={doAccept} disabled={busy}>
            {accept.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-1.5 h-4 w-4" />
            )}
            Accetta
          </Button>
        </>
      )}
      {!rescheduling && !professional && appointment?.status === "PENDING" && (
        <Button
          type="button"
          variant="destructive"
          onClick={doCancel}
          disabled={busy}
        >
          <X className="mr-1.5 h-4 w-4" />
          Annulla richiesta
        </Button>
      )}
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
