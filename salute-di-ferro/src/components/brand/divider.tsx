import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DividerProps = {
  label?: ReactNode;
  className?: string;
};

export default function Divider({ label, className }: DividerProps) {
  if (!label) {
    return (
      <hr
        role="separator"
        className={cn("border-0 border-t border-border", className)}
      />
    );
  }

  return (
    <div
      role="separator"
      aria-label={typeof label === "string" ? label : undefined}
      className={cn("flex items-center gap-3", className)}
    >
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}
