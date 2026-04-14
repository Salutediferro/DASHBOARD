"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AppointmentDTO } from "@/lib/hooks/use-appointments";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/validators/appointment";

type Props = {
  appointments: AppointmentDTO[];
  onSelect?: (a: AppointmentDTO) => void;
  /** Title shown in the top-left of the header row. */
  title?: string;
};

const DOW_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const dow = out.getDay(); // 0 (Sun) .. 6 (Sat)
  const mondayOffset = (dow + 6) % 7; // distance back to Monday
  out.setDate(out.getDate() - mondayOffset);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function fmtDay(d: Date) {
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-primary/20 text-primary border-primary/40",
  COMPLETED: "bg-green-500/20 text-green-400 border-green-500/40",
  CANCELED: "bg-muted text-muted-foreground line-through",
  NO_SHOW: "bg-red-500/20 text-red-400 border-red-500/40",
};

/**
 * Minimal 7-day week view. No hour grid — each day is a column listing
 * its appointments. Prev/next navigation + "oggi". Clicking an
 * appointment fires onSelect so the parent can pop a details dialog.
 */
export function CalendarView({ appointments, onSelect, title }: Props) {
  const [weekStart, setWeekStart] = React.useState<Date>(startOfWeek(new Date()));

  const days = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const byDay = React.useMemo(() => {
    const map = new Map<string, AppointmentDTO[]>();
    for (const d of days) map.set(d.toDateString(), []);
    for (const a of appointments) {
      const key = new Date(a.startTime).toDateString();
      if (map.has(key)) map.get(key)!.push(a);
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
    }
    return map;
  }, [appointments, days]);

  return (
    <Card className="flex flex-col p-0">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        {title && (
          <p className="text-sm font-medium">{title}</p>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {fmtDay(days[0]!)} – {fmtDay(days[6]!)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            Oggi
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7">
        {days.map((d, i) => {
          const key = d.toDateString();
          const apts = byDay.get(key) ?? [];
          const isToday = new Date().toDateString() === key;
          return (
            <div
              key={key}
              className={cn(
                "border-border min-h-32 border-b border-r p-2",
                i === 6 && "md:border-r-0",
                isToday && "bg-primary/5",
              )}
            >
              <p
                className={cn(
                  "text-xs font-semibold uppercase",
                  isToday ? "text-primary" : "text-muted-foreground",
                )}
              >
                {DOW_LABELS[i]} · {d.getDate()}
              </p>
              <div className="mt-2 flex flex-col gap-1">
                {apts.length === 0 && (
                  <p className="text-muted-foreground text-xs italic">—</p>
                )}
                {apts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelect?.(a)}
                    className={cn(
                      "rounded-md border px-2 py-1 text-left text-xs transition-colors hover:brightness-110",
                      STATUS_COLOR[a.status] ??
                        "border-border bg-muted text-foreground",
                    )}
                  >
                    <p className="font-medium">
                      {fmtTime(a.startTime)} — {fmtTime(a.endTime)}
                    </p>
                    <p className="truncate">
                      {a.patientName ?? a.professionalName ?? "—"}
                    </p>
                    <p className="text-[10px] opacity-80">
                      {APPOINTMENT_TYPE_LABELS[a.type]}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
