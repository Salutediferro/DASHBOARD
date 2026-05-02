"use client";

import type { BiometricLogDTO } from "@/lib/hooks/use-biometrics";
import { SectionHeader } from "../brand";
import { MetricRingCard, type RingMetric } from "./metric-ring-card";
import type { PatientProfile, PrimaryKey } from "./health-tabs";
import { useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Edit } from "lucide-react";
import { useLocalStorageState } from "ahooks";

function latestOf(items: BiometricLogDTO[], key: PrimaryKey): number | null {
  for (const r of items) {
    const v = r[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function progressLowerBetter(current: number | null, target: number | null): number {
  if (current == null || target == null || target === 0) return 0;
  if (current <= target) return 1;
  return Math.max(0, Math.min(1, target / current));
}

export function getMapping(key: PrimaryKey): MetricConfig | undefined {
  const values = Object.values(METRICS)
    .map((o) => Object.entries(o))
    .flat();

  const map = values.find(([k]) => k === key);
  if (map) return map[1];
}

function computeRingMetrics(
  items: BiometricLogDTO[],
  profile: PatientProfile,
  selected: PrimaryKey[],
): RingMetric[] {
  const latest: [PrimaryKey, number | null][] = selected.map((k) => [k, latestOf(items, k)]);
  const isFemale = profile.sex === "FEMALE";

  return latest.map(([key, value]) => {
    const mapping = getMapping(key);
    let target: number | null = null;

    switch (key) {
      case "weight":
        target = profile.targetWeightKg;
        break;

      case "bmi":
        target = 22;
        break;

      case "waistCm":
        target = isFemale ? 80 : 94;
        break;

      case "bodyFatPercentage":
        isFemale ? 22 : 15;
        break;
    }

    return {
      name: key as string,
      unit: mapping?.unit ?? "",
      label: mapping?.label ?? key[0].toUpperCase() + key.slice(1),
      target,
      value,
      progress: progressLowerBetter(value, target),
    };
  });
}

interface HealthRingRowProps {
  items: BiometricLogDTO[];
  profile: PatientProfile;
}

export type MetricConfig = { label: string; unit?: string };

export const METRICS: Record<string, Partial<Record<PrimaryKey, MetricConfig>>> = {
  Corporei: {
    weight: { label: "Peso", unit: "kg" },
    bmi: { label: "BMI" },
    bodyFatPercentage: { label: "% Grasso" },
    muscleMassKg: { label: "Massa muscolare", unit: "kg" },
    bodyWaterPct: { label: "Acqua corporea", unit: "%" },
  },
  Circonferenze: {
    waistCm: { label: "Vita", unit: "cm" },
    hipsCm: { label: "Fianchi", unit: "cm" },
    chestCm: { label: "Petto", unit: "cm" },
    armsCm: { label: "Braccia", unit: "cm" },
    thighCm: { label: "Coscia", unit: "cm" },
    calvesCm: { label: "Polpaccio", unit: "cm" },
  },
  Cardiovascolare: {
    systolicBP: { label: "PA sistolica", unit: "mmHg" },
    diastolicBP: { label: "PA diastolica", unit: "mmHg" },
    restingHR: { label: "FC riposo", unit: "bpm" },
    spo2: { label: "SpO2", unit: "%" },
    hrv: { label: "HRV", unit: "ms" },
  },
  Metabolica: {
    glucoseFasting: { label: "Glicemia digiuno", unit: "mg/dL" },
    glucosePostMeal: { label: "Glicemia post-pasto", unit: "mg/dL" },
    ketones: { label: "Chetoni", unit: "mmol/L" },
    bodyTempC: { label: "Temperatura corporea", unit: "°C" },
  },
  Sonno: {
    sleepHours: { label: "Ore dormite", unit: "h" },
    sleepQuality: { label: "Qualità del sonno" },
    sleepWakeTime: { label: "Risvegli" },
  },
  Attività: {
    steps: { label: "Passi" },
    caloriesBurned: { label: "Kcal bruciate" },
    activeMinutes: { label: "Minuti attivi", unit: "min" },
    distanceKm: { label: "Distanza", unit: "km" },
  },
} as const;

export function HealthRingRow({ items, profile }: HealthRingRowProps) {
  const [editing, setEditing] = useState(false);
  const [metrics, setMetrics] = useLocalStorageState<PrimaryKey[]>("tracked-metrics", {
    defaultValue: ["weight", "bmi", "waistCm", "bodyFatPercentage"],
  });

  const rings = useMemo(
    () => computeRingMetrics(items, profile, metrics),
    [items, profile, metrics],
  );

  const onToggle = useCallback(
    (key: PrimaryKey) =>
      setMetrics((m) => {
        if (typeof m === "undefined") return [];

        if (m.includes(key)) return m.filter((k) => k !== key);
        return [...m, key];
      }),
    [setMetrics],
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-row items-center justify-between">
        <SectionHeader title="Panoramica" subtitle="Le tue metriche chiave a portata di mano." />

        <Dialog open={editing} onOpenChange={setEditing}>
          <DialogTrigger className="focus-ring bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors">
            <Edit className="h-4 w-4" aria-hidden />
            Modifica
          </DialogTrigger>
          <DialogContent className="sm:max-w-md md:max-w-lg">
            <DialogHeader>
              <DialogTitle>Modifica Layout</DialogTitle>
              <DialogDescription>Seleziona quali metriche ti interessano.</DialogDescription>
            </DialogHeader>

            {Object.entries(METRICS).map(([sezione, values]) => (
              <div key={sezione}>
                <label htmlFor={sezione} className="text-xl font-medium">
                  {sezione}
                </label>

                <ul id={sezione} className="divide-border/60 flex flex-col divide-y">
                  {Object.entries(values).map(([key, map]) => (
                    <li key={key} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium">{map.label}</p>
                        {map.unit && <p className="text-muted-foreground text-xs">{map.unit}</p>}
                      </div>

                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="focus-ring border-input accent-primary h-4 w-4 cursor-pointer rounded disabled:cursor-not-allowed disabled:opacity-50"
                          checked={metrics.includes(key as PrimaryKey)}
                          onChange={() => onToggle(key as PrimaryKey)}
                          aria-label={`Mostra ${map}`}
                        />
                        <span className="text-muted-foreground text-xs">
                          {true ? "Nascosto" : "Visibile"}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {rings.map((r) => (
          <MetricRingCard key={r.name} metric={r} />
        ))}
      </div>
    </section>
  );
}
