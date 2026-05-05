"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  OVERVIEW_METRIC_KEYS,
  type OverviewMetricKey,
} from "@/lib/overview-metric-keys";

// Display labels and groupings shared with the dashboard editor. Kept
// inline (not imported from patient-overview) to avoid pulling the full
// chart/registry tree into the onboarding bundle.
type MetricMeta = {
  label: string;
  description: string;
  category: string;
};

const METRIC_META: Record<OverviewMetricKey, MetricMeta> = {
  weight: {
    label: "Peso corrente",
    description: "Ultimo peso registrato + tendenza.",
    category: "Generale",
  },
  weightDelta: {
    label: "Variazione peso",
    description: "Differenza in kg rispetto a 14 giorni fa.",
    category: "Generale",
  },
  bmi: {
    label: "BMI",
    description: "Indice di massa corporea con classificazione.",
    category: "Generale",
  },
  checkIns: {
    label: "Check-in settimana",
    description: "Conteggio dei check-in della settimana.",
    category: "Generale",
  },
  nextAppointment: {
    label: "Prossimo appuntamento",
    description: "Data del prossimo impegno.",
    category: "Generale",
  },
  bodyFat: {
    label: "Massa grassa",
    description: "Percentuale di grasso corporeo.",
    category: "Composizione corporea",
  },
  muscleMass: {
    label: "Massa muscolare",
    description: "Massa muscolare in kg.",
    category: "Composizione corporea",
  },
  bodyWater: {
    label: "Acqua corporea",
    description: "Percentuale di acqua corporea.",
    category: "Composizione corporea",
  },
  waist: {
    label: "Vita",
    description: "Circonferenza vita (cm).",
    category: "Circonferenze",
  },
  hips: {
    label: "Fianchi",
    description: "Circonferenza fianchi (cm).",
    category: "Circonferenze",
  },
  chest: {
    label: "Torace",
    description: "Circonferenza torace (cm).",
    category: "Circonferenze",
  },
  arms: {
    label: "Braccia",
    description: "Circonferenza braccia (cm).",
    category: "Circonferenze",
  },
  thigh: {
    label: "Cosce",
    description: "Circonferenza cosce (cm).",
    category: "Circonferenze",
  },
  calves: {
    label: "Polpacci",
    description: "Circonferenza polpacci (cm).",
    category: "Circonferenze",
  },
  bloodPressure: {
    label: "Pressione arteriosa",
    description: "Sistolica/diastolica con classificazione.",
    category: "Pressione e cuore",
  },
  restingHR: {
    label: "Frequenza a riposo",
    description: "Battiti per minuto a riposo.",
    category: "Pressione e cuore",
  },
  spo2: {
    label: "Saturazione O₂",
    description: "Saturazione di ossigeno nel sangue.",
    category: "Pressione e cuore",
  },
  hrv: {
    label: "HRV",
    description: "Variabilità della frequenza cardiaca.",
    category: "Pressione e cuore",
  },
  glucoseFasting: {
    label: "Glicemia a digiuno",
    description: "Glicemia a digiuno (mg/dL).",
    category: "Metabolico",
  },
  glucosePostMeal: {
    label: "Glicemia post-pasto",
    description: "Glicemia 2h dopo il pasto.",
    category: "Metabolico",
  },
  bodyTempC: {
    label: "Temperatura corporea",
    description: "Temperatura in gradi Celsius.",
    category: "Metabolico",
  },
  ketones: {
    label: "Chetoni",
    description: "Chetoni nel sangue (mmol/L).",
    category: "Metabolico",
  },
  sleepHours: {
    label: "Ore di sonno",
    description: "Ore di sonno dell'ultima notte.",
    category: "Sonno",
  },
  sleepQuality: {
    label: "Qualità sonno",
    description: "Auto-valutazione qualità sonno.",
    category: "Sonno",
  },
  sleepAwakenings: {
    label: "Risvegli notturni",
    description: "Numero di risvegli durante la notte.",
    category: "Sonno",
  },
  steps: { label: "Passi", description: "Passi giornalieri.", category: "Attività" },
  caloriesBurned: {
    label: "Calorie bruciate",
    description: "Stima delle calorie bruciate.",
    category: "Attività",
  },
  activeMinutes: {
    label: "Minuti attivi",
    description: "Minuti di attività intensa.",
    category: "Attività",
  },
  distanceKm: {
    label: "Distanza percorsa",
    description: "Distanza giornaliera (km).",
    category: "Attività",
  },
  mood: {
    label: "Umore (diario)",
    description: "Auto-valutazione umore (1–5).",
    category: "Benessere",
  },
  energy: {
    label: "Energia (diario)",
    description: "Auto-valutazione energia (1–5).",
    category: "Benessere",
  },
  energyLevel: {
    label: "Livello energia",
    description: "Energia auto-riferita (1–10).",
    category: "Benessere",
  },
};

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

export function metricLabel(key: OverviewMetricKey): string {
  return METRIC_META[key]?.label ?? key;
}

type Props = {
  selected: OverviewMetricKey[];
  onToggle: (key: OverviewMetricKey) => void;
  /** Minimum metrics the user must keep selected. Defaults to 1 — an
   *  empty dashboard reads as broken. */
  minSelected?: number;
};

export function MetricSelector({ selected, onToggle, minSelected = 1 }: Props) {
  const isLast = selected.length <= minSelected;

  return (
    <div className="flex flex-col gap-4">
      {CATEGORY_ORDER.map((category) => {
        const keysInCat = OVERVIEW_METRIC_KEYS.filter(
          (k) => METRIC_META[k]?.category === category,
        );
        if (keysInCat.length === 0) return null;
        return (
          <section key={category} className="flex flex-col">
            <h3 className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
              {category}
            </h3>
            <ul className="divide-border/60 flex flex-col divide-y">
              {keysInCat.map((key) => {
                const meta = METRIC_META[key];
                const isSelected = selected.includes(key);
                const disabled = isSelected && isLast;
                return (
                  <li
                    key={key}
                    className={cn(
                      "flex items-center justify-between gap-3 py-2.5",
                    )}
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
                        disabled={disabled}
                        onChange={() => onToggle(key)}
                        aria-label={`Traccia ${meta.label}`}
                      />
                      <span className="text-muted-foreground text-xs">
                        {isSelected ? "Tracciata" : "Esclusa"}
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
  );
}
