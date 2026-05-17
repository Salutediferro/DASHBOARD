/**
 * AgentCTA · entry point alla chat dell'Agente con suggested chips.
 *
 * Server Component puro. Riceve il briefing per generare chip contestuali:
 *   - se ci sono marker `attention` → "Spiegami i marker da rivedere"
 *   - se c'è un appointment Coach < 7gg → "Prepara domande per il Coach"
 *   - sempre → "Cambia obiettivo peso"
 *
 * A11y:
 *  - `<section aria-labelledby>` con `<h2>` accessibile.
 *  - Lista chip come `<ul role="list">` con `<li>` per ogni chip.
 *  - Ogni chip ha aria-label esplicito (la chat la apre con il testo precompilato).
 */

import Link from "next/link";
import { HeartHandshake, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { isAgenteFerroChatEnabled } from "@/features/agente-ferro/lib";
import type { BriefingSummary } from "@/lib/data/types";

type Props = {
  briefing: BriefingSummary;
};

function buildChips(briefing: BriefingSummary): string[] {
  const chips: string[] = [];

  if (briefing.attentionCount > 0) {
    chips.push("Spiegami i marker da rivedere");
  }

  if (briefing.nextAppointment) {
    const days = Math.floor(
      (briefing.nextAppointment.startTime.getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );
    if (days <= 7 && briefing.nextAppointment.professional.role === "COACH") {
      chips.push("Prepara domande per i professionisti");
    }
  }

  chips.push("Cambia obiettivo peso");
  return chips;
}

function chipHref(chip: string): string {
  return `/dashboard/patient/agente/chat?q=${encodeURIComponent(chip)}`;
}

/**
 * Placeholder mostrato quando la chat AI è disabilitata via feature flag
 * (`NEXT_PUBLIC_ENABLE_AGENTE_CHAT !== "1"`). Indirizza l'utente al Team di
 * Ferro (tutti i professionisti) per qualunque domanda — coerente con UE
 * AI Act human-oversight.
 */
function ChatDisabledPlaceholder() {
  return (
    <section aria-labelledby="agent-cta-heading">
      <Card className="p-6">
        <div className="mb-3 flex items-center gap-2">
          <HeartHandshake
            aria-hidden="true"
            className="size-5 text-primary"
          />
          <h2
            id="agent-cta-heading"
            className="text-base font-semibold text-foreground"
          >
            Hai una domanda?
          </h2>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          La chat con l&apos;Agente di Ferro arriverà nelle prossime settimane.
          Per ora, qualunque dubbio sul tuo percorso passa direttamente dai
          tuoi professionisti.
        </p>
        <Button
          variant="outline"
          render={
            <Link
              href="/dashboard/patient/team"
              aria-label="Vai al Team di Ferro per parlare con i professionisti"
            >
              Parla con i professionisti <span aria-hidden="true">→</span>
            </Link>
          }
        />
      </Card>
    </section>
  );
}

export function AgentCTA({ briefing }: Props) {
  if (!isAgenteFerroChatEnabled()) {
    return <ChatDisabledPlaceholder />;
  }

  const chips = buildChips(briefing);

  return (
    <section aria-labelledby="agent-cta-heading">
      <Card className="p-6">
        <div className="mb-3 flex items-center gap-2">
          <MessageCircle aria-hidden="true" className="size-5 text-primary" />
          <h2
            id="agent-cta-heading"
            className="text-base font-semibold text-foreground"
          >
            Parla con l&apos;Agente
          </h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Vuoi chiedermi qualcosa? Parti da uno di questi spunti o apri la chat
          intera.
        </p>
        <ul role="list" className="mb-5 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={chip}>
              <Link
                href={chipHref(chip)}
                aria-label={`Inizia chat: ${chip}`}
                className={cn(
                  "inline-flex min-h-[44px] items-center rounded-full border border-border bg-card px-3 py-2 text-sm text-foreground",
                  "transition-colors hover:bg-foreground/5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                )}
              >
                {chip}
              </Link>
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          render={
            <Link
              href="/dashboard/patient/agente/chat"
              aria-label="Apri la chat intera con l'Agente"
            >
              Apri chat intera <span aria-hidden="true">→</span>
            </Link>
          }
        />
      </Card>
    </section>
  );
}
