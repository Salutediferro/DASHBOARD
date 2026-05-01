"use client";

import ReactGridLayout, { useContainerWidth, type Layout } from "react-grid-layout";
import type { PatientKpis } from "@/lib/queries/dashboard";
import { StatCard, type StatCardProps } from "../brand";
import { useLocalStorageState } from "ahooks";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

interface PatientOverviewProps {
  kpis: PatientKpis;
}

const cards: Record<string, (kpis: PatientKpis) => StatCardProps> = {
  "Peso Corrente": (kpis) => ({
    label: "Peso corrente",
    value: kpis.currentWeightKg != null ? kpis.currentWeightKg.toFixed(1) : "—",
    unit: kpis.currentWeightKg != null ? "kg" : undefined,
    delta:
      kpis.weightDelta14d != null && kpis.currentWeightKg
        ? (kpis.weightDelta14d / kpis.currentWeightKg) * 100
        : undefined,
    trend: kpis.sparklines.weight ?? undefined,
    invertDelta: true,
  }),
  BMI: (kpis) => ({
    label: "BMI",
    value: kpis.bmi != null ? kpis.bmi.toFixed(1) : "—",
    trend: kpis.sparklines.bmi ?? undefined,
    invertDelta: true,
  }),
  "Check-in settimana": (kpis) => ({
    label: "Check-in settimana",
    value: kpis.checkInsThisWeek,
    trend: kpis.sparklines.checkIns,
  }),
  "Prossimo appuntamento": (kpis) => ({
    label: "Prossimo appuntamento",
    value: kpis.nextAppointment
      ? kpis.nextAppointment.daysAway === 0
        ? "Oggi"
        : `${kpis.nextAppointment.daysAway}g`
      : "—",
  }),
};

function getDefaultLayout(): Layout {
  return [
    { i: "Peso Corrente", x: 0, y: 0, w: 1, h: 1 },
    { i: "BMI", x: 1, y: 0, w: 1, h: 1 },
    { i: "Check-in settimana", x: 2, y: 0, w: 1, h: 1 },
    { i: "Prossimo appuntamento", x: 3, y: 0, w: 1, h: 1 },
  ];
}

export function PatientOverview({ kpis }: PatientOverviewProps) {
  const { width, containerRef, mounted } = useContainerWidth();
  const [layout, setLayout] = useLocalStorageState<Layout>("patient-overview-layout", {
    defaultValue: getDefaultLayout(),
  });

  return (
    <div ref={containerRef}>
      {mounted && (
        <ReactGridLayout
          resizeConfig={{ enabled: false }}
          dragConfig={{ enabled: false }}
          onLayoutChange={setLayout}
          layout={layout}
          width={width}
          gridConfig={{ cols: 4, rowHeight: 150 }}
        >
          {layout.map(({ i }) => {
            const card = cards[i];
            if (typeof card !== "function") return null;

            return (
              <div key={i}>
                <StatCard {...card(kpis)} />
              </div>
            );
          })}
        </ReactGridLayout>
      )}
    </div>
  );
}
