"use client";

import * as React from "react";
import { Settings } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SortableCard } from "@/components/sortable-card";
import { cn } from "@/lib/utils";
import {
  OVERVIEW_DEFAULT,
  OVERVIEW_METRIC_KEYS,
  useOverviewPrefs,
  type OverviewMetricKey,
} from "@/lib/hooks/use-overview-prefs";
import type { PatientKpis } from "@/lib/queries/dashboard";
import {
  BMICard,
  CheckInsCard,
  NextAppointmentCard,
  WeightCard,
  WeightDeltaCard,
} from "./overview-cards";

interface PatientOverviewProps {
  kpis: PatientKpis;
}

type MetricDef = {
  label: string;
  description: string;
  Component: React.FC<{ kpis: PatientKpis }>;
};

const REGISTRY: Record<OverviewMetricKey, MetricDef> = {
  weight: {
    label: "Peso corrente",
    description: "Ultimo peso registrato + tendenza 14 giorni con sparkline.",
    Component: WeightCard,
  },
  weightDelta: {
    label: "Variazione peso",
    description: "Differenza in kg rispetto a 14 giorni fa, in evidenza.",
    Component: WeightDeltaCard,
  },
  bmi: {
    label: "BMI",
    description: "Indice di massa corporea con classificazione (sotto, normo, sopra, obesità).",
    Component: BMICard,
  },
  checkIns: {
    label: "Check-in settimana",
    description: "Conteggio della settimana corrente + barre dei 14 giorni precedenti.",
    Component: CheckInsCard,
  },
  nextAppointment: {
    label: "Prossimo appuntamento",
    description: "Data del prossimo impegno + scorciatoia agli appuntamenti.",
    Component: NextAppointmentCard,
  },
};

// Tailwind needs the literal class strings to be present somewhere it
// can statically scan, otherwise `lg:grid-cols-3` etc. get purged.
const LG_COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

export function PatientOverview({ kpis }: PatientOverviewProps) {
  const { selected, hydrated, toggle, setOrder, max } = useOverviewPrefs();
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  // Honour the user's drag-reordered sequence. Before hydration we fall
  // back to the canonical default order to keep SSR matching.
  const baseSelection = hydrated ? selected : OVERVIEW_DEFAULT;
  const visible = baseSelection.filter((k) =>
    (OVERVIEW_METRIC_KEYS as readonly string[]).includes(k),
  ) as OverviewMetricKey[];
  const cols = LG_COLS[Math.min(visible.length, max)] ?? LG_COLS[max];

  // Require ~5 px of pointer movement before a drag starts, so a click on
  // the link/card body isn't intercepted by the sortable wrapper.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = visible.indexOf(active.id as OverviewMetricKey);
    const to = visible.indexOf(over.id as OverviewMetricKey);
    if (from < 0 || to < 0) return;
    setOrder(arrayMove(visible, from, to));
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-end">
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger
            className="focus-ring border-input bg-background text-muted-foreground hover:bg-muted inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors"
            aria-label="Personalizza metriche"
            title="Personalizza metriche"
          >
            <Settings className="h-3.5 w-3.5" aria-hidden />
            Personalizza
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Metriche in evidenza</DialogTitle>
              <DialogDescription>
                Scegli fino a {max} metriche da mostrare in cima alla dashboard. Quelle non
                selezionate restano accessibili dalle altre sezioni.
              </DialogDescription>
            </DialogHeader>
            <ul className="divide-border/60 flex flex-col divide-y">
              {OVERVIEW_METRIC_KEYS.map((key) => {
                const meta = REGISTRY[key];
                const isSelected = selected.includes(key);
                const atCap = !isSelected && selected.length >= max;
                const isLast = isSelected && selected.length <= 1;
                return (
                  <li key={key} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium">{meta.label}</p>
                      <p className="text-muted-foreground text-xs">{meta.description}</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="focus-ring border-input accent-primary h-4 w-4 cursor-pointer rounded disabled:cursor-not-allowed disabled:opacity-50"
                        checked={isSelected}
                        disabled={atCap || isLast}
                        onChange={() => toggle(key)}
                        aria-label={`Mostra ${meta.label}`}
                      />
                      <span className="text-muted-foreground text-xs">
                        {isSelected ? "Visibile" : "Nascosta"}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="text-muted-foreground text-[11px]">
              Selezionate {selected.length}/{max}. La preferenza è salvata su questo dispositivo.
            </p>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visible} strategy={rectSortingStrategy}>
          <div className={cn("grid gap-3 grid-cols-1 sm:grid-cols-2", cols)}>
            {visible.map((key) => {
              const def = REGISTRY[key];
              const Component = def.Component;
              return (
                <SortableCard key={key} id={key}>
                  <Component kpis={kpis} />
                </SortableCard>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}

