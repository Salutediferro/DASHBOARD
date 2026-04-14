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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Point = { date: string; value: number | null };

type Props = {
  title: string;
  unit?: string;
  data: Point[];
  emptyLabel?: string;
  color?: string;
};

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

export function MetricChart({
  title,
  unit,
  data,
  emptyLabel = "Nessun dato disponibile",
  color = "#c9a96e",
}: Props) {
  const points = data.filter((p) => p.value != null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {title}
          {unit && (
            <span className="text-muted-foreground ml-1 text-xs">({unit})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {emptyLabel}
          </p>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points}>
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
                  formatter={(v) => [
                    unit ? `${v} ${unit}` : String(v),
                    title,
                  ]}
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
        )}
      </CardContent>
    </Card>
  );
}
