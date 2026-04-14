"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/biometrics/metric-card";
import type { BiometricEntry } from "@/lib/mock-biometrics";

const PERIODS = [30, 60, 90, 180, 365] as const;
type Period = (typeof PERIODS)[number];

const MEASURE_KEYS = ["waist", "chest", "armRight", "thighRight"] as const;
const MEASURE_LABELS: Record<(typeof MEASURE_KEYS)[number], string> = {
  waist: "Vita",
  chest: "Petto",
  armRight: "Braccio",
  thighRight: "Coscia",
};
const MEASURE_COLORS: Record<(typeof MEASURE_KEYS)[number], string> = {
  waist: "#c9a96e",
  chest: "#60a5fa",
  armRight: "#a78bfa",
  thighRight: "#34d399",
};

type Summary = {
  weightKg: { current: number | null; previous: number | null; sparkline: number[] };
  energyLevel: { current: number | null; previous: number | null; sparkline: number[] };
  sleepHours: { current: number | null; previous: number | null; sparkline: number[] };
  steps: { current: number | null; previous: number | null; sparkline: number[] };
  trends: { weightKg: number };
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });
}

function movingAverage(values: number[], window = 7): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    const s = slice.reduce((a, b) => a + b, 0);
    return Math.round((s / slice.length) * 10) / 10;
  });
}

const WORKOUT_VOLUME_MOCK = Array.from({ length: 15 }, (_, i) => ({
  date: new Date(Date.now() - (14 - i) * 86400000 * 2)
    .toISOString()
    .slice(5, 10),
  volume: 3000 + Math.round(Math.sin(i / 2) * 800 + i * 90),
}));

export default function ProgressPage() {
  const [period, setPeriod] = React.useState<Period>(90);
  const [visibleMeasures, setVisibleMeasures] = React.useState<
    Set<(typeof MEASURE_KEYS)[number]>
  >(() => new Set(MEASURE_KEYS));

  const from = new Date(Date.now() - period * 86400000)
    .toISOString()
    .slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);

  const { data: entries = [], isLoading } = useQuery<BiometricEntry[]>({
    queryKey: ["biometrics", from, to],
    queryFn: async () => {
      const res = await fetch(`/api/biometrics?from=${from}&to=${to}`);
      return res.json();
    },
  });

  const { data: summary } = useQuery<Summary>({
    queryKey: ["biometrics-summary"],
    queryFn: async () => {
      const res = await fetch("/api/biometrics/summary");
      return res.json();
    },
  });

  const weightData = React.useMemo(() => {
    const kgs = entries.map((e) => e.weightKg ?? 0);
    const ma = movingAverage(kgs, 7);
    return entries.map((e, i) => ({
      date: formatDate(e.date),
      weight: e.weightKg,
      ma: ma[i],
    }));
  }, [entries]);

  const compositionData = React.useMemo(
    () =>
      entries.map((e) => ({
        date: formatDate(e.date),
        weight: e.weightKg,
        bodyFat: e.bodyFatPercentage,
      })),
    [entries],
  );

  const measuresData = React.useMemo(
    () =>
      entries
        .filter((e) => e.waist != null || e.chest != null)
        .map((e) => ({
          date: formatDate(e.date),
          waist: e.waist,
          chest: e.chest,
          armRight: e.armRight,
          thighRight: e.thighRight,
        })),
    [entries],
  );

  const energySleepData = React.useMemo(
    () =>
      entries.map((e) => ({
        date: formatDate(e.date),
        energy: e.energyLevel,
        sleep: e.sleepQuality,
      })),
    [entries],
  );

  const bpData = React.useMemo(
    () =>
      entries
        .filter((e) => e.systolicBP != null)
        .map((e) => ({
          date: formatDate(e.date),
          sys: e.systolicBP,
          dia: e.diastolicBP,
          hr: e.restingHR,
        })),
    [entries],
  );

  const goalWeight = 76;

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Progressi
          </h1>
          <p className="text-muted-foreground text-sm">
            Le tue metriche nel tempo
          </p>
        </div>
        <div className="border-border flex rounded-md border p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium",
                period === p && "bg-primary text-primary-foreground",
              )}
            >
              {p}g
            </button>
          ))}
        </div>
      </header>

      {/* Metric cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard
            label="Peso medio"
            value={(summary.weightKg.current ?? 0).toFixed(1)}
            unit="kg"
            trend={
              (summary.weightKg.current ?? 0) -
              (summary.weightKg.previous ?? 0)
            }
            sparkline={summary.weightKg.sparkline}
            invertTrend
          />
          <MetricCard
            label="Energia"
            value={(summary.energyLevel.current ?? 0).toFixed(1)}
            unit="/10"
            trend={
              (summary.energyLevel.current ?? 0) -
              (summary.energyLevel.previous ?? 0)
            }
            sparkline={summary.energyLevel.sparkline}
          />
          <MetricCard
            label="Sonno"
            value={(summary.sleepHours.current ?? 0).toFixed(1)}
            unit="h"
            trend={
              (summary.sleepHours.current ?? 0) -
              (summary.sleepHours.previous ?? 0)
            }
            sparkline={summary.sleepHours.sparkline}
          />
          <MetricCard
            label="Passi"
            value={Math.round(summary.steps.current ?? 0).toLocaleString("it-IT")}
            trend={
              (summary.steps.current ?? 0) - (summary.steps.previous ?? 0)
            }
            sparkline={summary.steps.sparkline}
          />
        </div>
      )}

      {/* Weight */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Peso nel tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#a1a1a1", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#a1a1a1", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={["dataMin - 1", "dataMax + 1"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <ReferenceLine
                  y={goalWeight}
                  stroke="#22c55e"
                  strokeDasharray="5 5"
                  label={{ value: "Target", fill: "#22c55e", fontSize: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#c9a96e"
                  strokeWidth={2}
                  dot={false}
                  name="Peso"
                />
                <Line
                  type="monotone"
                  dataKey="ma"
                  stroke="#ededed"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  name="Media 7gg"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Composition */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Composizione corporea</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={compositionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#a1a1a1", fontSize: 10 }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "#c9a96e", fontSize: 10 }}
                  domain={["dataMin - 1", "dataMax + 1"]}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "#60a5fa", fontSize: 10 }}
                  domain={["dataMin - 1", "dataMax + 1"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="weight"
                  stroke="#c9a96e"
                  strokeWidth={2}
                  dot={false}
                  name="Peso (kg)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="bodyFat"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                  name="Body Fat (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Measurements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Misure corporee</CardTitle>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MEASURE_KEYS.map((k) => {
              const active = visibleMeasures.has(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() =>
                    setVisibleMeasures((s) => {
                      const n = new Set(s);
                      if (n.has(k)) n.delete(k);
                      else n.add(k);
                      return n;
                    })
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-medium",
                    active
                      ? "border-transparent text-foreground"
                      : "text-muted-foreground",
                  )}
                  style={active ? { background: `${MEASURE_COLORS[k]}20`, color: MEASURE_COLORS[k] } : undefined}
                >
                  {MEASURE_LABELS[k]}
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={measuresData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="date" tick={{ fill: "#a1a1a1", fontSize: 10 }} />
                <YAxis tick={{ fill: "#a1a1a1", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                {MEASURE_KEYS.filter((k) => visibleMeasures.has(k)).map((k) => (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={k}
                    stroke={MEASURE_COLORS[k]}
                    strokeWidth={2}
                    dot={false}
                    name={MEASURE_LABELS[k]}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Workout volume */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volume allenamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WORKOUT_VOLUME_MOCK}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="date" tick={{ fill: "#a1a1a1", fontSize: 10 }} />
                <YAxis tick={{ fill: "#a1a1a1", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                  {WORKOUT_VOLUME_MOCK.map((_, i) => (
                    <Cell key={i} fill="#c9a96e" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Energy & Sleep */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Energia e sonno</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={energySleepData}>
                <defs>
                  <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c9a96e" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#c9a96e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="date" tick={{ fill: "#a1a1a1", fontSize: 10 }} />
                <YAxis domain={[0, 10]} tick={{ fill: "#a1a1a1", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="energy"
                  stroke="#c9a96e"
                  fill="url(#eg)"
                  name="Energia"
                />
                <Area
                  type="monotone"
                  dataKey="sleep"
                  stroke="#60a5fa"
                  fill="url(#sg)"
                  name="Qualità sonno"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Blood pressure & HR */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pressione e frequenza</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bpData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="date" tick={{ fill: "#a1a1a1", fontSize: 10 }} />
                <YAxis tick={{ fill: "#a1a1a1", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine y={120} stroke="#eab308" strokeDasharray="3 3" />
                <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="3 3" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="sys"
                  stroke="#c9a96e"
                  strokeWidth={2}
                  dot={false}
                  name="Sistolica"
                />
                <Line
                  type="monotone"
                  dataKey="dia"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                  name="Diastolica"
                />
                <Line
                  type="monotone"
                  dataKey="hr"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                  name="FC"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
