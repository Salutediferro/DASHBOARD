"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDiary, useCopyDay, type DiaryEntry } from "@/lib/hooks/use-nutrition";
import {
  MEAL_SLOTS_ORDERED,
  MealSlotIcon,
  mealSlotShortLabel,
} from "@/lib/nutrition-labels";
import { cn } from "@/lib/utils";
import type { MealSlot } from "@/lib/validators/nutrition";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** YYYY-MM-DD the entries will be copied ONTO. */
  targetDate: string;
};

/** YYYY-MM-DD → previous day in YYYY-MM-DD. */
function previousDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function fmtDay(iso: string): string {
  return new Date(`${iso}T12:00:00.000Z`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

/**
 * "Copia da..." flow — pick a past day, choose which entries to copy
 * onto today (or whichever day the diary is showing). Defaults to
 * yesterday with everything pre-selected because that's the 95 % path:
 * "ate basically the same as yesterday."
 */
export function CopyMealsDialog({ open, onOpenChange, targetDate }: Props) {
  const [sourceDate, setSourceDate] = React.useState<string>(() =>
    previousDay(targetDate),
  );
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const source = useDiary(sourceDate);
  const copy = useCopyDay();

  const entries = React.useMemo(() => source.data ?? [], [source.data]);

  // Reset source date and pre-select all whenever the dialog (re)opens
  // or the target day changes underneath us.
  React.useEffect(() => {
    if (!open) return;
    setSourceDate(previousDay(targetDate));
  }, [open, targetDate]);

  // Pre-select every entry whenever the source data changes — defaults
  // to "copy everything" so the common case is one tap.
  React.useEffect(() => {
    setSelected(new Set(entries.map((e) => e.id)));
  }, [entries]);

  const grouped = React.useMemo(() => {
    const map = new Map<MealSlot, DiaryEntry[]>();
    for (const slot of MEAL_SLOTS_ORDERED) map.set(slot, []);
    for (const e of entries) map.get(e.mealSlot)?.push(e);
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          new Date(a.consumedAt).getTime() - new Date(b.consumedAt).getTime(),
      );
    }
    return map;
  }, [entries]);

  function toggleEntry(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSlot(slotEntries: DiaryEntry[]) {
    if (slotEntries.length === 0) return;
    const allOn = slotEntries.every((e) => selected.has(e.id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const e of slotEntries) {
        if (allOn) next.delete(e.id);
        else next.add(e.id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(entries.map((e) => e.id)));
  }
  function selectNone() {
    setSelected(new Set());
  }

  const allOn = entries.length > 0 && entries.every((e) => selected.has(e.id));

  function onConfirm() {
    if (selected.size === 0) return;
    const entryIds =
      selected.size === entries.length ? undefined : Array.from(selected);
    copy
      .mutateAsync({ sourceDate, targetDate, entryIds })
      .then((res) => {
        toast.success(
          res.created === 1
            ? "1 voce copiata"
            : `${res.created} voci copiate`,
        );
        onOpenChange(false);
      })
      .catch((err: Error) => toast.error(err.message));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-8">
          <DialogTitle>Copia pasti da un altro giorno</DialogTitle>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-3 overflow-x-hidden">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="source-date">Giorno sorgente</Label>
            <Input
              id="source-date"
              type="date"
              value={sourceDate}
              onChange={(e) => setSourceDate(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              {fmtDay(sourceDate)}
            </p>
          </div>

          {source.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs">
              Nessuna voce in questo giorno. Scegline un altro.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs">
                  {selected.size} di {entries.length} selezionate
                </p>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={allOn ? selectNone : selectAll}
                  >
                    {allOn ? "Deseleziona tutti" : "Seleziona tutti"}
                  </Button>
                </div>
              </div>

              <div className="-mx-1 flex flex-col gap-2 px-1">
                {MEAL_SLOTS_ORDERED.map((slot) => {
                  const items = grouped.get(slot) ?? [];
                  if (items.length === 0) return null;
                  const slotAllOn = items.every((e) => selected.has(e.id));
                  return (
                    <section key={slot} className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleSlot(items)}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 self-start text-[10px] font-semibold tracking-wider uppercase"
                      >
                        <MealSlotIcon slot={slot} className="h-3 w-3" />
                        {mealSlotShortLabel(slot)}
                        <span className="text-muted-foreground/70 normal-case tracking-normal">
                          ({slotAllOn ? "tutto" : `${items.filter((e) => selected.has(e.id)).length}/${items.length}`})
                        </span>
                      </button>
                      <ul className="flex flex-col gap-1">
                        {items.map((e) => {
                          const on = selected.has(e.id);
                          return (
                            <li key={e.id}>
                              <button
                                type="button"
                                onClick={() => toggleEntry(e.id)}
                                aria-pressed={on}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors",
                                  on
                                    ? "border-primary-500/40 bg-primary-500/5"
                                    : "border-border bg-card hover:bg-muted/40",
                                )}
                              >
                                <span
                                  className={cn(
                                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                                    on
                                      ? "border-primary-500 bg-primary-500 text-white"
                                      : "border-border bg-card",
                                  )}
                                >
                                  {on && <Check className="h-3 w-3" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">
                                    {e.description}
                                  </p>
                                  <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                                    {e.caloriesKcal} kcal
                                    {e.proteinG != null && ` · P${e.proteinG}g`}
                                    {e.carbsG != null && ` C${e.carbsG}g`}
                                    {e.fatG != null && ` F${e.fatG}g`}
                                  </p>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={copy.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={copy.isPending || selected.size === 0}
          >
            {copy.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Copia ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
