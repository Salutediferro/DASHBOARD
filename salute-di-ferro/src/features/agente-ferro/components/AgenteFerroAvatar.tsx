"use client";

/**
 * AgenteFerroAvatar · SVG inline 4 stati animati.
 *
 * Stati:
 *  - idle: respiro lento (scale loop 1.0 → 1.02)
 *  - listening: pulse esterno (orbe lenta)
 *  - thinking: 3 dot animati alternati
 *  - speaking: onda verticale (mouth)
 *
 * A11y (review accessibility-lead 6 mag 2026):
 *  - aria-hidden="true" sull'SVG · stato comunicato via live region testuale separata
 *    nel componente padre (AgenteFerroChat).
 *  - prefers-reduced-motion: disattiva TUTTE le animazioni; lo stato visivo
 *    è ancora distinguibile via colore badge sotto avatar.
 *
 * Persona (placeholder, non illustrazione finale):
 *  - silhouette astratta circolare con simbolo croce SDF + accenti rossi
 *  - illustrazione guerriero brand SDF arriverà post-MVP da freelance illustratore.
 */

import { cn } from "@/lib/utils";

export type AgenteFerroAvatarState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking";

export type AgenteFerroAvatarSize = "sm" | "md" | "lg" | "xl";

const SIZE_PX: Record<AgenteFerroAvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 96,
  xl: 160,
};

interface Props {
  state?: AgenteFerroAvatarState;
  size?: AgenteFerroAvatarSize;
  className?: string;
}

export function AgenteFerroAvatar({
  state = "idle",
  size = "md",
  className,
}: Props) {
  const px = SIZE_PX[size];
  return (
    <span
      className={cn(
        "agente-ferro-avatar relative inline-flex shrink-0 items-center justify-center",
        className
      )}
      data-state={state}
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        width={px}
        height={px}
        role="presentation"
        focusable="false"
      >
        {/* Outer ring · pulses on listening, glows accent on speaking */}
        <circle
          className="agente-ferro-avatar__ring"
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.3"
        />

        {/* Inner orb · breathing on idle */}
        <circle
          className="agente-ferro-avatar__orb"
          cx="50"
          cy="50"
          r="38"
          fill="url(#agente-ferro-avatar-gradient)"
        />

        {/* SDF-style emblem (cross + arc, brand-aligned, abstract) */}
        <g
          className="agente-ferro-avatar__emblem"
          transform="translate(50 50)"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        >
          <line x1="-12" y1="0" x2="12" y2="0" />
          <line x1="0" y1="-12" x2="0" y2="12" />
          <path d="M -18 14 Q 0 26 18 14" opacity="0.7" />
        </g>

        {/* Thinking dots — visibili solo se state=thinking */}
        <g
          className="agente-ferro-avatar__dots"
          transform="translate(50 78)"
          fill="rgba(255,255,255,0.9)"
        >
          <circle cx="-10" cy="0" r="2.5" />
          <circle cx="0" cy="0" r="2.5" />
          <circle cx="10" cy="0" r="2.5" />
        </g>

        {/* Speaking wave — bottom band visibile solo se state=speaking */}
        <path
          className="agente-ferro-avatar__wave"
          d="M 24 78 Q 32 72 40 78 T 56 78 T 72 78 T 88 78"
          stroke="rgba(255,255,255,0.95)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />

        <defs>
          <linearGradient
            id="agente-ferro-avatar-gradient"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#7A0815" />
            <stop offset="100%" stopColor="#500511" />
          </linearGradient>
        </defs>
      </svg>

      {/* Stato fallback: badge colorato sotto-destra · serve a distinguere stati
          quando le animazioni sono disabled da prefers-reduced-motion. */}
      <span
        className="agente-ferro-avatar__badge"
        style={{
          width: Math.max(8, px / 8),
          height: Math.max(8, px / 8),
        }}
      />

      <style>{`
        .agente-ferro-avatar { color: var(--foreground); }
        .agente-ferro-avatar__badge {
          position: absolute;
          right: 4%;
          bottom: 4%;
          border-radius: 9999px;
          border: 2px solid var(--background, #0a0a0c);
          background: rgb(120, 130, 140);
          transition: background-color 200ms ease;
        }
        .agente-ferro-avatar[data-state="idle"] .agente-ferro-avatar__badge { background: rgb(120, 130, 140); }
        .agente-ferro-avatar[data-state="listening"] .agente-ferro-avatar__badge { background: rgb(78, 196, 154); }
        .agente-ferro-avatar[data-state="thinking"] .agente-ferro-avatar__badge { background: rgb(236, 196, 71); }
        .agente-ferro-avatar[data-state="speaking"] .agente-ferro-avatar__badge { background: rgb(236, 71, 87); }

        /* Show/hide stato-specific glyphs */
        .agente-ferro-avatar__dots,
        .agente-ferro-avatar__wave { opacity: 0; transition: opacity 240ms ease; }
        .agente-ferro-avatar[data-state="thinking"] .agente-ferro-avatar__dots { opacity: 1; }
        .agente-ferro-avatar[data-state="speaking"] .agente-ferro-avatar__wave { opacity: 1; }

        @media (prefers-reduced-motion: no-preference) {
          .agente-ferro-avatar[data-state="idle"] .agente-ferro-avatar__orb {
            transform-origin: center;
            animation: agente-ferro-breath 3.6s ease-in-out infinite;
          }
          .agente-ferro-avatar[data-state="listening"] .agente-ferro-avatar__ring {
            transform-origin: center;
            animation: agente-ferro-pulse 1.8s ease-in-out infinite;
          }
          .agente-ferro-avatar[data-state="thinking"] .agente-ferro-avatar__dots circle:nth-child(1) {
            animation: agente-ferro-dot 1.2s ease-in-out infinite;
          }
          .agente-ferro-avatar[data-state="thinking"] .agente-ferro-avatar__dots circle:nth-child(2) {
            animation: agente-ferro-dot 1.2s ease-in-out infinite 0.2s;
          }
          .agente-ferro-avatar[data-state="thinking"] .agente-ferro-avatar__dots circle:nth-child(3) {
            animation: agente-ferro-dot 1.2s ease-in-out infinite 0.4s;
          }
          .agente-ferro-avatar[data-state="speaking"] .agente-ferro-avatar__wave {
            animation: agente-ferro-wave 1.4s ease-in-out infinite;
          }
        }

        @keyframes agente-ferro-breath {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.02); opacity: 0.95; }
        }
        @keyframes agente-ferro-pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50%      { transform: scale(1.08); opacity: 0.6; }
        }
        @keyframes agente-ferro-dot {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50%      { opacity: 1;   transform: translateY(-2px); }
        }
        @keyframes agente-ferro-wave {
          0%, 100% { transform: scaleY(1); }
          50%      { transform: scaleY(1.5); transform-origin: center; }
        }
      `}</style>
    </span>
  );
}

/**
 * Etichette testuali stato · usate dal componente padre per il live region
 * sr-only sincronizzato (vedi report a11y · sezione G).
 *
 * `idle` ritorna stringa vuota: nessun annuncio quando è inattivo, altrimenti
 * lo screen reader si stancherebbe ad ogni transizione.
 */
export const AGENTE_FERRO_STATE_LABELS: Record<AgenteFerroAvatarState, string> = {
  idle: "",
  listening: "L'agente sta ascoltando",
  thinking: "L'agente sta pensando",
  speaking: "L'agente sta rispondendo",
};
