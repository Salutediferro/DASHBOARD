"use client";

import * as React from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { it } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { AppointmentForm } from "@/components/calendar/appointment-form";
import type {
  Appointment,
  AppointmentType,
} from "@/lib/appointments";

type View = "month" | "week" | "day";

const TYPE_COLOR: Record<AppointmentType, string> = {
  IN_PERSON: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  VIDEO_CALL: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  VISIT: "bg-green-500/20 text-green-400 border-green-500/40",
  FOLLOW_UP: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  COACHING_SESSION: "bg-pink-500/20 text-pink-400 border-pink-500/40",
};

const TYPE_LABEL: Record<AppointmentType, string> = {
  IN_PERSON: "In persona",
  VIDEO_CALL: "Video call",
  VISIT: "Visita",
  FOLLOW_UP: "Follow-up",
  COACHING_SESSION: "Sessione coaching",
};

function formatTime(d: Date) {
  return d
    .toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
    .padStart(5, "0");
}

export default function CoachCalendarPage() {
  const [view, setView] = React.useState<View>("month");
  const [cursor, setCursor] = React.useState<Date>(() => new Date());
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalInitial, setModalInitial] = React.useState<Date | null>(null);
  const [editing, setEditing] = React.useState<Appointment | null>(null);

  const { start, end } = React.useMemo(() => {
    if (view === "month") {
      const s = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
      const e = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
      return { start: s, end: e };
    }
    if (view === "week") {
      return {
        start: startOfWeek(cursor, { weekStartsOn: 1 }),
        end: endOfWeek(cursor, { weekStartsOn: 1 }),
      };
    }
    const d = new Date(cursor);
    d.setHours(0, 0, 0, 0);
    const e = new Date(d);
    e.setHours(23, 59, 59, 999);
    return { start: d, end: e };
  }, [cursor, view]);

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["appointments", start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      });
      const res = await fetch(`/api/appointments?${params}`);
      return res.json();
    },
  });

  function prev() {
    if (view === "month") setCursor((c) => subMonths(c, 1));
    else if (view === "week") setCursor((c) => addDays(c, -7));
    else setCursor((c) => addDays(c, -1));
  }
  function next() {
    if (view === "month") setCursor((c) => addMonths(c, 1));
    else if (view === "week") setCursor((c) => addDays(c, 7));
    else setCursor((c) => addDays(c, 1));
  }

  function openCreate(date: Date) {
    setEditing(null);
    setModalInitial(date);
    setModalOpen(true);
  }
  function openEdit(apt: Appointment) {
    setEditing(apt);
    setModalInitial(null);
    setModalOpen(true);
  }

  const title =
    view === "month"
      ? format(cursor, "MMMM yyyy", { locale: it })
      : view === "week"
        ? `${format(start, "d MMM", { locale: it })} — ${format(end, "d MMM yyyy", { locale: it })}`
        : format(cursor, "EEEE d MMMM yyyy", { locale: it });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Calendario
          </h1>
          <p className="text-muted-foreground text-sm capitalize">{title}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="border-border flex rounded-md border p-0.5">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium",
                  view === v && "bg-primary text-primary-foreground",
                )}
              >
                {v === "month" ? "Mese" : v === "week" ? "Settimana" : "Giorno"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={prev}
            className="hover:bg-muted flex h-10 w-10 items-center justify-center rounded-md border"
            aria-label="Precedente"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date())}
            className="hover:bg-muted h-10 rounded-md border px-3 text-xs"
          >
            Oggi
          </button>
          <button
            type="button"
            onClick={next}
            className="hover:bg-muted flex h-10 w-10 items-center justify-center rounded-md border"
            aria-label="Successivo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openCreate(new Date())}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center gap-1 rounded-md px-3 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Nuovo
          </button>
        </div>
      </header>

      {view === "month" && (
        <MonthView
          cursor={cursor}
          appointments={appointments}
          onSlotClick={openCreate}
          onAppointmentClick={openEdit}
        />
      )}
      {view === "week" && (
        <WeekView
          cursor={cursor}
          appointments={appointments}
          onSlotClick={openCreate}
          onAppointmentClick={openEdit}
        />
      )}
      {view === "day" && (
        <DayView
          cursor={cursor}
          appointments={appointments}
          onSlotClick={openCreate}
          onAppointmentClick={openEdit}
        />
      )}

      <AppointmentForm
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialStart={modalInitial}
        existing={editing}
      />
    </div>
  );
}

// -------- Month View ---------------------------------------------------------

function MonthView({
  cursor,
  appointments,
  onSlotClick,
  onAppointmentClick,
}: {
  cursor: Date;
  appointments: Appointment[];
  onSlotClick: (d: Date) => void;
  onAppointmentClick: (a: Appointment) => void;
}) {
  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekdays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

  return (
    <Card>
      <CardContent className="p-3">
        <div className="grid grid-cols-7 border-b pb-2 text-center text-xs font-semibold uppercase tracking-wider">
          {weekdays.map((w) => (
            <div key={w} className="text-muted-foreground">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px">
          {days.map((day) => {
            const dayApts = appointments.filter((a) =>
              isSameDay(new Date(a.startTime), day),
            );
            const inMonth = isSameMonth(day, cursor);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "border-border min-h-[96px] border p-1.5 transition-colors",
                  !inMonth && "bg-muted/20 text-muted-foreground",
                  isToday(day) && "bg-primary/5 border-primary/30",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(day);
                    d.setHours(9, 0, 0, 0);
                    onSlotClick(d);
                  }}
                  className="hover:text-primary mb-1 flex w-full items-center justify-between text-[11px] font-semibold"
                >
                  <span className={cn(isToday(day) && "text-primary")}>
                    {format(day, "d")}
                  </span>
                  {dayApts.length > 0 && (
                    <span className="text-muted-foreground text-[9px]">
                      {dayApts.length}
                    </span>
                  )}
                </button>
                <div className="flex flex-col gap-0.5">
                  {dayApts.slice(0, 3).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onAppointmentClick(a)}
                      className={cn(
                        "border-l-2 truncate rounded-sm px-1 py-0.5 text-left text-[10px]",
                        TYPE_COLOR[a.type],
                      )}
                      title={`${a.patientName} — ${TYPE_LABEL[a.type]}`}
                    >
                      <span className="font-mono">
                        {formatTime(new Date(a.startTime))}
                      </span>{" "}
                      {a.patientName.split(" ")[0]}
                    </button>
                  ))}
                  {dayApts.length > 3 && (
                    <span className="text-muted-foreground text-[9px]">
                      +{dayApts.length - 3} altri
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// -------- Week View ----------------------------------------------------------

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 - 22:00

function WeekView({
  cursor,
  appointments,
  onSlotClick,
  onAppointmentClick,
}: {
  cursor: Date;
  appointments: Appointment[];
  onSlotClick: (d: Date) => void;
  onAppointmentClick: (a: Appointment) => void;
}) {
  const start = startOfWeek(cursor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b">
          <div />
          {days.map((d) => (
            <div
              key={d.toISOString()}
              className={cn(
                "p-2 text-center text-xs font-semibold",
                isToday(d) && "text-primary",
              )}
            >
              <div className="uppercase tracking-wider">
                {format(d, "EEE", { locale: it })}
              </div>
              <div className="font-heading text-lg">{format(d, "d")}</div>
            </div>
          ))}
        </div>
        <div className="grid max-h-[60vh] grid-cols-[48px_repeat(7,1fr)] overflow-y-auto">
          <div className="flex flex-col">
            {HOURS.map((h) => (
              <div
                key={h}
                className="text-muted-foreground h-16 shrink-0 border-r pr-1 text-right text-[10px]"
              >
                {h.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {days.map((d) => (
            <div key={d.toISOString()} className="border-border relative border-r">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    const slot = new Date(d);
                    slot.setHours(h, 0, 0, 0);
                    onSlotClick(slot);
                  }}
                  className="hover:bg-muted/30 block h-16 w-full border-b"
                />
              ))}
              {appointments
                .filter((a) => isSameDay(new Date(a.startTime), d))
                .map((a) => {
                  const startD = new Date(a.startTime);
                  const endD = new Date(a.endTime);
                  const startH = startD.getHours() + startD.getMinutes() / 60;
                  const endH = endD.getHours() + endD.getMinutes() / 60;
                  const top = (startH - 6) * 64;
                  const h = (endH - startH) * 64;
                  if (top < 0 || top > 17 * 64) return null;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onAppointmentClick(a)}
                      className={cn(
                        "absolute right-1 left-1 rounded-md border-l-2 p-1 text-left text-[10px]",
                        TYPE_COLOR[a.type],
                      )}
                      style={{ top, height: h }}
                    >
                      <div className="font-semibold">
                        {formatTime(startD)}
                      </div>
                      <div className="truncate">{a.patientName}</div>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// -------- Day View -----------------------------------------------------------

function DayView({
  cursor,
  appointments,
  onSlotClick,
  onAppointmentClick,
}: {
  cursor: Date;
  appointments: Appointment[];
  onSlotClick: (d: Date) => void;
  onAppointmentClick: (a: Appointment) => void;
}) {
  const dayApts = appointments
    .filter((a) => isSameDay(new Date(a.startTime), cursor))
    .sort((a, b) => (a.startTime < b.startTime ? -1 : 1));

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid max-h-[70vh] grid-cols-[56px_1fr] overflow-y-auto">
          <div className="border-border border-r">
            {HOURS.map((h) => (
              <div
                key={h}
                className="text-muted-foreground h-20 pr-1 text-right text-[11px]"
              >
                {h.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>
          <div className="relative">
            {HOURS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  const slot = new Date(cursor);
                  slot.setHours(h, 0, 0, 0);
                  onSlotClick(slot);
                }}
                className="hover:bg-muted/30 block h-20 w-full border-b"
              />
            ))}
            {dayApts.map((a) => {
              const startD = new Date(a.startTime);
              const endD = new Date(a.endTime);
              const startH = startD.getHours() + startD.getMinutes() / 60;
              const endH = endD.getHours() + endD.getMinutes() / 60;
              const top = (startH - 6) * 80;
              const h = (endH - startH) * 80;
              if (top < 0) return null;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onAppointmentClick(a)}
                  className={cn(
                    "absolute right-2 left-2 rounded-md border-l-4 p-2 text-left",
                    TYPE_COLOR[a.type],
                  )}
                  style={{ top, height: h }}
                >
                  <p className="text-sm font-semibold">{a.patientName}</p>
                  <p className="text-[10px] opacity-80">
                    {formatTime(startD)} — {formatTime(endD)} · {TYPE_LABEL[a.type]}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
