"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type {
  AppointmentType,
  ProfessionalRole,
} from "@prisma/client";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  APPOINTMENT_TYPES,
  APPOINTMENT_TYPE_LABELS,
  PROFESSIONAL_ROLES,
} from "@/lib/validators/appointment";
import { SlotPicker } from "./slot-picker";
import { useCreateAppointment } from "@/lib/hooks/use-appointments";
import type { FreeSlot } from "@/lib/hooks/use-availability";

type Professional = {
  relationshipId: string;
  professionalRole: ProfessionalRole;
  professional: { id: string; fullName: string; email: string; role: string };
};

type PatientListItem = {
  patientId: string;
  patient: { id: string; fullName: string };
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "PATIENT" | "PROFESSIONAL";
  /** When mode=PROFESSIONAL: the current professional's role (DOCTOR|COACH). */
  professionalRole?: ProfessionalRole;
};

/**
 * Appointment creation form, used by both the patient booking flow and
 * the professional manual creation flow. Submits to POST /api/appointments.
 *
 * PATIENT mode: pick (role, professional) → pick slot → type + notes
 * PROFESSIONAL mode: pick patient → date/time → type + notes
 */
export function AppointmentForm({
  open,
  onOpenChange,
  mode,
  professionalRole,
}: Props) {
  const create = useCreateAppointment();

  // shared
  const [type, setType] = React.useState<AppointmentType>(
    mode === "PATIENT" ? "VIDEO_CALL" : "VISIT",
  );
  const [notes, setNotes] = React.useState("");
  const [meetingUrl, setMeetingUrl] = React.useState("");

  // patient mode
  const [pickedRole, setPickedRole] =
    React.useState<ProfessionalRole>("DOCTOR");
  const [pickedProfessionalId, setPickedProfessionalId] =
    React.useState<string>("");
  const [slot, setSlot] = React.useState<FreeSlot | null>(null);

  // professional mode
  const [pickedPatientId, setPickedPatientId] = React.useState<string>("");
  const [startLocal, setStartLocal] = React.useState<string>("");
  const [durationMin, setDurationMin] = React.useState<number>(30);

  React.useEffect(() => {
    if (!open) {
      setNotes("");
      setMeetingUrl("");
      setSlot(null);
      setPickedProfessionalId("");
      setPickedPatientId("");
      setStartLocal("");
    }
  }, [open]);

  // Patient mode: their active professionals.
  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ["me", "professionals"],
    enabled: open && mode === "PATIENT",
    queryFn: async () => {
      const res = await fetch("/api/me/professionals", { cache: "no-store" });
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });

  const filteredProfessionals = professionals.filter(
    (p) => p.professionalRole === pickedRole,
  );

  // Professional mode: the caller's active patients.
  const { data: myPatients } = useQuery<{
    items: PatientListItem[];
    total: number;
  }>({
    queryKey: ["my-patients"],
    enabled: open && mode === "PROFESSIONAL",
    queryFn: async () => {
      const res = await fetch("/api/clients?status=ACTIVE&perPage=100");
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });
  const patientItems = myPatients?.items ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (mode === "PATIENT") {
        if (!pickedProfessionalId || !slot) {
          throw new Error("Seleziona professionista e slot");
        }
        return create.mutateAsync({
          professionalId: pickedProfessionalId,
          professionalRole: pickedRole,
          startTime: slot.start,
          endTime: slot.end,
          type,
          notes: notes || null,
          meetingUrl: meetingUrl || null,
        });
      }
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuovo appuntamento</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {mode === "PATIENT" && (
            <>
              <div className="grid gap-2">
                <Label>Con chi</Label>
                <Select
                  value={pickedRole}
                  onValueChange={(v) => {
                    setPickedRole(v as ProfessionalRole);
                    setPickedProfessionalId("");
                    setSlot(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFESSIONAL_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r === "DOCTOR" ? "Medico" : "Coach"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Professionista</Label>
                <Select
                  value={pickedProfessionalId}
                  onValueChange={(v) => {
                    setPickedProfessionalId(v ?? "");
                    setSlot(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona…" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProfessionals.length === 0 && (
                      <SelectItem value="__none" disabled>
                        Nessuno disponibile
                      </SelectItem>
                    )}
                    {filteredProfessionals.map((p) => (
                      <SelectItem
                        key={p.professional.id}
                        value={p.professional.id}
                      >
                        {p.professional.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <SlotPicker
                professionalId={pickedProfessionalId || null}
                value={slot}
                onChange={setSlot}
              />
            </>
          )}

          {mode === "PROFESSIONAL" && (
            <>
              <div className="grid gap-2">
                <Label>Paziente</Label>
                <Select
                  value={pickedPatientId}
                  onValueChange={(v) => setPickedPatientId(v ?? "")}
                >
                  <SelectTrigger>
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
                <div className="grid gap-2">
                  <Label htmlFor="start">Data e ora</Label>
                  <Input
                    id="start"
                    type="datetime-local"
                    value={startLocal}
                    onChange={(e) => setStartLocal(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dur">Durata (min)</Label>
                  <Select
                    value={String(durationMin)}
                    onValueChange={(v) => setDurationMin(Number(v))}
                  >
                    <SelectTrigger id="dur">
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
            </>
          )}

          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as AppointmentType)}
            >
              <SelectTrigger>
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
            <div className="grid gap-2">
              <Label htmlFor="meet">Link meeting (opzionale)</Label>
              <Input
                id="meet"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.example.com/xyz"
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {mode === "PATIENT" ? "Prenota" : "Crea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
