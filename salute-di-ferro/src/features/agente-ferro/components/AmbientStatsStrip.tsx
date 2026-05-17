/**
 * AmbientStatsStrip · 4 metriche orizzontali "ambient".
 *
 * Server Component puro. Riceve i `BiometricsSummary` aggregati dal
 * briefing builder. Ogni colonna è un link al dettaglio in /health.
 *
 * A11y:
 *  - Ogni link ha `aria-label` esplicito (icona + valore + trend testuali).
 *  - Le icone Lucide sono `aria-hidden`.
 *  - Trend reso testualmente via screen-reader (`<span className="sr-only">`).
 *  - Touch target ≥44px via padding p-4.
 */

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Battery,
  HeartPulse,
  Moon,
  Scale,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { BiometricsSummary, Trend } from "@/lib/data/types";

type Props = {
  stats: BiometricsSummary;
};

const TREND_ICON: Record<Trend, typeof ArrowUp> = {
  up: ArrowUp,
  down: ArrowDown,
  flat: ArrowRight,
};

const TREND_LABEL: Record<Trend, string> = {
  up: "in aumento",
  down: "in calo",
  flat: "stabile",
};

function TrendArrow({ trend }: { trend: Trend }) {
  const Icon = TREND_ICON[trend];
  return (
    <>
      <Icon
        aria-hidden="true"
        className={cn(
          "inline size-4",
          trend === "up" && "text-amber-500",
          trend === "down" && "text-blue-500",
          trend === "flat" && "text-muted-foreground",
        )}
      />
      <span className="sr-only">{TREND_LABEL[trend]}</span>
    </>
  );
}

function StatTile({
  href,
  Icon,
  label,
  value,
  unit,
  trend,
}: {
  href: string;
  Icon: typeof Scale;
  label: string;
  value: string;
  unit?: string;
  trend: Trend;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card p-4",
        "transition-colors hover:bg-card/80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "min-h-[44px]",
      )}
      aria-label={`${label}: ${value}${unit ? ` ${unit}` : ""}, ${TREND_LABEL[trend]}`}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5 text-lg font-semibold leading-none text-foreground">
          <span>{value}</span>
          {unit ? (
            <span className="text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          ) : null}
          <TrendArrow trend={trend} />
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      </div>
    </Link>
  );
}

function formatNumber(value: number | null, decimals = 1): string {
  if (value === null || Number.isNaN(value)) return "—";
  return decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals);
}

export function AmbientStatsStrip({ stats }: Props) {
  const bp =
    stats.bloodPressure.sys !== null && stats.bloodPressure.dia !== null
      ? `${stats.bloodPressure.sys}/${stats.bloodPressure.dia}`
      : "—";

  return (
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">
        Metriche del giorno
      </h2>
      <ul
        role="list"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <li>
          <StatTile
            href="/dashboard/patient/health#weight"
            Icon={Scale}
            label="Peso"
            value={formatNumber(stats.weight.value)}
            unit="kg"
            trend={stats.weight.trend}
          />
        </li>
        <li>
          <StatTile
            href="/dashboard/patient/health#blood-pressure"
            Icon={HeartPulse}
            label="Pressione"
            value={bp}
            unit={bp !== "—" ? "mmHg" : undefined}
            trend={stats.bloodPressure.trend}
          />
        </li>
        <li>
          <StatTile
            href="/dashboard/patient/health#sleep"
            Icon={Moon}
            label="Sonno"
            value={formatNumber(stats.sleepHours.value)}
            unit="h"
            trend={stats.sleepHours.trend}
          />
        </li>
        <li>
          <StatTile
            href="/dashboard/patient/health#energy"
            Icon={Battery}
            label="Energia"
            value={formatNumber(stats.energyLevel.value)}
            unit="/5"
            trend={stats.energyLevel.trend}
          />
        </li>
      </ul>
    </section>
  );
}
