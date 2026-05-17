"use client";

/**
 * ActionPlanList · top-5 azioni della settimana, con optimistic update.
 *
 * Client Component perché serve interattività (checkbox + optimistic state +
 * server action). Riceve il pacchetto già aggregato dal briefing.
 *
 * A11y:
 *  - `<section aria-labelledby>` + `<h2>` accessibile.
 *  - Checkbox semantico (`<button role="checkbox" aria-checked>`).
 *  - `aria-label` dinamico (segna come fatto / segnato come fatto).
 *  - Stato pending non blocca la nav: solo il button è disabilitato.
 *  - Link "dettagli" ha aria-label completo.
 *
 * Tono 3-livelli (mai destructive):
 *  - attention → ambra
 *  - informational → blu
 *  - silent → neutro
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { BriefingSummary } from "@/lib/data/types";
import {
  type ActionTone,
  actionHref,
  urgencyTone,
} from "@/features/agente-ferro/lib/urgency";
import {
  completeCheckIn,
  dismissAction,
  markTherapyTaken,
} from "@/features/agente-ferro/actions";

type Action = BriefingSummary["topActions"][number];

type Props = {
  actions: Action[];
};

const TONE_CONTAINER: Record<ActionTone, string> = {
  attention: "border-amber-500/20 bg-amber-500/10",
  informational: "border-blue-500/20 bg-blue-500/10",
  silent: "border-border bg-card",
};

const TONE_CHECK: Record<ActionTone, string> = {
  attention: "border-amber-500/40 text-amber-500",
  informational: "border-blue-500/40 text-blue-500",
  silent: "border-border text-foreground/60",
};

async function runAction(action: Action): Promise<{ ok: boolean }> {
  switch (action.kind) {
    case "therapy":
      if (action.itemId) {
        return markTherapyTaken(action.itemId);
      }
      return dismissAction(action.label);
    case "checkin":
      if (action.itemId) {
        return completeCheckIn(action.itemId);
      }
      return dismissAction(action.label);
    default:
      return dismissAction(action.itemId ?? action.label);
  }
}

function ActionPlanItem({
  action,
  onFeedback,
}: {
  action: Action;
  onFeedback: (msg: string) => void;
}) {
  const tone = urgencyTone(action.urgency);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const href = actionHref(action.kind, action.itemId);

  const handleToggle = () => {
    if (done || pending) return;
    setDone(true); // optimistic
    startTransition(async () => {
      const res = await runAction(action);
      if (!res.ok) {
        setDone(false); // rollback
        onFeedback(`Impossibile salvare ${action.label}. Riprova.`);
      } else {
        onFeedback(`${action.label} segnato come fatto`);
      }
    });
  };

  const isInactive = pending || done;

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3",
        TONE_CONTAINER[tone],
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={
          done
            ? `Segnato come fatto: ${action.label}`
            : `Segna come fatto: ${action.label}`
        }
        aria-disabled={isInactive ? "true" : undefined}
        onClick={handleToggle}
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isInactive && "opacity-60 cursor-default",
          TONE_CHECK[tone],
          done && "bg-foreground/10",
        )}
      >
        <Check
          aria-hidden="true"
          className={cn("size-5 transition-opacity", done ? "opacity-100" : "opacity-0")}
        />
      </button>
      <span
        className={cn(
          "flex-1 text-sm",
          done && "text-muted-foreground line-through",
        )}
      >
        {action.label}
      </span>
      <Link
        href={href}
        aria-label={`Apri dettagli: ${action.label}`}
        className={cn(
          "flex size-11 items-center justify-center rounded-md text-muted-foreground",
          "hover:bg-foreground/5 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        <ChevronRight aria-hidden="true" className="size-5" />
      </Link>
    </li>
  );
}

export function ActionPlanList({ actions }: Props) {
  const [feedback, setFeedback] = useState<string | null>(null);

  if (actions.length === 0) {
    return (
      <section aria-labelledby="action-plan-heading" className="mt-2">
        <h2
          id="action-plan-heading"
          className="mb-3 text-base font-semibold text-foreground"
        >
          Cose da fare questa settimana
        </h2>
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Nessuna azione da segnare oggi. Goditi la giornata.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="action-plan-heading" className="mt-2">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {feedback}
      </div>
      <h2
        id="action-plan-heading"
        className="mb-3 text-base font-semibold text-foreground"
      >
        Cose da fare questa settimana
      </h2>
      <ul role="list" className="flex flex-col gap-2">
        {actions.slice(0, 5).map((action, idx) => (
          <ActionPlanItem
            key={action.itemId ?? `${action.kind}-${idx}`}
            action={action}
            onFeedback={setFeedback}
          />
        ))}
      </ul>
    </section>
  );
}
