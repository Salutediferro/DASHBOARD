/**
 * AgenteFerroBanner · disclaimer compliance UE AI Act art. 50.
 *
 * Sempre visibile. Non dismissibile per design (la trasparenza chatbot
 * deve essere percepibile per tutta la durata dell'interazione).
 *
 * A11y (review accessibility-lead 6 mag 2026):
 *  - <aside role="note"> + heading sr-only "Avviso intelligenza artificiale"
 *    → diventa landmark navigation per screen reader.
 *  - NON usare role="alert" o role="status" (è contenuto statico, non dinamico).
 *  - NON usare role="banner" (riservato all'header pagina).
 *  - Icona Info + testo esplicito: WCAG 1.4.1 (uso del colore).
 */

import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { AI_DISCLAIMER } from "@/features/agente-ferro/lib";

interface Props {
  className?: string;
}

export function AgenteFerroBanner({ className }: Props) {
  return (
    <aside
      role="note"
      aria-labelledby="agente-ferro-banner-title"
      className={cn(
        "border-b border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground",
        className
      )}
    >
      <h2 id="agente-ferro-banner-title" className="sr-only">
        Avviso intelligenza artificiale
      </h2>
      <p className="flex items-start gap-2">
        <Info
          className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70"
          aria-hidden="true"
        />
        <span>
          <strong className="font-semibold text-foreground">Sono un&apos;AI, non un medico.</strong>{" "}
          {AI_DISCLAIMER.replace("Sono un'AI, non un medico. ", "")}{" "}
          In caso di emergenza contatta il <strong>112</strong>.
        </span>
      </p>
    </aside>
  );
}
