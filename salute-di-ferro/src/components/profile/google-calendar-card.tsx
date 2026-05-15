"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarCheck,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Trash2,
  Video,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StatusResponse = {
  configured: boolean;
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
};

async function fetchStatus(): Promise<StatusResponse> {
  const res = await fetch("/api/google/status");
  if (!res.ok) throw new Error("Errore");
  return res.json();
}

/**
 * "Collega Google Calendar" card on the doctor / coach profile page.
 *
 * When connected, every appointment the pro accepts gets:
 *   - a real meet.google.com link minted by the Calendar API
 *   - an event written to the pro's primary calendar (kept in sync on
 *     reschedule / cancel)
 *
 * When not connected, acceptances still go through — the patient gets
 * the same confirmation email, just without a Meet link.
 *
 * Reads `?google=ok|denied|error` from the URL on first paint to show a
 * toast right after the OAuth bounce-back without forcing a hard
 * reload. The query string is cleaned up via history.replaceState so
 * the toast doesn't re-fire on the next render.
 */
export function GoogleCalendarCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["google-status"],
    queryFn: fetchStatus,
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("google");
    if (!status) return;
    if (status === "ok") {
      toast.success("Google Calendar collegato");
      qc.invalidateQueries({ queryKey: ["google-status"] });
    } else if (status === "denied") {
      toast.message("Connessione annullata");
    } else {
      toast.error("Connessione a Google fallita. Riprova.");
    }
    params.delete("google");
    const next = `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}`;
    window.history.replaceState(null, "", next);
  }, [qc]);

  const disconnect = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/google/disconnect", { method: "DELETE" });
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Google Calendar scollegato");
      qc.invalidateQueries({ queryKey: ["google-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function doDisconnect() {
    if (
      !confirm(
        "Scollegare Google Calendar? I prossimi appuntamenti accettati non avranno più un link Meet generato automaticamente.",
      )
    ) {
      return;
    }
    disconnect.mutate();
  }

  return (
    <section
      aria-labelledby="google-calendar-title"
      className="surface-1 flex flex-col gap-4 rounded-xl p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2
            id="google-calendar-title"
            className="text-display flex items-center gap-2 text-lg"
          >
            <Video className="h-4 w-4" aria-hidden />
            Google Calendar &amp; Meet
          </h2>
          <p className="text-sm text-muted-foreground">
            Collega il tuo account Google: quando accetti una richiesta di
            appuntamento, creiamo automaticamente un link Meet e aggiungiamo
            l&apos;evento al tuo calendario.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      ) : !data?.configured ? (
        <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          Integrazione non ancora configurata su questo ambiente. Avvisa
          l&apos;amministratore se vuoi usarla.
        </div>
      ) : data.connected ? (
        <>
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              Connesso come <span className="font-medium text-foreground">{data.email}</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={doDisconnect}
              disabled={disconnect.isPending}
            >
              {disconnect.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-4 w-4" />
              )}
              Scollega
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Nessun account Google collegato.
          </p>
          {/*
            Plain <a> rather than a button-handler so the browser
            performs a full top-level navigation. The OAuth flow needs
            to actually leave the SPA — coming back as an `xhr` won't
            re-cookie us correctly.
          */}
          <a
            href="/api/google/oauth/start"
            className={cn(buttonVariants({ variant: "default" }))}
          >
            <CalendarCheck className="mr-1.5 h-4 w-4" />
            Collega Google Calendar
            <ExternalLink className="ml-1.5 h-3 w-3" aria-hidden />
          </a>
        </div>
      )}
    </section>
  );
}
