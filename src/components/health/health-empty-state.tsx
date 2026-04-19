import type { ReactNode } from "react";

// Empty state shown when a patient has zero biometric logs.
// SVG is inline + role="img" + <title>/<desc> for a11y.
export default function HealthEmptyState({ action }: { action?: ReactNode }) {
  return (
    <div className="surface-1 flex flex-col items-center gap-5 rounded-2xl border border-dashed border-primary-500/15 px-6 py-12 text-center">
      <EmblemSvg />
      <div className="flex flex-col gap-2">
        <h3 className="text-display text-xl">Nessuna rilevazione, ancora</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Registra la tua prima misurazione per costruire nel tempo una visione
          chiara della tua salute: peso, circonferenze, sonno, attività.
        </p>
      </div>
      {action}
    </div>
  );
}

function EmblemSvg() {
  return (
    <svg
      role="img"
      aria-labelledby="empty-health-title empty-health-desc"
      viewBox="0 0 160 140"
      className="h-28 w-32"
    >
      <title id="empty-health-title">Bilancia e cerchio di progresso</title>
      <desc id="empty-health-desc">
        Illustrazione minimale: un cerchio di progresso (ruota) e una bilancia
        stilizzata al centro.
      </desc>
      <defs>
        <linearGradient id="empty-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c0c0c0" />
          <stop offset="60%" stopColor="#8a8a8a" />
          <stop offset="100%" stopColor="#b22222" />
        </linearGradient>
      </defs>

      {/* Track */}
      <circle
        cx="80"
        cy="70"
        r="52"
        fill="none"
        stroke="var(--muted)"
        strokeWidth="10"
        opacity="0.5"
      />
      {/* Progress arc ~70% */}
      <circle
        cx="80"
        cy="70"
        r="52"
        fill="none"
        stroke="url(#empty-ring)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray="228 328"
        transform="rotate(-90 80 70)"
      />

      {/* Scale body */}
      <rect
        x="54"
        y="60"
        width="52"
        height="32"
        rx="5"
        fill="var(--card)"
        stroke="var(--accent-500)"
        strokeOpacity="0.35"
      />
      {/* Display readout */}
      <rect
        x="62"
        y="68"
        width="36"
        height="14"
        rx="2"
        fill="var(--background)"
      />
      <circle cx="70" cy="75" r="1.5" fill="#b22222" />
      <circle cx="76" cy="75" r="1.5" fill="var(--accent-500)" opacity="0.7" />
      <circle cx="82" cy="75" r="1.5" fill="var(--accent-500)" opacity="0.5" />
      {/* Feet */}
      <rect x="58" y="92" width="6" height="4" fill="var(--accent-500)" opacity="0.5" />
      <rect x="96" y="92" width="6" height="4" fill="var(--accent-500)" opacity="0.5" />
    </svg>
  );
}
