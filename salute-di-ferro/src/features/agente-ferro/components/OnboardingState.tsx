/**
 * OnboardingState · empty state per pazienti con profilo incompleto.
 *
 * Server Component puro. Viene mostrato quando la `persona` del briefing è
 * `"onboarding"` (`completeness < 60`). Mostra una checklist 4-step + CTA.
 *
 * Threshold step (basato su `completeness` 0-100):
 *   - 1. account creato → sempre ✓ (siamo loggati)
 *   - 2. dati medici → ≥ 25
 *   - 3. pannello ematico → ≥ 50
 *   - 4. prima call Coach → ≥ 75
 *
 * A11y:
 *  - `<section aria-labelledby>` + `<h2>`.
 *  - Checklist come `<ol>` semantica con icone aria-hidden.
 *  - Stato completato/pending reso testualmente per screen reader.
 */

import Link from "next/link";
import { Check, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  firstName: string;
  completeness: number;
};

type Step = {
  id: string;
  label: string;
  /** Threshold di `completeness` (0-100) sopra il quale lo step è completo. */
  threshold: number;
};

const STEPS: Step[] = [
  { id: "account", label: "Crea account", threshold: 0 },
  {
    id: "medical",
    label: "Inserisci dati medici (allergie, condizioni)",
    threshold: 25,
  },
  {
    id: "panel",
    label: "Prenota primo pannello ematico",
    threshold: 50,
  },
  {
    id: "coach-call",
    label: "Prima chiamata con i professionisti",
    threshold: 75,
  },
];

export function OnboardingState({ firstName, completeness }: Props) {
  const safePct = Math.min(100, Math.max(0, completeness));

  return (
    <section aria-labelledby="onboarding-heading">
      <Card className="p-8">
        <h2
          id="onboarding-heading"
          className="mb-2 text-xl font-semibold text-foreground"
        >
          Benvenuto, {firstName}.
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Per attivare l&apos;Agente di Ferro completa il tuo profilo. Bastano
          pochi minuti.
        </p>

        <ol role="list" className="mb-6 flex flex-col gap-2">
          {STEPS.map((step, idx) => {
            const done = safePct >= step.threshold;
            const prevDone =
              idx === 0 || safePct >= STEPS[idx - 1].threshold;
            const isCurrent = !done && prevDone;
            const stepNumber = idx + 1;
            return (
              <li
                key={step.id}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 text-sm",
                  done
                    ? "border-blue-500/20 bg-blue-500/10"
                    : "border-border bg-card",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border",
                    done
                      ? "border-blue-500/40 bg-blue-500/20 text-blue-500"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {done ? (
                    <Check className="size-4" />
                  ) : (
                    <Circle className="size-3" />
                  )}
                </span>
                <span className="sr-only">
                  Step {stepNumber} {done ? "completato" : "da completare"}:
                </span>
                <span
                  className={cn(
                    "flex-1",
                    done && "text-muted-foreground line-through",
                  )}
                >
                  <span className="mr-2 font-medium text-foreground/80">
                    {stepNumber}.
                  </span>
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex items-center justify-between gap-3">
          <div
            role="progressbar"
            aria-valuenow={safePct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`Profilo completo al ${safePct}%`}
            aria-label="Avanzamento profilo"
          >
            <p className="text-xs text-muted-foreground">
              Profilo completo al {safePct}%.
            </p>
          </div>
          <Button
            size="lg"
            render={
              <Link
                href="/dashboard/patient/profile"
                aria-label="Completa profilo paziente"
              >
                Completa profilo
              </Link>
            }
          />
        </div>
      </Card>
    </section>
  );
}
