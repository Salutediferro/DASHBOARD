"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useFreeSlots, type FreeSlot } from "@/lib/hooks/use-availability";

type Props = {
  professionalId: string | null;
  durationMin?: number;
  value: FreeSlot | null;
  onChange: (slot: FreeSlot | null) => void;
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Given a professional and a date, calls GET /api/availability?slots=1
 * and renders the returned free chunks as clickable buttons. The parent
 * holds the selected slot state.
 */
export function SlotPicker({
  professionalId,
  durationMin = 30,
  value,
  onChange,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = React.useState<string>(today);

  const enabled = !!professionalId;
  const from = new Date(`${date}T00:00:00`).toISOString();
  const to = new Date(`${date}T23:59:59`).toISOString();

  const { data = [], isLoading } = useFreeSlots({
    professionalId: professionalId ?? "",
    from,
    to,
    durationMin,
    enabled,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slot-date">Data</Label>
        <Input
          id="slot-date"
          type="date"
          value={date}
          min={today}
          onChange={(e) => {
            setDate(e.target.value);
            onChange(null);
          }}
        />
      </div>

      {!enabled && (
        <p className="text-muted-foreground text-sm">
          Seleziona prima un professionista
        </p>
      )}

      {enabled && isLoading && (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Caricamento slot…
        </div>
      )}

      {enabled && !isLoading && data.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nessuno slot libero in questa data
        </p>
      )}

      {enabled && data.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {data.map((s) => {
            const active = value?.start === s.start;
            return (
              <button
                key={s.start}
                type="button"
                onClick={() => onChange(s)}
                className={cn(
                  "border-border rounded-md border px-2 py-2 text-xs font-medium tabular-nums transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 hover:bg-muted",
                )}
              >
                {fmtTime(s.start)}–{fmtTime(s.end)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
