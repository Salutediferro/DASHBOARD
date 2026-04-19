"use client";

import * as React from "react";
import { Loader2, Minus, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCreateBiometric } from "@/lib/hooks/use-biometrics";
import type { BiometricInput } from "@/lib/validators/biometric";

type Category =
  | "body"
  | "circumferences"
  | "cardiovascular"
  | "metabolic"
  | "sleep"
  | "activity";

export type MetricField = {
  /** Name of the field inside its nested category (e.g. "weight"). */
  name: string;
  label: string;
  unit?: string;
  type?: "number" | "time";
  step?: string;
  placeholder?: string;
  /** Helpful hint displayed below the input. */
  hint?: string;
};

type Props = {
  category: Category;
  fields: MetricField[];
  /** Read-only mode hides the form entirely. */
  readOnly?: boolean;
  /** Extra content rendered above the fields (e.g. an auto-computed value). */
  header?: React.ReactNode;
  /** Called after a successful save. */
  onSaved?: () => void;
  /** Hide the date picker + compact layout for dialog use. */
  dense?: boolean;
};

export function MetricForm({
  category,
  fields,
  readOnly,
  header,
  onSaved,
  dense = false,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = React.useState(today);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [notes, setNotes] = React.useState("");
  const create = useCreateBiometric();

  if (readOnly) return null;

  function setField(name: string, v: string) {
    setValues((s) => ({ ...s, [name]: v }));
  }

  function adjust(field: MetricField, direction: 1 | -1) {
    const step = Number(field.step ?? "1");
    const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
    const current = Number(values[field.name]);
    const base = Number.isFinite(current) ? current : 0;
    const next = +(base + direction * safeStep).toFixed(2);
    setField(field.name, String(next));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const categoryPayload: Record<string, number | string | null> = {};
    for (const f of fields) {
      const raw = values[f.name];
      if (raw == null || raw === "") continue;
      if (f.type === "time") {
        categoryPayload[f.name] = raw;
      } else {
        const n = Number(raw);
        if (Number.isFinite(n)) categoryPayload[f.name] = n;
      }
    }

    if (Object.keys(categoryPayload).length === 0) {
      toast.error("Inserisci almeno un valore");
      return;
    }

    const input: BiometricInput = {
      date: new Date(date).toISOString(),
      [category]: categoryPayload,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    } as BiometricInput;

    try {
      await create.mutateAsync(input);
      toast.success("Rilevazione salvata");
      setValues({});
      setNotes("");
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex flex-col gap-4",
        !dense && "surface-1 rounded-xl p-4",
      )}
    >
      {header}

      <div className="grid gap-1.5">
        <Label htmlFor={`date-${category}`}>Data</Label>
        <Input
          id={`date-${category}`}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={today}
          className="focus-ring"
        />
      </div>

      <div className={cn("grid gap-3", dense ? "grid-cols-1" : "sm:grid-cols-2")}>
        {fields.map((f) => {
          const id = `f-${category}-${f.name}`;
          const isNumber = (f.type ?? "number") === "number";
          return (
            <div key={f.name} className="flex flex-col gap-1.5">
              <Label htmlFor={id} className="flex items-baseline justify-between">
                <span>{f.label}</span>
                {f.unit && (
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {f.unit}
                  </span>
                )}
              </Label>
              {isNumber ? (
                <StepperInput
                  id={id}
                  field={f}
                  value={values[f.name] ?? ""}
                  onChange={(v) => setField(f.name, v)}
                  onStep={(dir) => adjust(f, dir)}
                />
              ) : (
                <Input
                  id={id}
                  type={f.type}
                  inputMode="text"
                  placeholder={f.placeholder}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setField(f.name, e.target.value)}
                  className="tabular-nums focus-ring"
                />
              )}
              {f.hint && (
                <p className="text-[11px] text-muted-foreground">{f.hint}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`notes-${category}`}>Note (opzionale)</Label>
        <Textarea
          id={`notes-${category}`}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Contesto utile: allenamento, sintomi, alimentazione…"
          className="focus-ring resize-none"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={create.isPending} aria-busy={create.isPending}>
          {create.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="mr-2 h-4 w-4" aria-hidden />
          )}
          Salva rilevazione
        </Button>
      </div>
    </form>
  );
}

function StepperInput({
  id,
  field,
  value,
  onChange,
  onStep,
}: {
  id: string;
  field: MetricField;
  value: string;
  onChange: (v: string) => void;
  onStep: (direction: 1 | -1) => void;
}) {
  return (
    <div
      className="flex items-stretch rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring/50"
      data-slot="stepper"
    >
      <button
        type="button"
        aria-label={`Diminuisci ${field.label}`}
        onClick={() => onStep(-1)}
        className="focus-ring flex w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={field.step ?? "any"}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent text-center text-sm tabular-nums outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label={`Aumenta ${field.label}`}
        onClick={() => onStep(1)}
        className="focus-ring flex w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
