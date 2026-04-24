import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/**
 * Generic empty-state card. Use this when no section-specific
 * illustration is available — for the four main blank states
 * (appointments, reports, messages, biometrics) prefer the richer
 * components in `components/empty-states/index.tsx` which share the
 * same visual frame.
 *
 * Visual notes:
 *   - solid border (the previous dashed-at-10%-opacity was invisible
 *     on OLED displays in the wild — users read the section as "not
 *     loaded" rather than "empty")
 *   - soft radial backdrop with the brand accent so the card reads as
 *     a "featured" area instead of a placeholder hole
 *   - icon badge sits above the heading; heading/description stay
 *     centered and capped at `max-w-sm`
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-border/70 bg-card/60 px-6 py-10 text-center",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at top, color-mix(in oklab, var(--primary-500) 10%, transparent), transparent 70%)",
        }}
      />
      {Icon && (
        <span className="bg-primary-500/10 text-primary-500 relative inline-flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-primary-500/15">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      )}
      <h3 className="text-display relative max-w-sm text-lg">{title}</h3>
      {description && (
        <p className="text-muted-foreground relative max-w-sm text-sm">
          {description}
        </p>
      )}
      {action && <div className="relative mt-2">{action}</div>}
    </div>
  );
}
