"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Flag,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "@/lib/toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AdminCardsSkeleton } from "@/components/admin/admin-skeletons";

type Flag = {
  key: string;
  label: string;
  description: string;
  value: boolean;
  source: "redis" | "env" | "default";
  envFallback: string;
  envValue: string | null;
};

type ListResponse = { items: Flag[] };

const SOURCE_META: Record<Flag["source"], { label: string; tone: string }> = {
  redis: {
    label: "Override Redis",
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  env: {
    label: "Env var",
    tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  default: {
    label: "Default",
    tone: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  },
};

async function patchFlag(key: string, value: boolean) {
  const res = await fetch("/api/admin/feature-flags", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof json?.error === "string" ? json.error : "Modifica fallita",
    );
  }
  return json as { ok: true; items: Flag[] };
}

export default function AdminFeatureFlagsPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery<ListResponse>({
    queryKey: ["admin-feature-flags"],
    queryFn: async () => {
      const res = await fetch("/api/admin/feature-flags");
      if (!res.ok) throw new Error("Errore caricamento feature flags");
      return res.json();
    },
  });

  const toggle = useMutation<
    { ok: true; items: Flag[] },
    Error,
    { key: string; value: boolean }
  >({
    mutationFn: ({ key, value }) => patchFlag(key, value),
    onSuccess: (data) => {
      toast.success("Flag aggiornato");
      qc.setQueryData(["admin-feature-flags"], { items: data.items });
      // Invalida anche la cache client-side di useFeatureFlag(),
      // così le UI che consumano i flag ricaricano subito.
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Feature flags
        </h1>
        <p className="text-muted-foreground text-sm">
          Kill-switch per singole feature di prodotto. Leggibili anche
          client-side (<code>/api/flags</code> pubblico) — non mettere qui flag
          con semantica admin-only.
        </p>
      </header>

      {isLoading ? (
        <AdminCardsSkeleton count={3} />
      ) : isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-red-600">
            {error instanceof Error ? error.message : "Errore"}
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {data?.items.map((f) => {
            const source = SOURCE_META[f.source];
            const pending =
              toggle.isPending && toggle.variables?.key === f.key;
            return (
              <Card key={f.key}>
                <CardHeader className="flex flex-row items-center gap-2">
                  <Flag className="text-muted-foreground h-4 w-4" />
                  <CardTitle className="text-base">{f.label}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-muted-foreground max-w-prose text-sm">
                      {f.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "gap-1 text-xs",
                          f.value
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-slate-500/15 text-slate-700 dark:text-slate-300",
                        )}
                      >
                        {f.value ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {f.value ? "ON" : "OFF"}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={cn("gap-1 text-xs", source.tone)}
                      >
                        {source.label}
                      </Badge>
                      <code className="text-muted-foreground font-mono text-xs">
                        {f.key}
                      </code>
                      <code className="text-muted-foreground font-mono text-xs">
                        {f.envFallback}={f.envValue ?? "∅"}
                      </code>
                    </div>
                  </div>
                  <Button
                    variant={f.value ? "outline" : "default"}
                    onClick={() =>
                      toggle.mutate({ key: f.key, value: !f.value })
                    }
                    disabled={pending}
                    className="gap-2"
                  >
                    {pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {f.value ? "Disattiva" : "Attiva"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Note</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            Fallback chain: <strong>Redis → env var → default</strong>. Se
            Upstash non è configurato i toggle non persistono (502).
          </p>
          <p>
            I flag server-side usano <code>getFeatureFlag(key)</code> da{" "}
            <code>lib/feature-flags.ts</code>. I client UI usano{" "}
            <code>useFeatureFlag(key)</code> da{" "}
            <code>lib/hooks/use-feature-flag.ts</code>.
          </p>
          <p>
            Ogni toggle logga <code>FEATURE_FLAG_CHANGE</code> con
            before/after.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
