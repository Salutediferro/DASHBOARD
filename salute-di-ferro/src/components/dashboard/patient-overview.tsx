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
  BloodPressureCard,
  CheckInsCard,
  NextAppointmentCard,
  SimpleMetricCard,
  WeightCard,
  WeightDeltaCard,
} from "./overview-cards";

interface PatientOverviewProps {
  kpis: PatientKpis;
}

type MetricDef = {
  label: string;
  description: string;
  category: string;
  Component: React.FC<{ kpis: PatientKpis }>;
};

// Helper that wires SimpleMetricCard to a particular metric. Keeps the
// REGISTRY readable — every entry is a one-liner instead of an inline arrow.
function makeSimple(
  metricKey: Parameters<typeof SimpleMetricCard>[0]["metricKey"],
  label: string,
  unit?: string,
  invertDelta = false,
  format?: (v: number) => string,
): React.FC<{ kpis: PatientKpis }> {
  const C: React.FC<{ kpis: PatientKpis }> = ({ kpis }) => (
    <SimpleMetricCard
      kpis={kpis}
      metricKey={metricKey}
      label={label}
      unit={unit}
      invertDelta={invertDelta}
      format={format}
    />
  );
  C.displayName = `SimpleMetricCard(${metricKey})`;
  return C;
}

const fmtInt = (v: number) => Math.round(v).toLocaleString("it-IT");
const fmt2 = (v: number) => v.toFixed(2);

const REGISTRY: Record<OverviewMetricKey, MetricDef> = {
  // ---- Generale ----
  weight: {
    label: "Peso corrente",
    description: "Ultimo peso registrato + tendenza 14 giorni con sparkline.",
    category: "Generale",
    Component: WeightCard,
  },
  weightDelta: {
    label: "Variazione peso",
    description: "Differenza in kg rispetto a 14 giorni fa, in evidenza.",
    category: "Generale",
    Component: WeightDeltaCard,
  },
  bmi: {
    label: "BMI",
    description: "Indice di massa corporea con classificazione (sotto, normo, sopra, obesità).",
    category: "Generale",
    Component: BMICard,
  },
  checkIns: {
    label: "Check-in settimana",
    description: "Conteggio della settimana corrente + barre dei 14 giorni precedenti.",
    category: "Generale",
    Component: CheckInsCard,
  },
  nextAppointment: {
    label: "Prossimo appuntamento",
    description: "Data del prossimo impegno + scorciatoia agli appuntamenti.",
    category: "Generale",
    Component: NextAppointmentCard,
  },

  // ---- Composizione corporea ----
  bodyFat: {
    label: "Massa grassa",
    description: "Percentuale di grasso corporeo dall'ultima rilevazione.",
    category: "Composizione corporea",
    Component: makeSimple("bodyFat", "Massa grassa", "%", true),
  },
  muscleMass: {
    label: "Massa muscolare",
    description: "Massa muscolare in kg dall'ultima rilevazione.",
    category: "Composizione corporea",
    Component: makeSimple("muscleMass", "Massa muscolare", "kg"),
  },
  bodyWater: {
    label: "Acqua corporea",
    description: "Percentuale di acqua corporea totale.",
    category: "Composizione corporea",
    Component: makeSimple("bodyWater", "Acqua corporea", "%"),
  },

  // ---- Circonferenze ----
  waist: {
    label: "Vita",
    description: "Circonferenza vita (cm) — utile per il rischio metabolico.",
    category: "Circonferenze",
    Component: makeSimple("waist", "Vita", "cm", true),
  },
  hips: {
    label: "Fianchi",
    description: "Circonferenza fianchi (cm).",
    category: "Circonferenze",
    Component: makeSimple("hips", "Fianchi", "cm"),
  },
  chest: {
    label: "Torace",
    description: "Circonferenza torace (cm).",
    category: "Circonferenze",
    Component: makeSimple("chest", "Torace", "cm"),
  },
  arms: {
    label: "Braccia",
    description: "Circonferenza braccia (cm).",
    category: "Circonferenze",
    Component: makeSimple("arms", "Braccia", "cm"),
  },
  thigh: {
    label: "Cosce",
    description: "Circonferenza cosce (cm).",
    category: "Circonferenze",
    Component: makeSimple("thigh", "Cosce", "cm"),
  },
  calves: {
    label: "Polpacci",
    description: "Circonferenza polpacci (cm).",
    category: "Circonferenze",
    Component: makeSimple("calves", "Polpacci", "cm"),
  },

  // ---- Pressione e cuore ----
  bloodPressure: {
    label: "Pressione arteriosa",
    description: "Sistolica/diastolica (mmHg) con classificazione.",
    category: "Pressione e cuore",
    Component: BloodPressureCard,
  },
  restingHR: {
    label: "Frequenza a riposo",
    description: "Battiti per minuto a riposo (bpm).",
    category: "Pressione e cuore",
    Component: makeSimple("restingHR", "Freq. a riposo", "bpm", true, fmtInt),
  },
  spo2: {
    label: "Saturazione O₂",
    description: "Saturazione di ossigeno nel sangue (%).",
    category: "Pressione e cuore",
    Component: makeSimple("spo2", "SpO₂", "%"),
  },
  hrv: {
    label: "HRV",
    description: "Variabilità della frequenza cardiaca (ms).",
    category: "Pressione e cuore",
    Component: makeSimple("hrv", "HRV", "ms", false, fmtInt),
  },

  // ---- Metabolico ----
  glucoseFasting: {
    label: "Glicemia a digiuno",
    description: "Glicemia a digiuno (mg/dL).",
    category: "Metabolico",
    Component: makeSimple("glucoseFasting", "Glicemia a digiuno", "mg/dL", true, fmtInt),
  },
  glucosePostMeal: {
    label: "Glicemia post-pasto",
    description: "Glicemia 2h dopo il pasto (mg/dL).",
    category: "Metabolico",
    Component: makeSimple("glucosePostMeal", "Glicemia post-pasto", "mg/dL", true, fmtInt),
  },
  bodyTempC: {
    label: "Temperatura corporea",
    description: "Temperatura in gradi Celsius.",
    category: "Metabolico",
    Component: makeSimple("bodyTempC", "Temperatura", "°C"),
  },
  ketones: {
    label: "Chetoni",
    description: "Chetoni nel sangue (mmol/L).",
    category: "Metabolico",
    Component: makeSimple("ketones", "Chetoni", "mmol/L", false, fmt2),
  },

  // ---- Sonno ----
  sleepHours: {
    label: "Ore di sonno",
    description: "Ore di sonno dell'ultima notte registrata.",
    category: "Sonno",
    Component: makeSimple("sleepHours", "Ore di sonno", "h"),
  },
  sleepQuality: {
    label: "Qualità sonno",
    description: "Auto-valutazione qualità sonno (1–10).",
    category: "Sonno",
    Component: makeSimple("sleepQuality", "Qualità sonno", "/10", false, fmtInt),
  },
  sleepAwakenings: {
    label: "Risvegli notturni",
    description: "Numero di risvegli durante la notte.",
    category: "Sonno",
    Component: makeSimple("sleepAwakenings", "Risvegli", undefined, true, fmtInt),
  },

  // ---- Attività ----
  steps: {
    label: "Passi",
    description: "Passi giornalieri.",
    category: "Attività",
    Component: makeSimple("steps", "Passi", undefined, false, fmtInt),
  },
  caloriesBurned: {
    label: "Calorie bruciate",
    description: "Stima delle calorie bruciate (kcal).",
    category: "Attività",
    Component: makeSimple("caloriesBurned", "Calorie bruciate", "kcal", false, fmtInt),
  },
  activeMinutes: {
    label: "Minuti attivi",
    description: "Minuti di attività intensa nella giornata.",
    category: "Attività",
    Component: makeSimple("activeMinutes", "Minuti attivi", "min", false, fmtInt),
  },
  distanceKm: {
    label: "Distanza percorsa",
    description: "Distanza giornaliera (km).",
    category: "Attività",
    Component: makeSimple("distanceKm", "Distanza", "km"),
  },

  // ---- Benessere ----
  mood: {
    label: "Umore (diario)",
    description: "Auto-valutazione umore dal diario (1–5).",
    category: "Benessere",
    Component: makeSimple("mood", "Umore", "/5", false, fmtInt),
  },
  energy: {
    label: "Energia (diario)",
    description: "Auto-valutazione energia dal diario (1–5).",
    category: "Benessere",
    Component: makeSimple("energy", "Energia", "/5", false, fmtInt),
  },
  energyLevel: {
    label: "Livello energia",
    description: "Energia auto-riferita nel pannello biometrico (1–10).",
    category: "Benessere",
    Component: makeSimple("energyLevel", "Livello energia", "/10", false, fmtInt),
  },
};

// Stable display order for the dialog: groups in the order users learn
// them (general → composition → measurements → vitals → metabolic →
// sleep → activity → wellbeing).
const CATEGORY_ORDER = [
  "Generale",
  "Composizione corporea",
  "Circonferenze",
  "Pressione e cuore",
  "Metabolico",
  "Sonno",
  "Attività",
  "Benessere",
] as const;

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
            {/* Many metrics — keep the dialog itself fixed and scroll only
                the list, so the header / footer stay anchored. */}
            <div className="-mx-6 max-h-[55vh] overflow-y-auto px-6">
              {CATEGORY_ORDER.map((category) => {
                const keysInCat = OVERVIEW_METRIC_KEYS.filter(
                  (k) => REGISTRY[k].category === category,
                );
                if (keysInCat.length === 0) return null;
                return (
                  <section key={category} className="flex flex-col">
                    <h3 className="text-muted-foreground mt-4 mb-1 text-[10px] font-semibold tracking-wide uppercase first:mt-0">
                      {category}
                    </h3>
                    <ul className="divide-border/60 flex flex-col divide-y">
                      {keysInCat.map((key) => {
                        const meta = REGISTRY[key];
                        const isSelected = selected.includes(key);
                        const atCap = !isSelected && selected.length >= max;
                        const isLast = isSelected && selected.length <= 1;
                        return (
                          <li
                            key={key}
                            className="flex items-center justify-between gap-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{meta.label}</p>
                              <p className="text-muted-foreground text-xs">
                                {meta.description}
                              </p>
                            </div>
                            <label className="inline-flex shrink-0 cursor-pointer items-center gap-2">
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
                  </section>
                );
              })}
            </div>
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

