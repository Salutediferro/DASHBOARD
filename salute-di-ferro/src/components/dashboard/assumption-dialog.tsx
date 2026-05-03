"use client";

import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { BookCheck, ChevronLeft, ChevronRight } from "lucide-react";
import {
  INTAKE_KEY,
  IntakeModifiers,
  IntakeNotesField,
  intakesKey,
  toIsoDate,
  todayIsoDate,
  type TherapyIntakeItem,
  type TherapySelfItem,
} from "@/app/dashboard/patient/supplementi/page";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";

interface AssumptionDialogProps {
  med: TherapySelfItem;
}

export function AssumptionDialog({ med }: AssumptionDialogProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(new Date());

  const isoDay = useMemo(() => toIsoDate(day.toISOString())!, [day]);
  const queryKey = useMemo(() => intakesKey(med.id), [med.id]);

  const advance = useCallback(
    (days: number) => {
      setDay((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() + days);

        return next;
      });
    },
    [setDay],
  );

  const intakes = useQuery<{ items: TherapyIntakeItem[] }>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/therapy/intake/${med.id}`);
      if (!res.ok) throw new Error("Errore caricamento");
      return res.json();
    },
  });

  const currentIntake = useMemo(() => {
    if (typeof intakes.data?.items === "undefined") return undefined;
    return intakes.data.items.find(
      (i) => toIsoDate(i.date as unknown as string) === isoDay,
    );
  }, [intakes.data?.items, isoDay]);

  const takenToday = currentIntake?.taken;

  const mutation = useMutation({
    mutationFn: async (args: { itemId: string; taken: boolean; notes?: string | null }) => {
      const body: Record<string, unknown> = {
        itemId: args.itemId,
        date: isoDay,
        taken: args.taken,
      };
      if (args.notes !== undefined) body.notes = args.notes;
      const res = await fetch("/api/therapy/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
    onMutate: async ({ itemId, taken, notes }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<{ items: TherapyIntakeItem[] }>(queryKey);

      qc.setQueryData<{ items: TherapyIntakeItem[] }>(queryKey, (old) => {
        const existing = old?.items ?? [];
        const previous = existing.find(
          (i) => i.itemId === itemId && toIsoDate(i.date as unknown as string) === isoDay,
        );
        const others = existing.filter(
          (i) => !(i.itemId === itemId && toIsoDate(i.date as unknown as string) === isoDay),
        );

        return {
          items: [
            ...others,
            {
              id: previous?.id ?? `optimistic-${itemId}-${isoDay}`,
              itemId,
              date: isoDay,
              taken,
              notes: notes !== undefined ? notes : (previous?.notes ?? null),
            },
          ],
        };
      });

      // Keep the page's TodayCheckCard cache in sync when the selected day is today.
      const wasToday = isoDay === todayIsoDate();
      let prevToday: { items: TherapyIntakeItem[] } | undefined;
      if (wasToday) {
        await qc.cancelQueries({ queryKey: INTAKE_KEY });
        prevToday = qc.getQueryData<{ items: TherapyIntakeItem[] }>(INTAKE_KEY);
        qc.setQueryData<{ items: TherapyIntakeItem[] }>(INTAKE_KEY, (old) => {
          const existing = old?.items ?? [];
          const previous = existing.find((i) => i.itemId === itemId);
          const others = existing.filter((i) => i.itemId !== itemId);
          return {
            items: [
              ...others,
              {
                id: previous?.id ?? `optimistic-${itemId}`,
                itemId,
                date: isoDay,
                taken,
                notes: notes !== undefined ? notes : (previous?.notes ?? null),
              },
            ],
          };
        });
      }

      return { prev, prevToday, wasToday };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      if (ctx?.prevToday) qc.setQueryData(INTAKE_KEY, ctx.prevToday);
      toast.error(e.message);
    },
    onSettled: (_d, _e, _v, ctx) => {
      qc.invalidateQueries({ queryKey, refetchType: "none" });
      if (ctx?.wasToday) {
        qc.invalidateQueries({ queryKey: INTAKE_KEY, refetchType: "none" });
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label="Assunzioni"
        type="button"
        className="hover:bg-muted text-muted-foreground inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs"
      >
        <BookCheck className="h-3.5 w-3.5" />
        Assunzioni
      </DialogTrigger>

      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assunzioni</DialogTitle>
          <DialogDescription>Modifica le tue assunzioni relative a "{med.name}".</DialogDescription>
        </DialogHeader>

        <div className="flex flex-row items-start">
          <button
            onClick={() => advance(-1)}
            aria-label="Precedente"
            className="hover:bg-muted text-muted-foreground inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="sr-only">Precedente</span>
          </button>

          <input
            type="date"
            name="assumption-date"
            className="hover:bg-muted text-muted-foreground inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs"
            value={isoDay}
            onChange={(e) => setDay(new Date(e.target.value))}
          />

          <button
            onClick={() => advance(1)}
            aria-label="Successivo"
            className="hover:bg-muted text-muted-foreground inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs"
          >
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="sr-only">Successivo</span>
          </button>
        </div>

        <IntakeModifiers
          state={typeof takenToday === "undefined" ? "pending" : takenToday ? "taken" : "skipped"}
          id={med.id}
          onMark={(itemId, taken) => mutation.mutate({ itemId, taken })}
        />

        <IntakeNotesField
          key={`${med.id}-${isoDay}-${currentIntake?.id ?? "none"}`}
          initialNotes={currentIntake?.notes ?? null}
          disabled={!currentIntake}
          onSave={(notes) => {
            if (!currentIntake) return;
            mutation.mutate({ itemId: med.id, taken: currentIntake.taken, notes });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
