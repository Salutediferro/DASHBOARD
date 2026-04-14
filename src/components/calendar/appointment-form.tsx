"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type {
  Appointment,
  AppointmentType,
} from "@/lib/appointments";
import type { ClientListItem } from "@/lib/mock-clients";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialStart: Date | null;
  existing: Appointment | null;
};

const DURATIONS = [30, 45, 60, 90];

function toLocalInput(d: Date) {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export function AppointmentForm({
  open,
  onOpenChange,
  initialStart,
  existing,
}: Props) {
  const qc = useQueryClient();

  const [clientId, setClientId] = React.useState("");
  const [clientName, setClientName] = React.useState("");
  const [start, setStart] = React.useState("");
  const [duration, setDuration] = React.useState(60);
  const [type, setType] = React.useState<AppointmentType>("IN_PERSON");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (existing) {
      setClientId(existing.clientId);
      setClientName(existing.clientName);
      setStart(toLocalInput(new Date(existing.startTime)));
      const d = Math.round(
        (new Date(existing.endTime).getTime() -
          new Date(existing.startTime).getTime()) /
          60000,
      );
      setDuration(d);
      setType(existing.type);
      setNotes(existing.notes ?? "");
    } else if (initialStart) {
      setStart(toLocalInput(initialStart));
      setClientId("");
      setClientName("");
      setType("IN_PERSON");
      setDuration(60);
      setNotes("");
    }
  }, [existing, initialStart, open]);

  const { data: clientsData } = useQuery<{
    items: ClientListItem[];
    total: number;
  }>({
    queryKey: ["clients-for-calendar"],
    queryFn: async () => {
      const res = await fetch("/api/clients?status=ACTIVE&perPage=100");
      return res.json();
    },
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const startDate = new Date(start);
      const endDate = new Date(startDate.getTime() + duration * 60000);
      const payload = {
        clientId,
        clientName,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        type,
        notes: notes || null,
        meetingUrl:
          type === "VIDEO_CALL" ? "https://meet.example.com/demo" : null,
      };
      const url = existing
        ? `/api/appointments/${existing.id}`
        : "/api/appointments";
      const res = await fetch(url, {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      return res.json();
    },
    onSuccess: () => {
      toast.success(existing ? "Appuntamento aggiornato" : "Appuntamento creato");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!existing) return;
      const res = await fetch(`/api/appointments/${existing.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      toast.success("Appuntamento eliminato");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {existing ? "Modifica appuntamento" : "Nuovo appuntamento"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Cliente</Label>
            <Select
              value={clientId}
              onValueChange={(v) => {
                setClientId(v ?? "");
                const c = clientsData?.items.find((x) => x.id === v);
                setClientName(c?.fullName ?? "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona..." />
              </SelectTrigger>
              <SelectContent>
                {(clientsData?.items ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Data e ora</Label>
              <Input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Durata</Label>
              <Select
                value={String(duration)}
                onValueChange={(v) => setDuration(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as AppointmentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN_PERSON">In persona</SelectItem>
                <SelectItem value="VIDEO_CALL">Video call</SelectItem>
                <SelectItem value="CHECK_IN">Check-in</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Note</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          {existing && (
            <button
              type="button"
              onClick={() => deleteMutation.mutate()}
              className="text-destructive hover:bg-destructive/10 mr-auto flex h-11 items-center gap-1 rounded-md px-3 text-sm"
            >
              <Trash2 className="h-4 w-4" />
              Elimina
            </button>
          )}
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={
              saveMutation.isPending || !clientId || !start
            }
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium disabled:opacity-50"
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {existing ? "Salva" : "Crea"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
