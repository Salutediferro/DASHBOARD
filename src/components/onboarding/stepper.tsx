"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  steps: string[];
  /** 1-indexed current step. When > steps.length the whole bar shows "done". */
  current: number;
};

export function Stepper({ steps, current }: Props) {
  const total = steps.length;
  const clamped = Math.min(Math.max(current, 1), total);
  const progressPct =
    total <= 1 ? 100 : ((clamped - 1) / (total - 1)) * 100;

  return (
    <div className="flex flex-col gap-3" role="group" aria-label="Progresso onboarding">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-muted-foreground">
          Step <span className="text-foreground">{clamped}</span> di {total}
        </span>
        <span className="text-muted-foreground">
          {Math.round(progressPct)}%
        </span>
      </div>

      <div className="relative px-4">
        {/* Track */}
        <div
          aria-hidden
          className="absolute left-4 right-4 top-5 h-0.5 rounded-full bg-border"
        />
        {/* Filled bar */}
        <div
          aria-hidden
          className="absolute left-4 top-5 h-0.5 rounded-full bg-primary-500 transition-[width] duration-500 ease-out"
          style={{ width: `calc(${progressPct}% - ${progressPct === 0 ? 0 : 0}px)` }}
        />
        {/* Dots */}
        <ol className="relative flex items-start justify-between">
          {steps.map((label, i) => {
            const n = i + 1;
            const done = n < clamped;
            const active = n === clamped && current <= total;
            return (
              <li
                key={label}
                className="flex flex-col items-center gap-2"
                style={{ width: 0 }}
              >
                <span
                  className="absolute -top-8 whitespace-nowrap text-center text-[10px] font-semibold uppercase tracking-[0.14em] hidden md:block"
                  aria-hidden
                  style={{
                    left: `calc(${(i / (total - 1 || 1)) * 100}%)`,
                    transform: "translateX(-50%)",
                    color: active
                      ? "var(--primary-500)"
                      : done
                        ? "var(--foreground)"
                        : "var(--muted-foreground)",
                  }}
                >
                  {label}
                </span>
                <span
                  aria-current={active ? "step" : undefined}
                  aria-label={`${label} — ${done ? "completato" : active ? "in corso" : "da fare"}`}
                  className={cn(
                    "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                    done &&
                      "bg-primary text-primary-foreground border-0",
                    active &&
                      "bg-primary text-primary-foreground ring-4 ring-primary-500/40 animate-pulse shadow-[0_0_18px_rgba(178,34,34,0.35)]",
                    !done && !active &&
                      "bg-muted border border-border/60 text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden /> : n}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
