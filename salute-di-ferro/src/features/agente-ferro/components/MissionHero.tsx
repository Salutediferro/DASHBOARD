/**
 * MissionHero · hero card "above the fold" della pagina proattiva.
 *
 * 60% dello spazio visivo iniziale → comunica la UNA cosa da fare oggi.
 * Riceve direttamente `mission` (la `page.tsx` fa un'unica chiamata a
 * `buildBriefing()` e distribuisce le slice ai figli, così evitiamo
 * fetch ridondanti anche con cache HIT).
 *
 * A11y:
 *  - Heading `<h2>` (la page espone già l'<h1>).
 *  - Label `🎯 Mission oggi` resa con `aria-hidden` sull'emoji e testo
 *    semantico nel paragrafo wrapper.
 *  - CTA è un `<a>` (Link) renderizzato dentro `Button` base-ui — keyboard
 *    nativo + focus-visible ring dal token.
 */

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BriefingMission } from "@/lib/data/types";

type Props = {
  mission: BriefingMission;
};

export function MissionHero({ mission }: Props) {
  return (
    <section aria-labelledby="mission-heading">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-card p-8 ring-1 ring-primary/20">
        <p className="mb-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
          <span aria-hidden="true">🎯</span>
          Mission oggi
        </p>
        <h2
          id="mission-heading"
          className="mb-6 text-2xl font-semibold leading-snug text-foreground"
        >
          {mission.text}
        </h2>
        <Button
          size="lg"
          nativeButton={false}
          render={
            <Link href={mission.ctaHref}>{mission.ctaLabel}</Link>
          }
        />
      </Card>
    </section>
  );
}
