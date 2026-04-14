"use client";

import * as React from "react";
import { Pause, Play, SkipForward, X } from "lucide-react";

type Props = {
  seconds: number;
  onComplete: () => void;
  onDismiss: () => void;
};

function beep() {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // ignore
  }
  if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
}

export function RestTimer({ seconds: initial, onComplete, onDismiss }: Props) {
  const [remaining, setRemaining] = React.useState(initial);
  const [running, setRunning] = React.useState(true);
  const firedRef = React.useRef(false);

  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  React.useEffect(() => {
    if (remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      beep();
      onComplete();
    }
  }, [remaining, onComplete]);

  const total = initial;
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
  const circumference = 2 * Math.PI * 90;
  const offset = circumference - (pct / 100) * circumference;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-md px-4 md:bottom-4">
      <div className="bg-card border-border relative rounded-xl border p-6 shadow-2xl">
        <button
          type="button"
          onClick={onDismiss}
          className="hover:bg-muted absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-md"
          aria-label="Chiudi"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="text-muted-foreground text-center text-xs font-semibold uppercase tracking-wider">
          Riposo
        </p>
        <div className="my-4 flex justify-center">
          <div className="relative h-48 w-48">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="#2a2a2a"
                strokeWidth="10"
              />
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="#c9a96e"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading text-5xl font-semibold tabular-nums">
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setRemaining((r) => Math.max(0, r - 30))}
            className="bg-muted hover:bg-muted/80 flex h-12 w-16 items-center justify-center rounded-md text-sm font-semibold"
          >
            -30s
          </button>
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="bg-primary text-primary-foreground flex h-14 w-14 items-center justify-center rounded-full"
            aria-label={running ? "Pausa" : "Riprendi"}
          >
            {running ? (
              <Pause className="h-6 w-6 fill-current" />
            ) : (
              <Play className="h-6 w-6 fill-current" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setRemaining((r) => r + 30)}
            className="bg-muted hover:bg-muted/80 flex h-12 w-16 items-center justify-center rounded-md text-sm font-semibold"
          >
            +30s
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="hover:bg-muted text-muted-foreground flex h-12 items-center gap-1 rounded-md border px-3 text-xs"
          >
            <SkipForward className="h-4 w-4" />
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
