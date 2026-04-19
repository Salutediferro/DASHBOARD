import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MetricRingProps = {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: ReactNode;
  sublabel?: ReactNode;
  gradientId?: string;
  className?: string;
  ariaLabel?: string;
};

export default function MetricRing({
  value,
  max = 1,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  gradientId,
  className,
  ariaLabel,
}: MetricRingProps) {
  const pct = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * pct;
  const id = gradientId ?? `ring-${Math.round(size)}-${Math.round(strokeWidth)}`;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel ?? `${Math.round(pct * 100)}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c0c0c0" />
            <stop offset="55%" stopColor="#8a8a8a" />
            <stop offset="100%" stopColor="#b22222" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
          opacity={0.5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      {(label !== undefined || sublabel !== undefined) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          {label !== undefined && (
            <span className="text-display text-xl tabular-nums">{label}</span>
          )}
          {sublabel !== undefined && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
