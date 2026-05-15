/**
 * BodySystemGrid · 5 accordion (uno per sistema fisiologico).
 *
 * Server Component (l'accordion è base-ui, che è progressive enhanced — il
 * client lo idrata sul punto d'uso). Riceve i `BodySystemStatus` aggregati
 * dal briefing builder.
 *
 * A11y:
 *  - Accordion base-ui ARIA-completo (button + region).
 *  - Heading `<h2>` per il titolo della sezione, `<h3>` annidato nel trigger.
 *  - Badge "attention" usa ambra, NON destructive red.
 *  - Markers resi come `<dl>/<dt>/<dd>` per supportare screen reader.
 */

import Link from "next/link";
import { Accordion } from "@base-ui/react/accordion";
import {
  Activity,
  Battery,
  ChevronDown,
  Flame,
  Heart,
  Moon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type {
  BodySystemKey,
  BodySystemStatus,
  SystemTone,
} from "@/lib/data/types";

type Props = {
  systems: BodySystemStatus[];
};

const SYSTEM_META: Record<
  BodySystemKey,
  { label: string; Icon: LucideIcon }
> = {
  recovery: { label: "Recovery & Sonno", Icon: Moon },
  hormones: { label: "Ormoni & Asse androgenico", Icon: Activity },
  cardio: { label: "Cardio", Icon: Heart },
  metabolic: { label: "Metabolico", Icon: Flame },
  energy: { label: "Energia & Ferro", Icon: Battery },
};

const TONE_TEXT: Record<SystemTone, string> = {
  attention: "text-amber-500",
  informational: "text-blue-500",
  silent: "text-foreground/60",
};

function attentionMarkersCount(s: BodySystemStatus): number {
  return s.markers.filter((m) => m.tone === "attention").length;
}

export function BodySystemGrid({ systems }: Props) {
  return (
    <section aria-labelledby="body-system-heading">
      <h2
        id="body-system-heading"
        className="mb-3 text-base font-semibold text-foreground"
      >
        Sistemi del corpo
      </h2>
      <Accordion.Root
        // Multipli aperti contemporaneamente — il paziente può fare scan veloce.
        multiple
        className="flex flex-col gap-2"
      >
        {systems.map((status) => {
          const meta = SYSTEM_META[status.system];
          const Icon = meta.Icon;
          const attentionCount = attentionMarkersCount(status);

          return (
            <Accordion.Item
              key={status.system}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <Accordion.Header className="m-0">
                <Accordion.Trigger
                  className={cn(
                    "group flex w-full items-center gap-3 p-4 text-left",
                    "min-h-[44px]",
                    "transition-colors hover:bg-foreground/5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn("size-5 shrink-0", TONE_TEXT[status.tone])}
                  />
                  <h3 className="flex-1 text-sm font-medium text-foreground">
                    {meta.label}
                  </h3>
                  {status.tone === "attention" && attentionCount > 0 ? (
                    <Badge
                      variant="outline"
                      className="border-amber-500/20 bg-amber-500/10 text-amber-500"
                    >
                      {attentionCount === 1
                        ? "1 marker da rivedere"
                        : `${attentionCount} marker da rivedere`}
                    </Badge>
                  ) : null}
                  <ChevronDown
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180"
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel className="border-t border-border bg-background/40 px-4 pb-4 pt-3 text-sm">
                <p className="mb-3 text-foreground/80">{status.summary}</p>
                {status.markers.length > 0 ? (
                  <dl className="flex flex-col gap-2">
                    {status.markers.map((marker) => (
                      <div
                        key={marker.name}
                        className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-border/60 pt-2 first:border-t-0 first:pt-0"
                      >
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {marker.name}
                        </dt>
                        <dd
                          className={cn(
                            "text-sm font-medium",
                            TONE_TEXT[marker.tone],
                          )}
                        >
                          <Link
                            href={`/dashboard/patient/medical-records?marker=${encodeURIComponent(marker.name)}`}
                            aria-label={`Vedi referto sorgente per ${marker.name}`}
                            className={cn(
                              "rounded-sm underline-offset-2 hover:underline",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            )}
                          >
                            {marker.value}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              ({marker.range})
                            </span>
                          </Link>
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-xs italic text-muted-foreground">
                    Nessun marker recente da rivedere per questo sistema.
                  </p>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion.Root>
    </section>
  );
}
