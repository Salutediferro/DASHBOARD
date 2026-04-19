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
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary-500/10 bg-card/40 px-6 py-10 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-500/10 text-primary-500">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      )}
      <h3 className="text-display text-lg">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
