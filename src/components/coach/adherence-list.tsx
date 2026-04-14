"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type AdherenceRow = {
  clientId: string;
  fullName: string;
  avatarUrl: string | null;
  adherence: {
    workout: number;
    nutrition: number;
    checkIn: number;
    overall: number;
    windowDays: number;
  };
};

// TODO: remove dev bypass
function devHeaders(): HeadersInit {
  return process.env.NODE_ENV === "development" ? { "x-dev-bypass": "1" } : {};
}

function pct(v: number) {
  return Math.round(v * 100);
}

function colorFor(v: number) {
  if (v >= 0.75) return "text-emerald-600";
  if (v >= 0.5) return "text-amber-600";
  return "text-rose-600";
}

export function AdherenceList() {
  const { data, isLoading } = useQuery({
    queryKey: ["coach-adherence"],
    queryFn: async (): Promise<{ rows: AdherenceRow[] }> => {
      const res = await fetch("/api/coach/adherence", { headers: devHeaders() });
      if (!res.ok) return { rows: [] };
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center p-6">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const rows = data?.rows ?? [];
  const alerts = rows.filter((r) => r.adherence.overall < 0.5);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Aderenza clienti</h2>
            <p className="text-muted-foreground text-xs">
              Ultimi 14 giorni · ordinati dal più basso
            </p>
          </div>
          {alerts.length > 0 && (
            <span className="bg-rose-500/10 text-rose-600 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium">
              <AlertTriangle className="h-3 w-3" />
              {alerts.length} sotto 50%
            </span>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="text-muted-foreground text-center text-sm">
            Nessun cliente attivo
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => {
              const o = r.adherence.overall;
              const icon =
                o < 0.5 ? (
                  <TrendingDown className="text-rose-600 h-4 w-4" />
                ) : (
                  <TrendingUp className="text-emerald-600 h-4 w-4" />
                );
              return (
                <li
                  key={r.clientId}
                  className="border-border flex items-center gap-3 rounded-md border p-3"
                >
                  <div className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {r.fullName
                      .split(" ")
                      .map((s) => s[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{r.fullName}</p>
                      <div className="flex items-center gap-1">
                        {icon}
                        <span className={cn("text-sm font-bold tabular-nums", colorFor(o))}>
                          {pct(o)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex gap-3 text-[10px]">
                      <span>🏋️ {pct(r.adherence.workout)}%</span>
                      <span>🍎 {pct(r.adherence.nutrition)}%</span>
                      <span>📋 {pct(r.adherence.checkIn)}%</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
