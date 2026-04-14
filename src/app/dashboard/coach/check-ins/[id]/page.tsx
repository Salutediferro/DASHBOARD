"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Send,
  Sparkles,
  Star,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BeforeAfterSlider } from "@/components/checkin/before-after-slider";
import type { CheckIn } from "@/lib/mock-checkins";

type DetailResponse = {
  current: CheckIn;
  previous: CheckIn | null;
  history: CheckIn[];
};

const MEASURE_LABELS: Record<string, string> = {
  waist: "Vita",
  chest: "Petto",
  armRight: "Braccio DX",
  armLeft: "Braccio SX",
  thighRight: "Coscia DX",
  thighLeft: "Coscia SX",
  calf: "Polpaccio",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });
}

export default function CheckInDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<DetailResponse>({
    queryKey: ["check-in", id],
    queryFn: async () => {
      const res = await fetch(`/api/check-ins/${id}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const [feedback, setFeedback] = React.useState("");
  const [aiText, setAiText] = React.useState("");

  React.useEffect(() => {
    if (data) {
      setFeedback(data.current.coachFeedback ?? "");
      setAiText(data.current.aiAnalysis ?? "");
    }
  }, [data]);

  const aiMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai/analyze-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkInId: id }),
      });
      if (!res.ok) throw new Error();
      return res.json() as Promise<{ analysis: string; provider: string }>;
    },
    onSuccess: (r) => {
      setAiText(r.analysis);
      toast.success(
        r.provider === "openai" ? "Analisi AI completata" : "Analisi demo",
      );
    },
    onError: () => toast.error("Errore analisi AI"),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/check-ins/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachFeedback: feedback || null,
          aiAnalysis: aiText || null,
          status: "REVIEWED",
        }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("Feedback inviato");
      qc.invalidateQueries({ queryKey: ["check-in", id] });
      qc.invalidateQueries({ queryKey: ["check-ins"] });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const { current, previous, history } = data;
  const weightChart = history.map((h) => ({
    date: formatDate(h.date),
    kg: h.weightKg,
  }));

  return (
    <div className="flex flex-col gap-6 pb-6">
      <Link
        href="/dashboard/coach/check-ins"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Tutti i check-in
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {current.clientName}
            </h1>
            <p className="text-muted-foreground text-sm">
              {formatDate(current.date)} · {current.weightKg} kg
              {current.rating && (
                <span className="ml-2 inline-flex items-center gap-0.5">
                  {[...Array(current.rating)].map((_, i) => (
                    <Star key={i} className="fill-primary text-primary h-3 w-3" />
                  ))}
                </span>
              )}
            </p>
          </div>
          {current.status === "PENDING" ? (
            <Badge className="bg-yellow-500/20 text-yellow-400">
              Da revisionare
            </Badge>
          ) : (
            <Badge className="bg-green-500/20 text-green-400">Revisionato</Badge>
          )}
        </CardContent>
      </Card>

      {/* Before/After photos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Confronto foto</CardTitle>
          {!previous && (
            <p className="text-muted-foreground text-xs">
              Primo check-in: nessuna foto precedente per il confronto
            </p>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BeforeAfterSlider
            label="Fronte"
            before={previous?.frontPhotoUrl ?? null}
            after={current.frontPhotoUrl}
          />
          <BeforeAfterSlider
            label="Fianco"
            before={previous?.sidePhotoUrl ?? null}
            after={current.sidePhotoUrl}
          />
          <BeforeAfterSlider
            label="Schiena"
            before={previous?.backPhotoUrl ?? null}
            after={current.backPhotoUrl}
          />
        </CardContent>
      </Card>

      {/* AI analysis */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Analisi AI</CardTitle>
          <button
            type="button"
            onClick={() => aiMutation.mutate()}
            disabled={aiMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium disabled:opacity-50"
          >
            {aiMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Analizza con AI
          </button>
        </CardHeader>
        <CardContent>
          <Textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="Clicca &quot;Analizza con AI&quot; per generare una valutazione delle foto"
            rows={8}
            className="text-sm"
          />
        </CardContent>
      </Card>

      {/* Weight + measurements */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Peso nel tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChart}>
                  <XAxis
                    dataKey="date"
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
            <CardTitle className="text-base">Misure</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(current.measurements).map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt className="text-muted-foreground">{MEASURE_LABELS[k] ?? k}</dt>
                  <dd className="text-right font-semibold tabular-nums">
                    {v != null ? `${v} cm` : "—"}
                  </dd>
                </React.Fragment>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Client notes */}
      {current.clientNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Note del cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{current.clientNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Coach feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Il tuo feedback</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Scrivi un feedback per il cliente..."
            rows={5}
          />
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-12 items-center justify-center gap-2 rounded-md text-sm font-semibold disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Invia feedback
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
