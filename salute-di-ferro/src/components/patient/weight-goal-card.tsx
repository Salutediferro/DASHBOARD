"use client";

import Link from "next/link";
import { Target } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type Props = {
  current: number | null;
  target: number | null;
  /** The starting weight used to compute progress. If null, we fall back
   * to a heuristic: assume the goal is at least 1 kg of net change from
   * current so the bar always moves. */
  start?: number | null;
};

export function WeightGoalCard({ current, target, start }: Props) {
  if (target == null) return null;
  if (current == null) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="bg-primary/15 text-primary flex h-12 w-12 items-center justify-center rounded-md">
            <Target className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Obiettivo: {target.toFixed(1)} kg
            </p>
            <p className="text-muted-foreground text-xs">
              Registra il peso per vedere i progressi.
            </p>
          </div>
          <Link
            href="/dashboard/patient/check-in/new"
            className="text-primary text-xs hover:underline"
          >
            Registra peso →
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Direction: losing (current > target) or gaining (current < target).
  const goingDown = current > target;
  const delta = current - target;
  const absDelta = Math.abs(delta);

  // Build a progress %: 0 when far, 100 when reached.
  // If `start` is known we compute (start - current) / (start - target).
  // Otherwise assume the journey is max(|delta|, 5kg) so the bar still
  // shows movement for small deltas.
  const journey = start != null ? Math.abs(start - target) : Math.max(absDelta, 5);
  const traveled = start != null ? Math.abs(start - current) : Math.max(0, journey - absDelta);
  const pct = journey > 0 ? Math.min(100, Math.max(0, (traveled / journey) * 100)) : 0;
  const reached = absDelta <= 0.4;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-primary/15 text-primary flex h-12 w-12 items-center justify-center rounded-md">
            <Target className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {reached
                ? "Obiettivo raggiunto 🎯"
                : goingDown
                  ? `Mancano ${absDelta.toFixed(1)} kg`
                  : `Mancano ${absDelta.toFixed(1)} kg da recuperare`}
            </p>
            <p className="text-muted-foreground text-xs">
              Attuale {current.toFixed(1)} kg · Target {target.toFixed(1)} kg
            </p>
          </div>
        </div>
        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
