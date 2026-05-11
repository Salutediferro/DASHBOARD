"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
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
import { useCopyDay, type DiaryEntry } from "@/lib/hooks/use-nutrition";
import { mealSlotLabel } from "@/lib/nutrition-labels";
import type { MealSlot } from "@/lib/validators/nutrition";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** YYYY-MM-DD of the day the meal is copied FROM. */
  sourceDate: string;
  slot: MealSlot;
  entries: DiaryEntry[];
};

/** YYYY-MM-DD → next day in YYYY-MM-DD. */
function nextDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
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
 * Replicate a single meal (one slot) from the current diary view onto
 * another day. Built for the meal-prep flow where the same lunch gets
 * cloned across several days.
 */
export function ReplicateMealDialog({
  open,
  onOpenChange,
  sourceDate,
  slot,
  entries,
}: Props) {
  const [targetDate, setTargetDate] = React.useState<string>(() =>
    nextDay(sourceDate),
  );
  const copy = useCopyDay();

  React.useEffect(() => {
    if (!open) return;
    setTargetDate(nextDay(sourceDate));
  }, [open, sourceDate]);

  const sameDay = targetDate === sourceDate;
  const canConfirm = entries.length > 0 && !sameDay && !copy.isPending;

  function onConfirm() {
    if (!canConfirm) return;
    copy
      .mutateAsync({
        sourceDate,
        targetDate,
        entryIds: entries.map((e) => e.id),
      })
      .then((res) => {
        toast.success(
          res.created === 1
            ? `1 voce replicata in ${fmtDay(targetDate)}`
            : `${res.created} voci replicate in ${fmtDay(targetDate)}`,
        );
        onOpenChange(false);
      })
      .catch((err: Error) => toast.error(err.message));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="pr-8">
          <DialogTitle>Replica {mealSlotLabel(slot).toLowerCase()}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            {entries.length === 1
              ? "1 voce"
              : `${entries.length} voci`}{" "}
            da {fmtDay(sourceDate)}.
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="replicate-target-date">Giorno destinazione</Label>
            <Input
              id="replicate-target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              {fmtDay(targetDate)}
              {sameDay && " — scegli un giorno diverso da quello di origine"}
            </p>
          </div>
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
          <Button type="button" onClick={onConfirm} disabled={!canConfirm}>
            {copy.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Replica
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
