"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { date: string; value: number };

type Props = {
  title: string;
  unit?: string;
  color: string;
  data: Point[];
};

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

// The heavy (recharts) part of MetricChart. Kept as a separate module so
// the parent can dynamic-import it and keep the chart bundle off the
// first-paint critical path.
export default function MetricChartBody({ title, unit, color, data }: Props) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis
            dataKey="date"
            tickFormatter={fmt}
            tick={{ fill: "#a1a1a1", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#a1a1a1", fontSize: 11 }}
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
            labelFormatter={(v) => fmt(String(v))}
            formatter={(v) => [unit ? `${v} ${unit}` : String(v), title]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
