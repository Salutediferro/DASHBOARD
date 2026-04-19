"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, Home, RotateCcw } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Route-segment error boundary for the whole app. Catches render
 * errors in any server/client component inside the current tree and
 * offers a graceful recovery UI.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      Sentry.captureException(error);
    } else {
      // In dev we still log to the console so the developer notices.
      console.error("[App error boundary]", error);
    }
  }, [error]);

  return <ErrorSurface error={error} reset={reset} />;
}

// Exported so global-error.tsx can reuse the same visual without
// duplicating the markup (global-error renders outside the root layout
// so it needs its own <html>/<body>).
export function ErrorSurface({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [open, setOpen] = useState(false);

  const detail =
    error.digest && process.env.NODE_ENV === "production"
      ? `Codice errore: ${error.digest}`
      : error.message || "Errore sconosciuto";

  return (
    <main
      role="alert"
      aria-live="assertive"
      className="page-in flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-10 text-center"
    >
      <div
        aria-hidden
        className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive"
      >
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-display text-2xl">Qualcosa è andato storto</h1>
        <p className="text-sm text-muted-foreground">
          Abbiamo registrato l&apos;errore e lo stiamo controllando. Puoi
          provare a riaprire la pagina o tornare alla dashboard.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={reset}>
          <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
          Riprova
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            window.location.href = "/dashboard";
          }}
        >
          <Home className="mr-1.5 h-4 w-4" aria-hidden />
          Torna alla dashboard
        </Button>
      </div>

      <details
        open={open}
        onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
        className="w-full max-w-md text-left"
      >
        <summary
          className={cn(
            "focus-ring inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground",
            "marker:hidden [&::-webkit-details-marker]:hidden",
          )}
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
          Dettagli tecnici
        </summary>
        <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-border/60 bg-card/50 p-3 text-[11px] leading-snug text-muted-foreground">
          {detail}
        </pre>
      </details>
    </main>
  );
}
