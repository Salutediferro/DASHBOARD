"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { it } from "date-fns/locale";

import { cn } from "@/lib/utils";
import type { AppointmentDTO } from "@/lib/hooks/use-appointments";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/validators/appointment";

type View = "day" | "week" | "month";

type Props = {
  appointments: AppointmentDTO[];
  onSelect?: (a: AppointmentDTO) => void;
  /** Professional view only: click on an empty hour slot. */
  onEmptySlotClick?: (iso: string) => void;
  /** Show the view toggle (default true). */
  showViewToggle?: boolean;
  /** Title shown on the left of the header row (optional). */
  title?: string;
};

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const HOUR_PX = 52;

const STATUS_CLASS: Record<string, string> = {
  SCHEDULED:
    "bg-primary-500/20 border-l-2 border-primary-500 text-foreground hover:bg-primary-500/25",
  COMPLETED:
    "bg-success/15 border-l-2 border-success text-success hover:bg-success/20",
  CANCELED:
    "bg-muted/60 border-l-2 border-border text-muted-foreground line-through",
  NO_SHOW:
    "bg-destructive/15 border-l-2 border-destructive text-destructive hover:bg-destructive/20",
};

export function CalendarView({
  appointments,
  onSelect,
  onEmptySlotClick,
  showViewToggle = true,
  title,
}: Props) {
  const [view, setView] = React.useState<View>("week");
  const [anchor, setAnchor] = React.useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  function goPrev() {
    if (view === "day") setAnchor(addDays(anchor, -1));
    else if (view === "week") setAnchor(addDays(anchor, -7));
    else setAnchor(subMonths(anchor, 1));
  }
  function goNext() {
    if (view === "day") setAnchor(addDays(anchor, 1));
    else if (view === "week") setAnchor(addDays(anchor, 7));
    else setAnchor(addMonths(anchor, 1));
  }
  function goToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setAnchor(d);
  }

  const periodLabel = React.useMemo(() => {
    if (view === "day") return format(anchor, "EEEE d MMMM yyyy", { locale: it });
    if (view === "week") {
      const s = startOfWeek(anchor, { weekStartsOn: 1 });
      const e = addDays(s, 6);
      if (isSameMonth(s, e))
        return `${format(s, "d")}–${format(e, "d MMMM yyyy", { locale: it })}`;
      return `${format(s, "d MMM", { locale: it })} – ${format(e, "d MMM yyyy", { locale: it })}`;
    }
    return format(anchor, "MMMM yyyy", { locale: it });
  }, [anchor, view]);

  return (
    <section
      className="surface-1 flex flex-col overflow-hidden rounded-xl"
      aria-label="Calendario"
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
        {title && (
          <p className="text-sm font-medium">{title}</p>
        )}
        <span className="text-sm capitalize text-muted-foreground">
          {periodLabel}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <IconBtn onClick={goPrev} aria-label="Periodo precedente">
              <ChevronLeft className="h-4 w-4" />
            </IconBtn>
            <button
              type="button"
              onClick={goToday}
              className="focus-ring rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Oggi
            </button>
            <IconBtn onClick={goNext} aria-label="Periodo successivo">
              <ChevronRight className="h-4 w-4" />
            </IconBtn>
          </div>
          {showViewToggle && <ViewToggle value={view} onChange={setView} />}
        </div>
      </header>

      {view === "day" && (
        <DayView
          day={anchor}
          appointments={appointments}
          onSelect={onSelect}
          onEmptySlotClick={onEmptySlotClick}
        />
      )}
      {view === "week" && (
        <WeekView
          anchor={anchor}
          appointments={appointments}
          onSelect={onSelect}
          onEmptySlotClick={onEmptySlotClick}
        />
      )}
      {view === "month" && (
        <MonthView
          anchor={anchor}
          appointments={appointments}
          onDayClick={(d) => {
            setView("day");
            setAnchor(d);
          }}
        />
      )}
    </section>
  );
}

// ── View toggle ────────────────────────────────────────────────────────

function ViewToggle({
  value,
  onChange,
}: {
  value: View;
  onChange: (v: View) => void;
}) {
  const views: Array<{ key: View; label: string }> = [
    { key: "day", label: "Giorno" },
    { key: "week", label: "Settimana" },
    { key: "month", label: "Mese" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Vista calendario"
      className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5"
    >
      {views.map((v) => {
        const active = value === v.key;
        return (
          <button
            key={v.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v.key)}
            className={cn(
              "focus-ring rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  ...rest
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      {...rest}
    >
      {children}
    </button>
  );
}

// ── Day view ───────────────────────────────────────────────────────────

function DayView({
  day,
  appointments,
  onSelect,
  onEmptySlotClick,
}: {
  day: Date;
  appointments: AppointmentDTO[];
  onSelect?: (a: AppointmentDTO) => void;
  onEmptySlotClick?: (iso: string) => void;
}) {
  const dayApts = appointments.filter((a) => isSameDay(new Date(a.startTime), day));
  return (
    <div className="flex">
      <TimeGutter />
      <div className="relative flex-1 border-l border-border/60">
        <HourLines />
        {dayApts.map((a) => (
          <EventBlock key={a.id} apt={a} onSelect={onSelect} />
        ))}
        {onEmptySlotClick && <HourClickTargets day={day} onClick={onEmptySlotClick} />}
      </div>
    </div>
  );
}

// ── Week view ──────────────────────────────────────────────────────────

function WeekView({
  anchor,
  appointments,
  onSelect,
  onEmptySlotClick,
}: {
  anchor: Date;
  appointments: AppointmentDTO[];
  onSelect?: (a: AppointmentDTO) => void;
  onEmptySlotClick?: (iso: string) => void;
}) {
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  return (
    <div className="flex flex-col">
      {/* Day headers */}
      <div className="flex border-b border-border/60">
        <div className="w-14" />
        <div className="grid flex-1 grid-cols-7">
          {days.map((d) => {
            const active = isSameDay(d, today);
            return (
              <div
                key={d.toISOString()}
                className={cn(
                  "flex flex-col items-center justify-center border-l border-border/60 px-1 py-2",
                  active && "bg-primary-500/5",
                )}
              >
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {format(d, "EEE", { locale: it })}
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-sm font-medium tabular-nums",
                    active && "text-primary-500",
                  )}
                >
                  {format(d, "d", { locale: it })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex">
        <TimeGutter />
        <div className="grid flex-1 grid-cols-7">
          {days.map((d) => {
            const dayApts = appointments.filter((a) =>
              isSameDay(new Date(a.startTime), d),
            );
            return (
              <div
                key={d.toISOString()}
                className="relative border-l border-border/60"
              >
                <HourLines />
                {dayApts.map((a) => (
                  <EventBlock
                    key={a.id}
                    apt={a}
                    onSelect={onSelect}
                    compact
                  />
                ))}
                {onEmptySlotClick && (
                  <HourClickTargets day={d} onClick={onEmptySlotClick} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Month view ─────────────────────────────────────────────────────────

function MonthView({
  anchor,
  appointments,
  onDayClick,
}: {
  anchor: Date;
  appointments: AppointmentDTO[];
  onDayClick: (d: Date) => void;
}) {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const byDay = new Map<string, AppointmentDTO[]>();
  for (const a of appointments) {
    const key = format(new Date(a.startTime), "yyyy-MM-dd");
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(a);
  }

  const today = new Date();

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-border/60 bg-muted/20 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
        {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const apts = byDay.get(format(d, "yyyy-MM-dd")) ?? [];
          const inMonth = isSameMonth(d, anchor);
          const isToday = isSameDay(d, today);
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onDayClick(d)}
              className={cn(
                "focus-ring flex min-h-24 flex-col items-start gap-0.5 border-b border-l border-border/60 p-1.5 text-left transition-colors hover:bg-primary-500/5",
                (i + 1) % 7 === 0 && "border-r-0",
                !inMonth && "bg-muted/10 text-muted-foreground/40",
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  isToday &&
                    "inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground",
                )}
              >
                {format(d, "d")}
              </span>
              <div className="flex w-full flex-col gap-0.5">
                {apts.slice(0, 3).map((a) => (
                  <span
                    key={a.id}
                    className={cn(
                      "truncate rounded px-1 text-[10px]",
                      STATUS_CLASS[a.status]?.split(" ")[0] ??
                        "bg-muted text-muted-foreground",
                    )}
                  >
                    {format(new Date(a.startTime), "HH:mm")}{" "}
                    {a.patientName ?? a.professionalName ?? ""}
                  </span>
                ))}
                {apts.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{apts.length - 3}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────

function TimeGutter() {
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
    (_, i) => DAY_START_HOUR + i,
  );
  return (
    <div className="w-14 shrink-0">
      {hours.map((h) => (
        <div
          key={h}
          style={{ height: HOUR_PX }}
          className="relative text-right"
        >
          <span className="absolute right-1.5 -top-1.5 text-[10px] tabular-nums text-muted-foreground/70">
            {String(h).padStart(2, "0")}:00
          </span>
        </div>
      ))}
    </div>
  );
}

function HourLines() {
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
    (_, i) => i,
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {hours.map((i) => (
        <div
          key={i}
          style={{ height: HOUR_PX }}
          className="border-b border-border/30 last:border-b-0"
        />
      ))}
    </div>
  );
}

function HourClickTargets({
  day,
  onClick,
}: {
  day: Date;
  onClick: (iso: string) => void;
}) {
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR },
    (_, i) => DAY_START_HOUR + i,
  );
  return (
    <div className="absolute inset-0 flex flex-col">
      {hours.map((h) => {
        const slot = new Date(day);
        slot.setHours(h, 0, 0, 0);
        return (
          <button
            key={h}
            type="button"
            onClick={() => onClick(slot.toISOString())}
            aria-label={`Crea appuntamento alle ${String(h).padStart(2, "0")}:00`}
            style={{ height: HOUR_PX }}
            className="focus-ring transition-colors hover:bg-primary-500/5"
          />
        );
      })}
    </div>
  );
}

function EventBlock({
  apt,
  onSelect,
  compact,
}: {
  apt: AppointmentDTO;
  onSelect?: (a: AppointmentDTO) => void;
  compact?: boolean;
}) {
  const start = new Date(apt.startTime);
  const end = new Date(apt.endTime);
  const topMin =
    (start.getHours() - DAY_START_HOUR) * 60 + start.getMinutes();
  const durMin = Math.max(15, (end.getTime() - start.getTime()) / 60000);
  const top = (topMin / 60) * HOUR_PX;
  const height = Math.max(24, (durMin / 60) * HOUR_PX);
  const who = apt.patientName ?? apt.professionalName ?? "";
  return (
    <button
      type="button"
      onClick={() => onSelect?.(apt)}
      aria-label={`${who}, ${format(start, "HH:mm")}–${format(end, "HH:mm")}`}
      style={{ top, height }}
      className={cn(
        "focus-ring absolute left-1 right-1 flex flex-col items-start gap-0.5 overflow-hidden rounded-md px-2 py-1 text-left text-[11px] transition-colors",
        STATUS_CLASS[apt.status] ??
          "bg-muted border-l-2 border-border text-foreground",
      )}
    >
      <span className="font-medium tabular-nums">
        {format(start, "HH:mm")} – {format(end, "HH:mm")}
      </span>
      {!compact ? (
        <>
          <span className="truncate font-medium">{who}</span>
          <span className="truncate opacity-80">
            {APPOINTMENT_TYPE_LABELS[apt.type]}
          </span>
        </>
      ) : (
        <span className="truncate">{who}</span>
      )}
    </button>
  );
}
