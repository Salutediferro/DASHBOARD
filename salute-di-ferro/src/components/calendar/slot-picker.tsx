"use client";

import * as React from "react";
import { Loader2, Sunrise, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFreeSlots, type FreeSlot } from "@/lib/hooks/use-availability";

type Band = "morning" | "afternoon" | "evening";

const BAND_META: Record<
  Band,
  { label: string; hours: string; icon: typeof Sun; range: [number, number] }
> = {
  morning: { label: "Mattina", hours: "prima delle 12:00", icon: Sunrise, range: [0, 12] },
  afternoon: { label: "Pomeriggio", hours: "12:00 – 18:00", icon: Sun, range: [12, 18] },
  evening: { label: "Sera", hours: "dopo le 18:00", icon: Moon, range: [18, 24] },
};

type Props = {
  professionalId: string | null;
  /** ISO date (YYYY-MM-DD). */
  date: string;
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

function bandFor(iso: string): Band {
  const h = new Date(iso).getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

/**
 * Slot picker grouped in mattina/pomeriggio/sera bands. Accepts a date
 * from the parent (day is chosen upstream in the wizard). The API
 * returns only free slots; `disabled` is reserved for future optimistic
 * race-condition handling.
 */
export function SlotPicker({
  professionalId,
  date,
  durationMin = 30,
  value,
  onChange,
}: Props) {
  const enabled = !!professionalId && !!date;
  const from = date ? new Date(`${date}T00:00:00`).toISOString() : "";
  const to = date ? new Date(`${date}T23:59:59`).toISOString() : "";

  const { data = [], isLoading } = useFreeSlots({
    professionalId: professionalId ?? "",
    from,
    to,
    durationMin,
    enabled,
  });

  const grouped = React.useMemo(() => {
    const out: Record<Band, FreeSlot[]> = {
      morning: [],
      afternoon: [],
      evening: [],
    };
    for (const s of data) out[bandFor(s.start)].push(s);
    return out;
  }, [data]);

  const [activeBand, setActiveBand] = React.useState<Band | "all">("all");

  if (!enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Seleziona prima un giorno.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carico gli
        orari disponibili…
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessun orario libero questo giorno. Prova un&apos;altra data.
      </p>
    );
  }

  const bandsToShow: Band[] =
    activeBand === "all"
      ? (Object.keys(BAND_META) as Band[])
      : [activeBand];

  return (
    <div className="flex flex-col gap-4">
      {/* Band filter pills */}
      <div
        role="radiogroup"
        aria-label="Fascia oraria"
        className="flex flex-wrap gap-1.5"
      >
        <BandPill
          active={activeBand === "all"}
          onClick={() => setActiveBand("all")}
          label="Tutte"
          count={data.length}
        />
        {(Object.keys(BAND_META) as Band[]).map((b) => {
          const Icon = BAND_META[b].icon;
          return (
            <BandPill
              key={b}
              active={activeBand === b}
              onClick={() => setActiveBand(b)}
              label={BAND_META[b].label}
              icon={Icon}
              count={grouped[b].length}
              disabled={grouped[b].length === 0}
            />
          );
        })}
      </div>

      {/* Slots grouped */}
      {bandsToShow.map((band) => {
        const slots = grouped[band];
        if (slots.length === 0) return null;
        const Icon = BAND_META[band].icon;
        return (
          <section key={band} aria-labelledby={`band-${band}`} className="flex flex-col gap-2">
            <h3
              id={`band-${band}`}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {BAND_META[band].label}
              <span className="font-normal normal-case tracking-normal text-muted-foreground/60">
                · {BAND_META[band].hours}
              </span>
            </h3>
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
              role="radiogroup"
              aria-label={`Orari ${BAND_META[band].label.toLowerCase()}`}
            >
              {slots.map((s) => {
                const active = value?.start === s.start;
                return (
                  <SlotButton
                    key={s.start}
                    slot={s}
                    active={active}
                    onClick={() => onChange(s)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function BandPill({
  active,
  onClick,
  label,
  count,
  icon: Icon,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: typeof Sun;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary-500/40 bg-primary-500/15 text-primary-500"
          : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {label}
      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-background/60 px-1 text-[10px] tabular-nums">
        {count}
      </span>
    </button>
  );
}

function SlotButton({
  slot,
  active,
  onClick,
  disabled,
}: {
  slot: FreeSlot;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "focus-ring relative rounded-lg border px-2 py-2.5 text-xs font-medium tabular-nums transition-all",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px_rgba(178,34,34,0.2)]"
          : "border-border/60 bg-muted/30 text-foreground hover:-translate-y-0.5 hover:border-primary-500/40 hover:bg-primary-500/5 hover:shadow-[0_0_18px_rgba(178,34,34,0.18)]",
        disabled &&
          "pointer-events-none line-through opacity-50 hover:translate-y-0 hover:shadow-none",
      )}
    >
      {fmtTime(slot.start)}
      <span className="mx-1 text-muted-foreground/60">–</span>
      {fmtTime(slot.end)}
    </button>
  );
}
