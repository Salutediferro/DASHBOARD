"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
};

/**
 * Generic biometric-entry form. Collects a single nested-category payload
 * (body / circumferences / …) plus the shared `date` field and submits it
 * to POST /api/biometrics.
 */
export function MetricForm({
  category,
  fields,
  readOnly,
  header,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = React.useState(today);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const create = useCreateBiometric();

  if (readOnly) return null;

  function setField(name: string, v: string) {
    setValues((s) => ({ ...s, [name]: v }));
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
    } as BiometricInput;

    try {
      await create.mutateAsync(input);
      toast.success("Misurazione salvata");
      setValues({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border flex flex-col gap-4 rounded-lg border p-4"
    >
      {header}
      <div className="grid gap-2">
        <Label htmlFor={`date-${category}`}>Data</Label>
        <Input
          id={`date-${category}`}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={today}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((f) => {
          const id = `f-${category}-${f.name}`;
          return (
            <div key={f.name} className="flex flex-col gap-1.5">
              <Label htmlFor={id}>
                {f.label}
                {f.unit && (
                  <span className="text-muted-foreground ml-1 text-xs">
                    ({f.unit})
                  </span>
                )}
              </Label>
              <Input
                id={id}
                type={f.type ?? "number"}
                inputMode={f.type === "time" ? "text" : "decimal"}
                step={f.step ?? (f.type === "time" ? undefined : "any")}
                placeholder={f.placeholder}
                value={values[f.name] ?? ""}
                onChange={(e) => setField(f.name, e.target.value)}
                className="tabular-nums"
              />
              {f.hint && (
                <p className="text-muted-foreground text-xs">{f.hint}</p>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salva misurazione
        </Button>
      </div>
    </form>
  );
}
