import { cn } from "@/lib/utils";

type SkeletonProps = React.ComponentProps<"div"> & {
  /**
   * Shimmer = brand-red gradient swept horizontally (premium).
   * Pulse = plain opacity pulse (fallback / cheap).
   */
  variant?: "shimmer" | "pulse";
};

/**
 * Building-block skeleton block. Use `<Skeleton className="h-4 w-40" />`
 * for individual lines; compose several together inside `role="status"`
 * containers for full loading states. See
 * `components/dashboard/dashboard-skeleton.tsx` and loading.tsx files
 * for real-world compositions.
 */
export function Skeleton({
  className,
  variant = "shimmer",
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/60",
        variant === "pulse" && "animate-pulse",
        variant === "shimmer" && "skeleton-shimmer",
        className,
      )}
      {...props}
    />
  );
}
