"use client";

import * as React from "react";
import { Loader2, Save, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { useCreateBiometric } from "@/lib/hooks/use-biometrics";
import { useMetricTargets } from "@/lib/hooks/use-metric-targets";
import { readApiError } from "@/lib/api-error";
import type { OverviewMetricKey } from "@/lib/hooks/use-overview-prefs";
import type { BiometricInput } from "@/lib/validators/biometric";
import { EDITOR_CONFIG, type EditorConfig } from "./metric-editor-config";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricKey: OverviewMetricKey;
  /** Card-style label, used as the dialog title. */
  label: string;
};

/**
 * Click-to-edit dialog for an overview card. Two stacked sections:
 *   1. "Nuova rilevazione" — posts a single value (or pair, for blood
 *      pressure) into BiometricLog (or upserts SymptomLog for mood/
 *      energy). Same write path the health page uses, so the entry
 *      appears in /dashboard/patient/health immediately.
 *   2. "Obiettivo personale" — saved to localStorage via
 *      `useMetricTargets`. Drives the card's red/yellow/green grade.
 *
 * Cards without an editor entry (computed metrics — weightDelta,
 * checkIns, nextAppointment) never get this dialog mounted.
 */
export function MetricEditorDialog({ open, onOpenChange, metricKey, label }: Props) {
  const config = EDITOR_CONFIG[metricKey];
  const { targets, setTarget, clearTarget } = useMetricTargets();
  const createBio = useCreateBiometric();
  const qc = useQueryClient();

  const upsertSymptom = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/symptom-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Errore salvataggio"));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["symptom-logs"] });
    },
  });

  // Inputs: single-value cards use v1/t1; composite (BP) also uses v2/t2.
  const [v1, setV1] = React.useState("");
  const [v2, setV2] = React.useState("");
  const [t1, setT1] = React.useState("");
  const [t2, setT2] = React.useState("");

  // Seed inputs only when the dialog opens (or the target metric
  // changes). Crucially we do NOT depend on `targets` here: the
  // optimistic update inside `setTarget` mutates `targets`, and if this
  // effect re-ran on every `targets` change it would silently overwrite
  // whatever the user just typed mid-submit — making it look like the
  // target wasn't saved when in fact the input was being clobbered.
  // We snapshot the target value once on open via a ref, then leave the
  // inputs alone until the dialog closes and re-opens.
  const initialTargetRef = React.useRef<typeof targets>(targets);
  React.useEffect(() => {
    if (!open) return;
    initialTargetRef.current = targets;
    setV1("");
    setV2("");
    const t = targets[metricKey];
    if (typeof t === "number") {
      setT1(String(t));
      setT2("");
    } else if (t && typeof t === "object") {
      setT1(String(t.systolic));
      setT2(String(t.diastolic));
    } else {
      setT1("");
      setT2("");
    }
    // `targets` is intentionally excluded from deps — see the doc comment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, metricKey]);

  if (!config) return null;
  const cfg = config; // narrowed local — closures can keep the discriminated type

  const isComposite = cfg.kind === "biometric" && !!cfg.composite;
  const isSubmitting = createBio.isPending || upsertSymptom.isPending;

  // Field metadata for the inputs (label/unit/range/step).
  const meta = inputMeta(cfg);
  const meta1 = meta[0];
  const meta2: Meta | undefined = meta.length === 2 ? meta[1] : undefined;

  function parseNum(raw: string): number | null {
    if (raw.trim() === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function rangeOk(value: number, m: Meta) {
    if (value < m.min || value > m.max) {
      toast.error(`${m.label}: tra ${m.min} e ${m.max}${m.unit ? ` ${m.unit}` : ""}`);
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const n1 = parseNum(v1);
    const n2 = parseNum(v2);
    const tn1 = parseNum(t1);
    const tn2 = parseNum(t2);

    // Snapshot from ref captured on open — `targets` itself can mutate
    // mid-submit via the optimistic update, but for the "did the user
    // already have a target" question we want the pre-submit state.
    const hadTarget = initialTargetRef.current[metricKey] != null;

    // Wrap target + entry saves in a single try block. The hook's
    // `onError` already surfaces a toast, so we don't double-toast here
    // — we just need to bail out cleanly without leaving the form in
    // limbo when the target PUT fails.
    try {
      if (cfg.kind === "biometric" && cfg.composite) {
        if (tn1 != null && tn2 != null && meta2) {
          if (!rangeOk(tn1, meta1) || !rangeOk(tn2, meta2)) return;
          await setTarget(metricKey, { systolic: tn1, diastolic: tn2 });
        } else if (hadTarget && t1.trim() === "" && t2.trim() === "") {
          await clearTarget(metricKey);
        }
      } else {
        if (tn1 != null) {
          if (!rangeOk(tn1, meta1)) return;
          await setTarget(metricKey, tn1);
        } else if (hadTarget && t1.trim() === "") {
          await clearTarget(metricKey);
        }
      }

      // No new reading? Done.
      const hasEntry = n1 != null || (isComposite && n2 != null);
      if (!hasEntry) {
        toast.success("Obiettivo aggiornato");
        onOpenChange(false);
        return;
      }

      // Validate the entry against the field range.
      if (n1 != null && !rangeOk(n1, meta1)) return;
      if (isComposite && n2 != null && meta2 && !rangeOk(n2, meta2)) return;

      if (cfg.kind === "biometric") {
        const fieldPayload: Record<string, number> = {};
        if (n1 != null) fieldPayload[cfg.fields[0].name] = n1;
        if (isComposite && n2 != null && cfg.fields.length === 2) {
          fieldPayload[cfg.fields[1].name] = n2;
        }
        const input: BiometricInput = {
          date: new Date().toISOString(),
          [cfg.category]: fieldPayload,
        } as BiometricInput;
        await createBio.mutateAsync(input);
      } else if (cfg.kind === "energy-level") {
        if (n1 == null) return;
        await createBio.mutateAsync({
          date: new Date().toISOString(),
          energyLevel: n1,
        } as BiometricInput);
      } else if (cfg.kind === "symptom") {
        if (n1 == null) return;
        await upsertSymptom.mutateAsync({
          date: new Date().toISOString().slice(0, 10),
          [cfg.field]: n1,
        });
      }
      toast.success("Rilevazione salvata");
      onOpenChange(false);
    } catch (err) {
      // The mutation hooks' onError handlers already surface a toast,
      // so re-toasting here would just spam the user. We only fall
      // through to a fresh toast for createBio / upsertSymptom which
      // don't have their own onError.
      const isTargetErr = err instanceof Error && /obiettivo/i.test(err.message);
      if (!isTargetErr) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    }
  }

  function handleClearTarget() {
    clearTarget(metricKey);
    setT1("");
    setT2("");
    toast.success("Obiettivo rimosso");
  }

  const hasTarget = targets[metricKey] != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            Inserisci una nuova rilevazione e/o aggiorna il tuo obiettivo personale.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* ── Nuova rilevazione ─────────────────────────────────── */}
          <section className="flex flex-col gap-3">
            <h3 className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              Nuova rilevazione
            </h3>
            <div className={isComposite ? "grid grid-cols-2 gap-3" : "grid gap-3"}>
              <ValueField id={`v1-${metricKey}`} meta={meta1} value={v1} onChange={setV1} />
              {isComposite && meta2 && (
                <ValueField id={`v2-${metricKey}`} meta={meta2} value={v2} onChange={setV2} />
              )}
            </div>
            <p className="text-muted-foreground text-[11px]">
              Lascia vuoto per saltare e salvare solo l&apos;obiettivo.
            </p>
          </section>

          {/* ── Obiettivo personale ───────────────────────────────── */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase">
                <Target className="h-3 w-3" aria-hidden />
                Obiettivo personale
              </h3>
              {hasTarget && (
                <button
                  type="button"
                  onClick={handleClearTarget}
                  className="focus-ring text-muted-foreground hover:text-destructive inline-flex items-center gap-1 rounded text-[11px] transition-colors"
                >
                  <Trash2 className="h-3 w-3" aria-hidden />
                  Rimuovi
                </button>
              )}
            </div>
            <div className={isComposite ? "grid grid-cols-2 gap-3" : "grid gap-3"}>
              <ValueField
                id={`t1-${metricKey}`}
                meta={meta1}
                value={t1}
                onChange={setT1}
                placeholder="Obiettivo"
              />
              {isComposite && meta2 && (
                <ValueField
                  id={`t2-${metricKey}`}
                  meta={meta2}
                  value={t2}
                  onChange={setT2}
                  placeholder="Obiettivo"
                />
              )}
            </div>
            <p className="text-muted-foreground text-[11px]">
              Salvato su questo dispositivo. Determina il colore (verde/giallo/rosso) della card.
            </p>
          </section>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Save className="mr-2 h-4 w-4" aria-hidden />
              )}
              Salva
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Meta = {
  label: string;
  unit?: string;
  min: number;
  max: number;
  step?: string;
  isInt?: boolean;
};

function inputMeta(config: EditorConfig): [Meta] | [Meta, Meta] {
  if (config.kind === "symptom") {
    return [{ label: config.label, unit: "/5", min: config.min, max: config.max, step: "1", isInt: true }];
  }
  if (config.kind === "energy-level") {
    return [{ label: config.label, unit: "/10", min: config.min, max: config.max, step: "1", isInt: true }];
  }
  if (config.fields.length === 2) {
    const [a, b] = config.fields;
    return [
      { label: a.label, unit: a.unit, min: a.min, max: a.max, step: a.step, isInt: a.isInt },
      { label: b.label, unit: b.unit, min: b.min, max: b.max, step: b.step, isInt: b.isInt },
    ];
  }
  const a = config.fields[0];
  return [{ label: a.label, unit: a.unit, min: a.min, max: a.max, step: a.step, isInt: a.isInt }];
}

function ValueField({
  id,
  meta,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  meta: Meta;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="flex items-baseline justify-between">
        <span>{meta.label}</span>
        {meta.unit && (
          <span className="text-muted-foreground text-[11px] font-normal">{meta.unit}</span>
        )}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={meta.min}
        max={meta.max}
        step={meta.step ?? "any"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="focus-ring tabular-nums"
      />
    </div>
  );
}
