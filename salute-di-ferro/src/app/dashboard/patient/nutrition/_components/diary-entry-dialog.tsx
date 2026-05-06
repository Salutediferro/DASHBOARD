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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateDiaryEntry,
  useUpdateDiaryEntry,
  type DiaryEntry,
} from "@/lib/hooks/use-nutrition";
import {
  MEAL_SLOTS_ORDERED,
  mealSlotLabel,
  defaultMealSlotForHour,
} from "@/lib/nutrition-labels";
import type { MealSlot } from "@/lib/validators/nutrition";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** YYYY-MM-DD — the day the patient is editing. */
  date: string;
  /** When set, the dialog is in "edit" mode for that entry. */
  entry?: DiaryEntry | null;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function nowHm() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function combine(date: string, hm: string): string {
  // Build a local-time ISO. The server stores TIMESTAMPTZ — Date#toISOString
  // converts to UTC, which is what we send. Display reads back in local tz.
  return new Date(`${date}T${hm}`).toISOString();
}

function extractHm(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const numOrEmpty = (v: number | null | undefined) =>
  v == null ? "" : String(v);

const parseNum = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function DiaryEntryDialog({ open, onOpenChange, date, entry }: Props) {
  const create = useCreateDiaryEntry(date);
  const update = useUpdateDiaryEntry(date);
  const editing = !!entry;

  const [time, setTime] = React.useState<string>("");
  const [slot, setSlot] = React.useState<MealSlot>("LUNCH");
  const [description, setDescription] = React.useState("");
  const [calories, setCalories] = React.useState("");
  const [protein, setProtein] = React.useState("");
  const [carbs, setCarbs] = React.useState("");
  const [fat, setFat] = React.useState("");

  // Hydrate when (re)opening.
  React.useEffect(() => {
    if (!open) return;
    if (entry) {
      setTime(extractHm(entry.consumedAt));
      setSlot(entry.mealSlot);
      setDescription(entry.description);
      setCalories(String(entry.caloriesKcal));
      setProtein(numOrEmpty(entry.proteinG));
      setCarbs(numOrEmpty(entry.carbsG));
      setFat(numOrEmpty(entry.fatG));
    } else {
      const hm = nowHm();
      setTime(hm);
      const h = new Date().getHours();
      setSlot(defaultMealSlotForHour(h));
      setDescription("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
    }
  }, [open, entry]);

  const submitting = create.isPending || update.isPending;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cals = parseNum(calories);
    if (description.trim().length === 0) {
      toast.error("Inserisci una descrizione.");
      return;
    }
    if (cals == null || cals < 0) {
      toast.error("Le kcal sono obbligatorie.");
      return;
    }
    const payload = {
      consumedAt: combine(date, time || "12:00"),
      mealSlot: slot,
      description: description.trim(),
      caloriesKcal: Math.round(cals),
      proteinG: parseNum(protein),
      carbsG: parseNum(carbs),
      fatG: parseNum(fat),
    };
    const action = editing
      ? update.mutateAsync({ id: entry.id, ...payload })
      : create.mutateAsync(payload);
    action
      .then(() => {
        toast.success(editing ? "Voce aggiornata" : "Voce aggiunta");
        onOpenChange(false);
      })
      .catch((err: Error) => toast.error(err.message));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Modifica voce" : "Aggiungi voce al diario"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="meal-slot">Pasto</Label>
              <Select value={slot} onValueChange={(v) => setSlot(v as MealSlot)}>
                <SelectTrigger id="meal-slot">
                  <SelectValue>
                    {(v) => (v ? mealSlotLabel(v as MealSlot) : "")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MEAL_SLOTS_ORDERED.map((s) => (
                    <SelectItem key={s} value={s}>
                      {mealSlotLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="time">Ora</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Cosa hai mangiato</Label>
            <Textarea
              id="description"
              rows={2}
              maxLength={400}
              placeholder="Es. 100g di petto di pollo, 80g di riso integrale"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calories">Kcal</Label>
              <Input
                id="calories"
                type="number"
                inputMode="numeric"
                min={0}
                max={20000}
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="protein">Proteine (g)</Label>
              <Input
                id="protein"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={0}
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="carbs">Carboidrati (g)</Label>
              <Input
                id="carbs"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={0}
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fat">Grassi (g)</Label>
              <Input
                id="fat"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={0}
                value={fat}
                onChange={(e) => setFat(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Salva" : "Aggiungi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
