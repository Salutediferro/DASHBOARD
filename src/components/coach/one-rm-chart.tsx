"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type OneRmRow = { slug: string; history: Array<{ date: string; e1rm: number }> };

const LIFT_LABELS: Record<string, string> = {
  "back-squat": "Squat",
  "bench-press": "Panca",
  deadlift: "Stacco",
  "military-press": "Military Press",
};

const COLORS = ["#c9a96e", "#60a5fa", "#a78bfa", "#34d399"];

// TODO: remove dev bypass
function devHeaders(): HeadersInit {
  return process.env.NODE_ENV === "development" ? { "x-dev-bypass": "1" } : {};
}

export function OneRmChart({ clientId }: { clientId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["progression-onerm", clientId],
    queryFn: async (): Promise<{ oneRm: OneRmRow[] }> => {
      const res = await fetch(
        `/api/coach/clients/${clientId}/progression`,
        { headers: devHeaders() },
      );
      if (!res.ok) return { oneRm: [] };
      return res.json();
    },
  });

  const oneRm = data?.oneRm ?? [];
  const hasData = oneRm.some((r) => r.history.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">1RM stimato (Epley)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-56 items-center justify-center">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : !hasData ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Nessuno storico sui lift principali negli ultimi 90 giorni.
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart>
                <XAxis
                  dataKey="date"
                  type="category"
                  allowDuplicatedCategory={false}
                  tick={{ fill: "#a1a1a1", fontSize: 11 }}
                  tickFormatter={(v) =>
                    new Date(String(v)).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "short",
                    })
                  }
                />
                <YAxis
                  tick={{ fill: "#a1a1a1", fontSize: 11 }}
                  tickFormatter={(v) => `${v}kg`}
                  domain={["dataMin - 5", "dataMax + 5"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                {oneRm.map((row, i) => (
                  <Line
                    key={row.slug}
                    dataKey="e1rm"
                    data={row.history}
                    name={LIFT_LABELS[row.slug] ?? row.slug}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          {oneRm.map((row, i) => (
            <span key={row.slug} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              {LIFT_LABELS[row.slug] ?? row.slug}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
