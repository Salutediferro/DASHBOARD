"use client";

import { MessageSquare } from "lucide-react";

/**
 * Empty-state surface shown in the right-hand pane when no conversation
 * is selected. On mobile this page isn't reachable visually — the
 * layout hides it and the sidebar fills the viewport (see layout.tsx).
 */
export default function MessagesPage() {
  return (
    <div className="hidden h-full items-center justify-center lg:flex">
      <div className="flex max-w-sm flex-col items-center gap-4 px-6 text-center">
        <EmptyIllustration />
        <div className="flex flex-col gap-1.5">
          <h2 className="text-display text-lg">Seleziona una conversazione</h2>
          <p className="text-sm text-muted-foreground">
            Scegli un contatto dalla colonna di sinistra per aprire la chat,
            oppure avvia una nuova conversazione con il pulsante{" "}
            <span className="text-foreground">+</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

// Minimal, brand-coherent illustration: a chat bubble on top of a
// chrome-to-red gradient ring. <title>/<desc> included for SR users.
function EmptyIllustration() {
  return (
    <svg
      role="img"
      aria-labelledby="empty-msg-title empty-msg-desc"
      viewBox="0 0 160 140"
      className="h-28 w-32"
    >
      <title id="empty-msg-title">Nuvoletta di conversazione</title>
      <desc id="empty-msg-desc">
        Illustrazione minimale: una nuvoletta con tre punti al centro di un
        cerchio di progresso cromato.
      </desc>
      <defs>
        <linearGradient id="empty-msg-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c0c0c0" />
          <stop offset="55%" stopColor="#8a8a8a" />
          <stop offset="100%" stopColor="#b22222" />
        </linearGradient>
      </defs>
      <circle
        cx="80"
        cy="70"
        r="52"
        fill="none"
        stroke="var(--muted)"
        strokeWidth="10"
        opacity="0.5"
      />
      <circle
        cx="80"
        cy="70"
        r="52"
        fill="none"
        stroke="url(#empty-msg-ring)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray="210 328"
        transform="rotate(-90 80 70)"
      />
      {/* Chat bubble */}
      <path
        d="M 56 54 h 48 a 8 8 0 0 1 8 8 v 20 a 8 8 0 0 1 -8 8 h -24 l -10 10 v -10 h -14 a 8 8 0 0 1 -8 -8 v -20 a 8 8 0 0 1 8 -8 z"
        fill="var(--card)"
        stroke="var(--accent-500)"
        strokeOpacity="0.4"
      />
      <circle cx="72" cy="72" r="2" fill="var(--accent-500)" opacity="0.8" />
      <circle cx="80" cy="72" r="2" fill="#b22222" />
      <circle cx="88" cy="72" r="2" fill="var(--accent-500)" opacity="0.8" />
    </svg>
  );
}
