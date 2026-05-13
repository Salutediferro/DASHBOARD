"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarSync,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FeedResponse = { url: string | null };

async function fetchFeed(): Promise<FeedResponse> {
  const res = await fetch("/api/me/calendar-feed");
  if (!res.ok) throw new Error("Errore");
  return res.json();
}

/**
 * "Sincronizza calendario" card. Lets a user generate, copy, rotate
 * and revoke their personal subscription URL. The URL plugs into
 * Google Calendar / Apple Calendar / Outlook as a read-only feed.
 */
export function CalendarSyncCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["calendar-feed"],
    queryFn: fetchFeed,
  });
  const url = data?.url ?? null;

  const generate = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/me/calendar-feed", { method: "POST" });
      if (!res.ok) throw new Error("Errore");
      return (await res.json()) as FeedResponse;
    },
    onSuccess: (next) => {
      qc.setQueryData(["calendar-feed"], next);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/me/calendar-feed", { method: "DELETE" });
      if (!res.ok) throw new Error("Errore");
      return (await res.json()) as FeedResponse;
    },
    onSuccess: (next) => {
      qc.setQueryData(["calendar-feed"], next);
      toast.success("Sincronizzazione disattivata");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiato");
    } catch {
      toast.error("Impossibile copiare");
    }
  }

  function regenerate() {
    if (
      url &&
      !confirm(
        "Generare un nuovo link? Quello precedente smetterà subito di funzionare.",
      )
    ) {
      return;
    }
    generate.mutate();
  }

  function doRevoke() {
    if (!confirm("Disattivare la sincronizzazione? I calendari iscritti smetteranno di aggiornarsi.")) {
      return;
    }
    revoke.mutate();
  }

  return (
    <section
      aria-labelledby="calendar-sync-title"
      className="surface-1 flex flex-col gap-4 rounded-xl p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2
            id="calendar-sync-title"
            className="text-display flex items-center gap-2 text-lg"
          >
            <CalendarSync className="h-4 w-4" aria-hidden />
            Sincronizza calendario
          </h2>
          <p className="text-sm text-muted-foreground">
            Aggiungi i tuoi appuntamenti a Google Calendar, Apple Calendar o
            Outlook. Iscriviti una sola volta — gli aggiornamenti arrivano
            automaticamente.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      ) : url ? (
        <>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-xs"
              aria-label="URL del feed calendario"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copy}
              aria-label="Copia link"
            >
              <Copy className="h-4 w-4" aria-hidden />
              <span className="ml-1 hidden sm:inline">Copia</span>
            </Button>
          </div>

          <details className="rounded-md border border-border/60 bg-muted/20 text-sm">
            <summary className="cursor-pointer select-none px-3 py-2 font-medium">
              Come iscriversi
            </summary>
            <div className="flex flex-col gap-3 px-3 pb-3 pt-1 text-muted-foreground">
              <ProviderSteps
                name="Google Calendar"
                href="https://calendar.google.com/calendar/r/settings/addbyurl"
                steps={[
                  "Apri Google Calendar sul computer.",
                  'Nel menu di sinistra, accanto a "Altri calendari", clicca + → "Da URL".',
                  "Incolla il link qui sopra e conferma.",
                ]}
              />
              <ProviderSteps
                name="Apple Calendar (iPhone / Mac)"
                steps={[
                  "Su iPhone: Impostazioni → Calendario → Account → Aggiungi account → Altro → Aggiungi calendario sottoscritto.",
                  "Su Mac: Calendario → File → Nuova sottoscrizione calendario.",
                  "Incolla il link e scegli la frequenza di aggiornamento.",
                ]}
              />
              <ProviderSteps
                name="Outlook"
                href="https://outlook.live.com/calendar/0/addfromweb"
                steps={[
                  'Nel web: Outlook Calendar → "Aggiungi calendario" → "Sottoscrivi dal Web".',
                  "Incolla il link, dai un nome e conferma.",
                ]}
              />
              <p className="text-xs">
                Suggerimento: gli aggiornamenti possono richiedere fino a poche
                ore — è il calendario che decide la frequenza di refresh.
              </p>
            </div>
          </details>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={regenerate}
              disabled={generate.isPending || revoke.isPending}
            >
              {generate.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              Rigenera link
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={doRevoke}
              disabled={generate.isPending || revoke.isPending}
            >
              {revoke.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-4 w-4" />
              )}
              Disattiva
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Non ancora attiva. Genera un link da incollare nel tuo calendario.
          </p>
          <Button
            type="button"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
          >
            {generate.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CalendarSync className="mr-1.5 h-4 w-4" />
            )}
            Genera link
          </Button>
        </div>
      )}
    </section>
  );
}

function ProviderSteps({
  name,
  href,
  steps,
}: {
  name: string;
  href?: string;
  steps: string[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {name}
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="focus-ring inline-flex items-center text-muted-foreground hover:text-foreground"
            aria-label={`Apri ${name}`}
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <ol className="list-decimal pl-5 text-xs leading-relaxed">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </div>
  );
}
