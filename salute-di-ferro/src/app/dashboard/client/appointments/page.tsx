"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Clock, Loader2, Plus, Video } from "lucide-react";
import { addDays, format } from "date-fns";
import { it } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Appointment, AppointmentType } from "@/lib/appointments";

const TYPE_LABEL: Record<AppointmentType, string> = {
  IN_PERSON: "In persona",
  VIDEO_CALL: "Video call",
  CHECK_IN: "Check-in",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClientAppointmentsPage() {
  const qc = useQueryClient();
  const [bookOpen, setBookOpen] = React.useState(false);
  const [selectedDay, setSelectedDay] = React.useState(0);
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null);
  const [type, setType] = React.useState<AppointmentType>("VIDEO_CALL");
  const [duration, setDuration] = React.useState(60);

  const now = new Date().toISOString();
  const { data: upcoming = [] } = useQuery<Appointment[]>({
    queryKey: ["client-appointments"],
    queryFn: async () => {
      const res = await fetch(`/api/appointments?start=${now}`);
      return res.json();
    },
  });

  const targetDay = addDays(new Date(), selectedDay);
  const dayIso = targetDay.toISOString().slice(0, 10);

  const { data: slots = [] } = useQuery<string[]>({
    queryKey: ["coach-slots", dayIso],
    queryFn: async () => {
      const res = await fetch(`/api/coach/availability?date=${dayIso}`);
      const json = await res.json();
      return json.slots ?? [];
    },
    enabled: bookOpen,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot) throw new Error("Seleziona uno slot");
      const res = await fetch("/api/appointments/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachId: "coach-1",
          startTime: selectedSlot,
          type,
          durationMin: duration,
          notes: null,
        }),
      });
      if (!res.ok) throw new Error("Errore prenotazione");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Appuntamento prenotato");
      qc.invalidateQueries({ queryKey: ["client-appointments"] });
      qc.invalidateQueries({ queryKey: ["coach-slots"] });
      setBookOpen(false);
      setSelectedSlot(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-6 pb-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Appuntamenti
          </h1>
          <p className="text-muted-foreground text-sm">
            I tuoi prossimi incontri col coach
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBookOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Prenota
        </button>
      </header>

      {upcoming.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <CalendarDays className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">
              Nessun appuntamento programmato
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {upcoming.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-md">
                  {a.type === "VIDEO_CALL" ? (
                    <Video className="h-5 w-5" />
                  ) : (
                    <CalendarDays className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {format(new Date(a.startTime), "EEEE d MMMM", {
                      locale: it,
                    })}
                  </p>
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    {formatTime(a.startTime)} — {formatTime(a.endTime)}
                  </p>
                </div>
                <Badge className="bg-primary/20 text-primary">
                  {TYPE_LABEL[a.type]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Booking dialog */}
      <Dialog open={bookOpen} onOpenChange={setBookOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Prenota un appuntamento</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase">Giorno</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {Array.from({ length: 7 }, (_, i) => i).map((i) => {
                  const d = addDays(new Date(), i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedDay(i);
                        setSelectedSlot(null);
                      }}
                      className={cn(
                        "flex h-16 min-w-[60px] flex-col items-center justify-center rounded-md border",
                        selectedDay === i
                          ? "bg-primary text-primary-foreground border-transparent"
                          : "hover:bg-muted",
                      )}
                    >
                      <span className="text-[10px] uppercase">
                        {format(d, "EEE", { locale: it })}
                      </span>
                      <span className="font-heading text-lg">
                        {format(d, "d")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase">Tipo</label>
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
                <label className="text-xs font-semibold uppercase">Durata</label>
                <Select
                  value={String(duration)}
                  onValueChange={(v) => setDuration(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[30, 45, 60, 90].map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase">
                Slot disponibili
              </label>
              {slots.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nessuno slot disponibile in questa data
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSlot(s)}
                      className={cn(
                        "flex h-11 items-center justify-center rounded-md border text-sm font-medium",
                        selectedSlot === s
                          ? "bg-primary text-primary-foreground border-transparent"
                          : "hover:bg-muted",
                      )}
                    >
                      {formatTime(s)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => bookMutation.mutate()}
              disabled={bookMutation.isPending || !selectedSlot}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-12 items-center justify-center gap-2 rounded-md text-sm font-semibold disabled:opacity-50"
            >
              {bookMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Conferma prenotazione
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
