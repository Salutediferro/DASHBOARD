"use client";

/**
 * Large animated checkmark for the final onboarding step.
 *
 * The circle fills in, then the check path traces via stroke-dasharray.
 * Pure SVG + CSS keyframes — no runtime JS.
 */
export function CompletionAnimation({ label }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center gap-4"
      role="status"
      aria-label="Onboarding completato"
    >
      <svg
        viewBox="0 0 120 120"
        className="h-32 w-32"
        aria-hidden
      >
        <defs>
          <linearGradient id="celebrate-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c0c0c0" />
            <stop offset="55%" stopColor="#8a8a8a" />
            <stop offset="100%" stopColor="#b22222" />
          </linearGradient>
        </defs>
        {/* Background ring (subtle) */}
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="var(--muted)"
          strokeWidth="6"
          opacity="0.4"
        />
        {/* Animated ring draw */}
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="url(#celebrate-ring)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="327"
          strokeDashoffset="327"
          transform="rotate(-90 60 60)"
          style={{ animation: "celebrate-ring 900ms ease-out 120ms forwards" }}
        />
        {/* Check path */}
        <path
          d="M 40 62 L 55 77 L 82 48"
          fill="none"
          stroke="#b22222"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="58"
          strokeDashoffset="58"
          style={{ animation: "celebrate-check 500ms ease-out 900ms forwards" }}
        />
      </svg>
      {label && (
        <p className="text-center text-sm text-muted-foreground">{label}</p>
      )}
      <style>{`
        @keyframes celebrate-ring {
          to { stroke-dashoffset: 0; }
        }
        @keyframes celebrate-check {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
