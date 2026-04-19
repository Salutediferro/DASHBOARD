"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Stethoscope,
  UserRound,
} from "lucide-react";
import type {
  AppointmentType,
  ProfessionalRole,
} from "@prisma/client";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isBefore, addMonths, subMonths } from "date-fns";
import { it } from "date-fns/locale";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  APPOINTMENT_TYPES,
  APPOINTMENT_TYPE_LABELS,
} from "@/lib/validators/appointment";
import { SlotPicker } from "./slot-picker";
import { useCreateAppointment } from "@/lib/hooks/use-appointments";
import { useFreeSlots, type FreeSlot } from "@/lib/hooks/use-availability";
import { cn } from "@/lib/utils";

type Professional = {
  relationshipId: string;
  professionalRole: ProfessionalRole;
  professional: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
    specialties?: string | null;
  };
};

type PatientListItem = {
  patientId: string;
  patient: { id: string; fullName: string };
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "PATIENT" | "PROFESSIONAL";
  /** When mode=PROFESSIONAL: the current professional's role. */
  professionalRole?: ProfessionalRole;
  /** Pre-fill date and duration when the professional clicks an empty time slot. */
  initialStart?: string; // ISO string
  initialDurationMin?: number;
};

export function AppointmentForm(props: Props) {
  if (props.mode === "PATIENT") return <PatientBookingDialog {...props} />;
  return <ProfessionalCreateDialog {...props} />;
}

// ══════════════════════════════════════════════════════════════════════
// PATIENT booking wizard (4 steps)
// ══════════════════════════════════════════════════════════════════════

type Step = "professional" | "date" | "slot" | "confirm";

function PatientBookingDialog({
  open,
  onOpenChange,
}: Pick<Props, "open" | "onOpenChange">) {
  const create = useCreateAppointment();

  const [step, setStep] = React.useState<Step>("professional");
  const [professional, setProfessional] = React.useState<Professional | null>(
    null,
  );
  const [day, setDay] = React.useState<string>("");
  const [slot, setSlot] = React.useState<FreeSlot | null>(null);
  const [type, setType] = React.useState<AppointmentType>("VIDEO_CALL");
  const [notes, setNotes] = React.useState("");
  const [lastCreatedId, setLastCreatedId] = React.useState<string | null>(null);

  // Reset on close
  React.useEffect(() => {
    if (open) return;
    // A small delay so the dialog content doesn't visually "blink".
    const t = window.setTimeout(() => {
      setStep("professional");
      setProfessional(null);
      setDay("");
      setSlot(null);
      setNotes("");
      setType("VIDEO_CALL");
      setLastCreatedId(null);
    }, 160);
    return () => window.clearTimeout(t);
  }, [open]);

  const { data: professionals = [], isLoading: proLoading } = useQuery<
    Professional[]
  >({
    queryKey: ["me", "professionals"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/me/professionals", { cache: "no-store" });
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });

  // Skip the "professional" step if there's only one linked.
  React.useEffect(() => {
    if (!open) return;
    if (step !== "professional") return;
    if (professionals.length === 1 && !professional) {
      setProfessional(professionals[0]);
      setStep("date");
    }
  }, [professionals, open, step, professional]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!professional || !slot) throw new Error("Selezione incompleta");
      return create.mutateAsync({
        professionalId: professional.professional.id,
        professionalRole: professional.professionalRole,
        startTime: slot.start,
        endTime: slot.end,
        type,
        notes: notes || null,
      });
    },
    onSuccess: (apt) => {
      setLastCreatedId(apt.id);
      toast.success("Prenotazione confermata");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canBack = step !== "professional" && !lastCreatedId;
  const stepIndex = stepOrder.indexOf(step);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl md:max-w-2xl">
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <DialogTitle>Prenota un appuntamento</DialogTitle>
          <DialogDescription>
            Segui i passaggi: scegli il professionista, il giorno, l&apos;orario e
            conferma.
          </DialogDescription>
          {!lastCreatedId && <StepIndicator index={stepIndex} />}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {lastCreatedId ? (
            <SuccessState
              appointmentId={lastCreatedId}
              professional={professional!}
              slot={slot!}
              onClose={() => onOpenChange(false)}
            />
          ) : step === "professional" ? (
            <ProfessionalStep
              loading={proLoading}
              professionals={professionals}
              selected={professional}
              onSelect={(p) => {
                setProfessional(p);
                setStep("date");
              }}
            />
          ) : step === "date" ? (
            <DateStep
              professionalId={professional?.professional.id ?? null}
              value={day}
              onSelect={(d) => {
                setDay(d);
                setSlot(null);
                setStep("slot");
              }}
            />
          ) : step === "slot" ? (
            <SlotStep
              professionalId={professional?.professional.id ?? null}
              date={day}
              value={slot}
              onChange={setSlot}
            />
          ) : (
            <ConfirmStep
              professional={professional!}
              slot={slot!}
              type={type}
              onTypeChange={setType}
              notes={notes}
              onNotesChange={setNotes}
            />
          )}
        </div>

        {!lastCreatedId && (
          <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-card/60 px-5 py-3">
            <Button
              type="button"
              variant="ghost"
              disabled={!canBack}
              onClick={() => setStep(stepOrder[Math.max(0, stepIndex - 1)])}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Indietro
            </Button>
            {step === "confirm" ? (
              <Button
                type="button"
                onClick={() => submit.mutate()}
                disabled={submit.isPending || !professional || !slot}
                aria-busy={submit.isPending}
              >
                {submit.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CalendarCheck className="mr-2 h-4 w-4" />
                )}
                Conferma prenotazione
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!canAdvance(step, { professional, day, slot })}
                onClick={() =>
                  setStep(stepOrder[Math.min(stepOrder.length - 1, stepIndex + 1)])
                }
              >
                Avanti <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const stepOrder: Step[] = ["professional", "date", "slot", "confirm"];

function canAdvance(
  step: Step,
  s: {
    professional: Professional | null;
    day: string;
    slot: FreeSlot | null;
  },
): boolean {
  switch (step) {
    case "professional":
      return !!s.professional;
    case "date":
      return !!s.day;
    case "slot":
      return !!s.slot;
    case "confirm":
      return true;
  }
}

function StepIndicator({ index }: { index: number }) {
  const labels = ["Professionista", "Giorno", "Orario", "Conferma"];
  return (
    <ol className="mt-3 flex items-center gap-2" aria-label="Passi prenotazione">
      {labels.map((lbl, i) => {
        const done = i < index;
        const active = i === index;
        return (
          <li key={lbl} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                active
                  ? "bg-primary text-primary-foreground"
                  : done
                    ? "bg-primary-500/20 text-primary-500"
                    : "bg-muted text-muted-foreground",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden truncate text-xs sm:inline",
                active
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {lbl}
            </span>
            {i < labels.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "hidden h-px flex-1 sm:block",
                  i < index ? "bg-primary-500/50" : "bg-border/60",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── Step 1: Professional ────────────────────────────────────────────────

function ProfessionalStep({
  loading,
  professionals,
  selected,
  onSelect,
}: {
  loading: boolean;
  professionals: Professional[];
  selected: Professional | null;
  onSelect: (p: Professional) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carico i tuoi professionisti…
      </div>
    );
  }
  if (professionals.length === 0) {
    return (
      <div className="surface-1 rounded-xl p-5 text-sm text-muted-foreground">
        Non hai ancora professionisti collegati. Chiedi al tuo medico o coach di
        instaurare una relazione di cura per prenotare un appuntamento.
      </div>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {professionals.map((p) => (
        <li key={p.professional.id}>
          <ProfessionalCard
            pro={p}
            active={selected?.professional.id === p.professional.id}
            onClick={() => onSelect(p)}
          />
        </li>
      ))}
    </ul>
  );
}

function ProfessionalCard({
  pro,
  active,
  onClick,
}: {
  pro: Professional;
  active: boolean;
  onClick: () => void;
}) {
  const initials = pro.professional.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus-ring surface-1 flex w-full flex-col gap-2 rounded-xl p-4 text-left transition-colors",
        active
          ? "border border-primary-500/40 bg-primary-500/5"
          : "hover:bg-muted/30",
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11">
          {pro.professional.avatarUrl && (
            <AvatarImage src={pro.professional.avatarUrl} />
          )}
          <AvatarFallback className="bg-primary/15 text-primary text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {pro.professional.fullName}
          </p>
          <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            {pro.professionalRole === "DOCTOR" ? (
              <>
                <Stethoscope className="h-3 w-3" aria-hidden /> Medico
              </>
            ) : (
              <>
                <UserRound className="h-3 w-3" aria-hidden /> Coach
              </>
            )}
          </p>
        </div>
      </div>
      {pro.professional.specialties && (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {pro.professional.specialties}
        </p>
      )}
      <NextSlotHint professionalId={pro.professional.id} />
    </button>
  );
}

function NextSlotHint({ professionalId }: { professionalId: string }) {
  const from = new Date();
  const to = addDays(from, 30);
  const { data = [], isLoading } = useFreeSlots({
    professionalId,
    from: from.toISOString(),
    to: to.toISOString(),
    durationMin: 30,
    enabled: !!professionalId,
  });
  if (isLoading) {
    return (
      <p className="text-[11px] text-muted-foreground/80">
        Verifico disponibilità…
      </p>
    );
  }
  const first = data[0];
  if (!first) {
    return (
      <p className="text-[11px] text-muted-foreground/80">
        Nessuna disponibilità nei prossimi 30 giorni
      </p>
    );
  }
  return (
    <p className="inline-flex items-center gap-1 text-[11px] text-primary-500">
      <CalendarClock className="h-3 w-3" aria-hidden />
      Prossima disponibilità: {formatWhenShort(first.start)}
    </p>
  );
}

function formatWhenShort(iso: string) {
  return format(new Date(iso), "EEE d MMM 'alle' HH:mm", { locale: it });
}

// ── Step 2: Date (monthly calendar) ────────────────────────────────────

function DateStep({
  professionalId,
  value,
  onSelect,
}: {
  professionalId: string | null;
  value: string;
  onSelect: (isoDate: string) => void;
}) {
  const [month, setMonth] = React.useState<Date>(() => new Date());
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  // Fetch free slots for the whole visible grid, to highlight available days.
  const { data: slots = [], isLoading } = useFreeSlots({
    professionalId: professionalId ?? "",
    from: gridStart.toISOString(),
    to: addDays(gridEnd, 1).toISOString(),
    durationMin: 30,
    enabled: !!professionalId,
  });

  const availableDays = React.useMemo(() => {
    const set = new Set<string>();
    for (const s of slots) set.add(format(new Date(s.start), "yyyy-MM-dd"));
    return set;
  }, [slots]);

  const today = new Date();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-display text-base capitalize">
          {format(month, "MMMM yyyy", { locale: it })}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth(subMonths(month, 1))}
            aria-label="Mese precedente"
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMonth(new Date())}
            className="focus-ring rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Oggi
          </button>
          <button
            type="button"
            onClick={() => setMonth(addMonths(month, 1))}
            aria-label="Mese successivo"
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
        {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-1"
        role="grid"
        aria-label={`Calendario ${format(month, "MMMM yyyy", { locale: it })}`}
      >
        {days.map((d) => {
          const iso = format(d, "yyyy-MM-dd");
          const inMonth = isSameMonth(d, month);
          const isToday = isSameDay(d, today);
          const selected = value === iso;
          const past = isBefore(d, new Date(today.toDateString()));
          const available = availableDays.has(iso);
          const disabled = past || !available || !inMonth;
          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              aria-selected={selected}
              aria-label={format(d, "EEEE d MMMM yyyy", { locale: it })}
              disabled={disabled}
              onClick={() => onSelect(iso)}
              className={cn(
                "focus-ring relative aspect-square rounded-lg text-sm tabular-nums transition-colors",
                !inMonth && "text-muted-foreground/30",
                disabled && "cursor-not-allowed text-muted-foreground/40",
                !disabled && "hover:bg-primary-500/10",
                available && !selected && inMonth && !past && "bg-primary-500/10",
                isToday && !selected && "ring-2 ring-primary-500/60",
                selected &&
                  "bg-primary text-primary-foreground shadow-[0_0_0_3px_rgba(178,34,34,0.25)]",
              )}
            >
              <span className="absolute inset-0 flex items-center justify-center">
                {format(d, "d")}
              </span>
              {available && !selected && (
                <span
                  aria-hidden
                  className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary-500"
                />
              )}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <p className="text-xs text-muted-foreground">
          Verifico la disponibilità del mese…
        </p>
      )}
      {!isLoading && availableDays.size === 0 && (
        <p className="text-xs text-muted-foreground">
          Nessun giorno disponibile in questo mese — prova il mese successivo.
        </p>
      )}
    </div>
  );
}

// ── Step 3: Slot ────────────────────────────────────────────────────────

function SlotStep({
  professionalId,
  date,
  value,
  onChange,
}: {
  professionalId: string | null;
  date: string;
  value: FreeSlot | null;
  onChange: (s: FreeSlot | null) => void;
}) {
  const dayLabel = date
    ? format(new Date(`${date}T00:00:00`), "EEEE d MMMM yyyy", { locale: it })
    : "";
  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Orari disponibili
        </p>
        <p className="mt-0.5 text-display text-base capitalize">{dayLabel}</p>
      </header>
      <SlotPicker
        professionalId={professionalId}
        date={date}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

// ── Step 4: Confirm ─────────────────────────────────────────────────────

function ConfirmStep({
  professional,
  slot,
  type,
  onTypeChange,
  notes,
  onNotesChange,
}: {
  professional: Professional;
  slot: FreeSlot;
  type: AppointmentType;
  onTypeChange: (t: AppointmentType) => void;
  notes: string;
  onNotesChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <section className="surface-2 flex flex-col gap-2 rounded-xl p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Riepilogo
        </p>
        <p className="text-display text-lg capitalize">
          {format(new Date(slot.start), "EEEE d MMMM yyyy", { locale: it })}
        </p>
        <p className="text-sm text-muted-foreground">
          dalle {format(new Date(slot.start), "HH:mm", { locale: it })} alle{" "}
          {format(new Date(slot.end), "HH:mm", { locale: it })}
        </p>
        <div className="mt-2 flex items-center gap-3 border-t border-border/60 pt-3">
          <Avatar className="h-9 w-9">
            {professional.professional.avatarUrl && (
              <AvatarImage src={professional.professional.avatarUrl} />
            )}
            <AvatarFallback className="bg-primary/15 text-primary text-xs">
              {professional.professional.fullName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">
              {professional.professional.fullName}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {professional.professionalRole === "DOCTOR" ? "Medico" : "Coach"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-1.5">
        <Label htmlFor="apt-type">Tipo di visita</Label>
        <Select
          value={type}
          onValueChange={(v) => onTypeChange(v as AppointmentType)}
        >
          <SelectTrigger id="apt-type" className="focus-ring">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {APPOINTMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {APPOINTMENT_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="apt-notes">Note (opzionale)</Label>
        <Textarea
          id="apt-notes"
          rows={3}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Cosa vorresti affrontare in questo incontro?"
          className="focus-ring resize-none"
        />
      </div>
    </div>
  );
}

// ── Success state ───────────────────────────────────────────────────────

function SuccessState({
  appointmentId,
  professional,
  slot,
  onClose,
}: {
  appointmentId: string;
  professional: Professional;
  slot: FreeSlot;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <span
        aria-hidden
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-500/15 text-primary-500"
      >
        <CalendarCheck className="h-7 w-7" />
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="text-display text-lg">Appuntamento prenotato</h3>
        <p className="text-sm text-muted-foreground">
          {format(new Date(slot.start), "EEEE d MMMM 'alle' HH:mm", {
            locale: it,
          })}{" "}
          con {professional.professional.fullName}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <a
          href={`/api/appointments/${appointmentId}/ics`}
          download
          className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-md border border-border/60 bg-card px-3 text-xs font-medium transition-colors hover:bg-muted"
        >
          <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
          Aggiungi al calendario
        </a>
        <Button type="button" onClick={onClose} size="sm">
          Chiudi
        </Button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// PROFESSIONAL create dialog (unchanged logic, refreshed chrome)
// ══════════════════════════════════════════════════════════════════════

function ProfessionalCreateDialog({
  open,
  onOpenChange,
  initialStart,
  initialDurationMin,
}: Pick<Props, "open" | "onOpenChange" | "initialStart" | "initialDurationMin">) {
  const create = useCreateAppointment();

  const [type, setType] = React.useState<AppointmentType>("VISIT");
  const [notes, setNotes] = React.useState("");
  const [meetingUrl, setMeetingUrl] = React.useState("");
  const [pickedPatientId, setPickedPatientId] = React.useState<string>("");
  const [startLocal, setStartLocal] = React.useState<string>("");
  const [durationMin, setDurationMin] = React.useState<number>(30);

  React.useEffect(() => {
    if (!open) {
      setNotes("");
      setMeetingUrl("");
      setPickedPatientId("");
      setStartLocal("");
      setType("VISIT");
      return;
    }
    if (initialStart) {
      const d = new Date(initialStart);
      const pad = (n: number) => String(n).padStart(2, "0");
      setStartLocal(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
    }
    if (initialDurationMin) setDurationMin(initialDurationMin);
  }, [open, initialStart, initialDurationMin]);

  const { data: myPatients } = useQuery<{
    items: PatientListItem[];
    total: number;
  }>({
    queryKey: ["my-patients"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/clients?status=ACTIVE&perPage=100");
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });
  const patientItems = myPatients?.items ?? [];

  const save = useMutation({
    mutationFn: async () => {
      if (!pickedPatientId || !startLocal) {
        throw new Error("Seleziona paziente e orario");
      }
      const startDate = new Date(startLocal);
      return create.mutateAsync({
        patientId: pickedPatientId,
        startTime: startDate.toISOString(),
        durationMin,
        type,
        notes: notes || null,
        meetingUrl: meetingUrl || null,
      });
    },
    onSuccess: () => {
      toast.success("Appuntamento creato");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuovo appuntamento</DialogTitle>
          <DialogDescription>
            Crea manualmente un appuntamento per uno dei tuoi assistiti.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label>Paziente</Label>
            <Select
              value={pickedPatientId}
              onValueChange={(v) => setPickedPatientId(v ?? "")}
            >
              <SelectTrigger className="focus-ring">
                <SelectValue placeholder="Seleziona…" />
              </SelectTrigger>
              <SelectContent>
                {patientItems.length === 0 && (
                  <SelectItem value="__none" disabled>
                    Nessun paziente attivo
                  </SelectItem>
                )}
                {patientItems.map((rel) => (
                  <SelectItem key={rel.patientId} value={rel.patientId}>
                    {rel.patient.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="start">Data e ora</Label>
              <Input
                id="start"
                type="datetime-local"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
                className="focus-ring"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dur">Durata (min)</Label>
              <Select
                value={String(durationMin)}
                onValueChange={(v) => setDurationMin(Number(v))}
              >
                <SelectTrigger id="dur" className="focus-ring">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60, 90, 120].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Tipo</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as AppointmentType)}
            >
              <SelectTrigger className="focus-ring">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {APPOINTMENT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "VIDEO_CALL" && (
            <div className="grid gap-1.5">
              <Label htmlFor="meet">Link meeting (opzionale)</Label>
              <Input
                id="meet"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.example.com/xyz"
                className="focus-ring"
              />
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="pro-notes">Note</Label>
            <Textarea
              id="pro-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="focus-ring resize-none"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => save.mutate()}
              disabled={save.isPending}
            >
              {save.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Crea appuntamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
