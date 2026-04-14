"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock,
  Dumbbell,
  Flame,
  Loader2,
  MessageCircle,
  Play,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/lib/hooks/use-user";
import {
  pickQuote,
  type ClientDashboardData,
} from "@/lib/mock-client-dashboard";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

function CircularProgress({
  value,
  target,
  label,
  unit,
}: {
  value: number;
  target: number;
  label: string;
  unit: string;
}) {
  const pct = Math.max(0, Math.min(100, target > 0 ? (value / target) * 100 : 0));
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-20 w-20">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#2a2a2a" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="#c9a96e"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-semibold tabular-nums">
            {Math.round(value)}
          </span>
          <span className="text-muted-foreground text-[9px] leading-none">
            /{target}
            {unit}
          </span>
        </div>
      </div>
      <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function FadeCard({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      {children}
    </div>
  );
}

export default function ClientHomePage() {
  const { profile } = useUser();
  const firstName = (profile?.fullName ?? "").split(" ")[0] ?? "";

  const quoteIndex = React.useMemo(
    () => Math.floor(new Date().getHours() / 1.2) + new Date().getDate(),
    [],
  );
  const quote = pickQuote(quoteIndex);

  const { data, isLoading } = useQuery<ClientDashboardData>({
    queryKey: ["client-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/client/dashboard");
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const [metrics, setMetrics] = React.useState({
    weightKg: "",
    sleepHours: "",
    energyLevel: 7,
  });

  const metricsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/client/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightKg: metrics.weightKg ? Number(metrics.weightKg) : null,
          sleepHours: metrics.sleepHours ? Number(metrics.sleepHours) : null,
          energyLevel: metrics.energyLevel,
        }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => toast.success("Metriche salvate"),
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const weightDelta = data.progress.currentWeight - data.progress.startWeight;
  const weightDown = weightDelta < 0;
  const TrendIcon = weightDown ? TrendingDown : TrendingUp;

  const storedMetrics = data.metricsToday;

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Greeting */}
      <FadeCard>
        <header>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {greeting()}, {firstName || "Atleta"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm italic">
            &ldquo;{quote}&rdquo;
          </p>
        </header>
      </FadeCard>

      {/* Today's workout */}
      <FadeCard delay={60}>
        <Card
          className={cn(
            "overflow-hidden",
            data.todayWorkout.isRestDay
              ? "bg-card"
              : data.todayWorkout.completed
                ? "border-green-500/40 bg-green-500/5"
                : "bg-primary/5 border-primary/30",
          )}
        >
          <CardContent className="flex flex-col gap-4 p-5">
            {data.todayWorkout.isRestDay ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <Sparkles className="text-primary h-8 w-8" />
                <p className="font-heading text-xl font-semibold">
                  Oggi riposo
                </p>
                <p className="text-muted-foreground text-sm">Recupera bene!</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-primary text-xs font-semibold uppercase tracking-wider">
                      Allenamento di oggi
                    </p>
                    <h2 className="font-heading mt-0.5 text-xl font-semibold tracking-tight">
                      {data.todayWorkout.name}
                    </h2>
                    <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Dumbbell className="h-3 w-3" />
                        {data.todayWorkout.exerciseCount} esercizi
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />~{data.todayWorkout.estimatedMin} min
                      </span>
                    </div>
                  </div>
                  {data.todayWorkout.completed && (
                    <Badge className="bg-green-500/20 text-green-400">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Completato
                    </Badge>
                  )}
                </div>

                {data.todayWorkout.completed && data.todayWorkout.summary ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border-border rounded-md border p-3">
                      <p className="text-muted-foreground text-[10px]">
                        Durata
                      </p>
                      <p className="font-heading text-lg font-semibold">
                        {data.todayWorkout.summary.durationMin} min
                      </p>
                    </div>
                    <div className="border-border rounded-md border p-3">
                      <p className="text-muted-foreground text-[10px]">
                        Volume
                      </p>
                      <p className="font-heading text-lg font-semibold">
                        {data.todayWorkout.summary.volumeKg} kg
                      </p>
                    </div>
                  </div>
                ) : (
                  <Link
                    href="/dashboard/client/workout/session"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-14 items-center justify-center gap-2 rounded-lg text-base font-semibold"
                  >
                    <Play className="h-5 w-5 fill-current" />
                    INIZIA ALLENAMENTO
                  </Link>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </FadeCard>

      {/* Nutrition */}
      <FadeCard delay={120}>
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider">
                  Nutrizione oggi
                </p>
                <h2 className="font-heading text-lg font-semibold">
                  {data.nutrition.planName}
                </h2>
              </div>
              <Link
                href="/dashboard/client/nutrition"
                className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
              >
                Piano completo <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <CircularProgress
                value={data.nutrition.consumed.calories}
                target={data.nutrition.target.calories}
                label="Kcal"
                unit=""
              />
              <CircularProgress
                value={data.nutrition.consumed.protein}
                target={data.nutrition.target.protein}
                label="Proteine"
                unit="g"
              />
              <CircularProgress
                value={data.nutrition.consumed.carbs}
                target={data.nutrition.target.carbs}
                label="Carbo"
                unit="g"
              />
              <CircularProgress
                value={data.nutrition.consumed.fats}
                target={data.nutrition.target.fats}
                label="Grassi"
                unit="g"
              />
            </div>
            {data.nutrition.nextMeal && (
              <div className="border-border flex items-center gap-3 rounded-md border p-3">
                <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-md">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-muted-foreground text-[10px]">
                    Prossimo pasto
                  </p>
                  <p className="text-sm font-semibold">
                    {data.nutrition.nextMeal.name}
                  </p>
                </div>
                <span className="text-muted-foreground font-mono text-sm">
                  {data.nutrition.nextMeal.time}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeCard>

      {/* Progress */}
      <FadeCard delay={180}>
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider">
                  Il tuo progresso
                </p>
                <p className="font-heading text-2xl font-semibold tabular-nums">
                  {data.progress.currentWeight.toFixed(1)} kg
                </p>
                <p
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    weightDown ? "text-green-500" : "text-yellow-500",
                  )}
                >
                  <TrendIcon className="h-3 w-3" />
                  {weightDown ? "" : "+"}
                  {weightDelta.toFixed(1)} kg in 30 giorni
                </p>
              </div>
              <div className="h-14 w-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.progress.weightHistory}>
                    <Line
                      type="monotone"
                      dataKey="kg"
                      stroke="#c9a96e"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="border-border flex items-center gap-2 rounded-md border p-3">
                <Flame className="text-primary h-5 w-5" />
                <div>
                  <p className="text-muted-foreground text-[10px]">Streak</p>
                  <p className="text-sm font-semibold">
                    {data.progress.streak} allenamenti
                  </p>
                </div>
              </div>
              <div className="border-border flex items-center gap-2 rounded-md border p-3">
                <CheckCircle2 className="text-primary h-5 w-5" />
                <div>
                  <p className="text-muted-foreground text-[10px]">
                    Prossimo check-in
                  </p>
                  <p className="text-sm font-semibold">
                    tra {data.progress.nextCheckInDays} giorni
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeCard>

      {/* Quick metrics */}
      <FadeCard delay={240}>
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">
                Metriche rapide
              </p>
              <p className="font-heading text-lg font-semibold">
                Come stai oggi?
              </p>
            </div>
            {storedMetrics.weightKg ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="border-border rounded-md border p-3">
                  <p className="text-muted-foreground text-[10px]">Peso</p>
                  <p className="font-heading text-lg font-semibold">
                    {storedMetrics.weightKg} kg
                  </p>
                </div>
                <div className="border-border rounded-md border p-3">
                  <p className="text-muted-foreground text-[10px]">Sonno</p>
                  <p className="font-heading text-lg font-semibold">
                    {storedMetrics.sleepHours}h
                  </p>
                </div>
                <div className="border-border rounded-md border p-3">
                  <p className="text-muted-foreground text-[10px]">Energia</p>
                  <p className="font-heading text-lg font-semibold">
                    {storedMetrics.energyLevel}/10
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="weight" className="text-xs">
                      Peso (kg)
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={metrics.weightKg}
                      onChange={(e) =>
                        setMetrics({ ...metrics, weightKg: e.target.value })
                      }
                      className="h-12 text-lg tabular-nums"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sleep" className="text-xs">
                      Ore sonno
                    </Label>
                    <Input
                      id="sleep"
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      value={metrics.sleepHours}
                      onChange={(e) =>
                        setMetrics({ ...metrics, sleepHours: e.target.value })
                      }
                      className="h-12 text-lg tabular-nums"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="energy" className="text-xs">
                      Livello energia
                    </Label>
                    <span className="text-primary font-heading text-xl font-semibold">
                      {metrics.energyLevel}/10
                    </span>
                  </div>
                  <input
                    id="energy"
                    type="range"
                    min={1}
                    max={10}
                    value={metrics.energyLevel}
                    onChange={(e) =>
                      setMetrics({
                        ...metrics,
                        energyLevel: Number(e.target.value),
                      })
                    }
                    className="accent-primary h-2 w-full"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => metricsMutation.mutate()}
                  disabled={metricsMutation.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-12 items-center justify-center rounded-md text-sm font-semibold disabled:opacity-50"
                >
                  Salva metriche
                </button>
              </>
            )}
          </CardContent>
        </Card>
      </FadeCard>

      {/* Messages */}
      <FadeCard delay={300}>
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs uppercase tracking-wider">
                Messaggi
              </p>
              {data.messages.unreadNotifications > 0 && (
                <Badge className="bg-primary/20 text-primary gap-1">
                  <Bell className="h-3 w-3" />
                  {data.messages.unreadNotifications} non letti
                </Badge>
              )}
            </div>
            {data.messages.lastCoachFeedback && (
              <div className="border-border rounded-md border p-3">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">
                  {data.messages.lastCoachFeedback.coachName}
                </p>
                <p className="mt-1 text-sm">
                  {data.messages.lastCoachFeedback.text}
                </p>
              </div>
            )}
            <Link
              href="/dashboard/client/profile"
              className="border-border hover:bg-muted flex h-12 items-center gap-3 rounded-md border px-3"
            >
              <MessageCircle className="text-primary h-5 w-5" />
              <span className="flex-1 text-sm font-medium">AI Assistant</span>
              <ArrowUpRight className="text-muted-foreground h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </FadeCard>
    </div>
  );
}
