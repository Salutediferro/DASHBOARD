"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Dumbbell,
  Loader2,
  Mail,
  Phone,
  Scale,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { ClientDetail, ClientStatus } from "@/lib/mock-clients";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusBadge(s: ClientStatus) {
  const map = {
    ACTIVE: { label: "Attivo", cls: "bg-green-500/20 text-green-400" },
    PAUSED: { label: "In pausa", cls: "bg-yellow-500/20 text-yellow-400" },
    ARCHIVED: { label: "Archiviato", cls: "bg-muted text-muted-foreground" },
  };
  return <Badge className={map[s].cls}>{map[s].label}</Badge>;
}

function formatDate(iso: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    ...opts,
  });
}

export default function ClientProfilePage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useQuery<ClientDetail>({
    queryKey: ["client", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${params.id}`, {
        // TODO: remove dev bypass
        headers:
          process.env.NODE_ENV === "development" ? { "x-dev-bypass": "1" } : {},
      });
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/coach/clients"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Tutti i clienti
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Header */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-6 p-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary/20 text-primary text-xl">
                  {initials(data.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-heading text-2xl font-semibold tracking-tight">
                    {data.fullName}
                  </h1>
                  {statusBadge(data.status)}
                </div>
                <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {data.email}
                  </span>
                  {data.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {data.phone}
                    </span>
                  )}
                  {data.birthDate && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(data.birthDate, { year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="workouts">Allenamenti</TabsTrigger>
              <TabsTrigger value="nutrition">Nutrizione</TabsTrigger>
              <TabsTrigger value="progress">Progressi</TabsTrigger>
              <TabsTrigger value="checkins">Check-in</TabsTrigger>
              <TabsTrigger value="notes">Note</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Andamento peso (ultime 12 settimane)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.weightHistory}>
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => formatDate(v)}
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
                          labelFormatter={(v) => formatDate(String(v))}
                          formatter={(v) => [`${v} kg`, "Peso"] as [string, string]}
                        />
                        <Line
                          type="monotone"
                          dataKey="kg"
                          stroke="#c9a96e"
                          strokeWidth={2}
                          dot={{ fill: "#c9a96e", r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ultimi allenamenti</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col gap-2">
                    {data.recentWorkouts.slice(0, 4).map((w) => (
                      <li
                        key={w.id}
                        className="border-border flex items-center gap-4 rounded-md border p-3"
                      >
                        <Dumbbell className="text-primary h-5 w-5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{w.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {formatDate(w.date)} ·{" "}
                            {w.completed ? `${w.durationMin} min` : "Non completato"}
                          </p>
                        </div>
                        {w.completed ? (
                          <Badge className="bg-green-500/20 text-green-400">
                            Completato
                          </Badge>
                        ) : (
                          <Badge className="bg-muted text-muted-foreground">
                            Saltato
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workouts" className="mt-4 flex flex-col gap-4">
              <div className="border-border text-muted-foreground rounded-md border p-6 text-sm">
                Dati clinico sportivi — coming soon
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Storico allenamenti</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-border flex flex-col divide-y">
                    {data.recentWorkouts.map((w) => (
                      <li key={w.id} className="flex items-center gap-4 py-3">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            w.completed ? "bg-green-500" : "bg-muted-foreground",
                          )}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{w.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {formatDate(w.date)}
                          </p>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {w.durationMin} min
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nutrition" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Piano attivo</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.activeNutritionPlan ? (
                    <div className="flex flex-col gap-4">
                      <p className="text-lg font-semibold">
                        {data.activeNutritionPlan.name}
                      </p>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: "Kcal", value: data.activeNutritionPlan.calories },
                          {
                            label: "Proteine",
                            value: `${data.activeNutritionPlan.protein}g`,
                          },
                          {
                            label: "Carbo",
                            value: `${data.activeNutritionPlan.carbs}g`,
                          },
                          {
                            label: "Grassi",
                            value: `${data.activeNutritionPlan.fats}g`,
                          },
                        ].map((m) => (
                          <div
                            key={m.label}
                            className="border-border rounded-md border p-3"
                          >
                            <p className="text-muted-foreground text-xs">
                              {m.label}
                            </p>
                            <p className="font-heading text-lg font-semibold">
                              {m.value}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Aderenza macro
                        </p>
                        <div className="bg-muted mt-1 h-2 w-full overflow-hidden rounded-full">
                          <div
                            className="bg-primary h-full transition-all"
                            style={{
                              width: `${data.activeNutritionPlan.adherencePercent}%`,
                            }}
                          />
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {data.activeNutritionPlan.adherencePercent}%
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Nessun piano attivo
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress" className="mt-4 flex flex-col gap-4">
              <div className="border-border text-muted-foreground rounded-md border p-6 text-sm">
                Dati clinico sportivi — coming soon
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Peso nel tempo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.weightHistory}>
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => formatDate(v)}
                          tick={{ fill: "#a1a1a1", fontSize: 11 }}
                        />
                        <YAxis tick={{ fill: "#a1a1a1", fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            background: "#1a1a1a",
                            border: "1px solid #2a2a2a",
                            borderRadius: 8,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="kg"
                          stroke="#c9a96e"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="checkins" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Check-in</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {data.checkIns.map((ci) => (
                    <div
                      key={ci.id}
                      className="border-border flex flex-col gap-2 rounded-md border p-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {formatDate(ci.date)}
                        </p>
                        <span className="text-muted-foreground text-xs">
                          {ci.weight} kg
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm">{ci.note}</p>
                      {ci.feedback ? (
                        <p className="bg-primary/10 text-primary rounded-md p-2 text-xs">
                          <strong>Tuo feedback:</strong> {ci.feedback}
                        </p>
                      ) : (
                        <Textarea
                          placeholder="Scrivi un feedback..."
                          rows={2}
                        />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Note private</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    defaultValue={data.notes}
                    rows={10}
                    placeholder="Appunti sul cliente..."
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar riepilogo */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Riepilogo</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Piano</span>
                  <span className="font-medium">{data.plan}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Aderenza</span>
                  <span className="font-medium">{data.adherencePercent}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ultimo check-in</span>
                  <span className="font-medium">
                    {formatDate(data.lastCheckIn)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Peso attuale</span>
                  <span className="font-medium inline-flex items-center gap-1">
                    <Scale className="h-3 w-3" />
                    {data.weightHistory.at(-1)?.kg.toFixed(1)} kg
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
