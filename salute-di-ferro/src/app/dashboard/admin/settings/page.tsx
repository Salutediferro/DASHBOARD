"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Settings2,
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

type Setting = {
  key: string;
  label: string;
  description: string;
  value: boolean;
  source: "redis" | "env" | "default";
  envFallback: string;
  envValue: string | null;
};

type ListResponse = { items: Setting[] };

const SOURCE_META: Record<
  Setting["source"],
  { label: string; tone: string }
> = {
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

async function patchSetting(key: string, value: boolean) {
  const res = await fetch("/api/admin/settings", {
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
  return json as { ok: true; items: Setting[] };
}

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery<ListResponse>({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Errore caricamento settings");
      return res.json();
    },
  });

  const toggle = useMutation<
    { ok: true; items: Setting[] },
    Error,
    { key: string; value: boolean }
  >({
    mutationFn: ({ key, value }) => patchSetting(key, value),
    onSuccess: (data) => {
      toast.success("Setting aggiornato");
      qc.setQueryData(["admin-settings"], { items: data.items });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Impostazioni piattaforma
        </h1>
        <p className="text-muted-foreground text-sm">
          Flag operativi modificabili a runtime. Gli override sono scritti su
          Upstash Redis; la env var resta fallback se Redis non è disponibile.
        </p>
      </header>

      {isLoading ? (
        <AdminCardsSkeleton count={1} />
      ) : isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-red-600">
            {error instanceof Error ? error.message : "Errore"}
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {data?.items.map((s) => {
            const source = SOURCE_META[s.source];
            const pending =
              toggle.isPending && toggle.variables?.key === s.key;
            return (
              <Card key={s.key}>
                <CardHeader className="flex flex-row items-center gap-2">
                  <Settings2 className="text-muted-foreground h-4 w-4" />
                  <CardTitle className="text-base">{s.label}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-muted-foreground max-w-prose text-sm">
                      {s.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "gap-1 text-xs",
                          s.value
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-slate-500/15 text-slate-700 dark:text-slate-300",
                        )}
                      >
                        {s.value ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {s.value ? "ON" : "OFF"}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={cn("gap-1 text-xs", source.tone)}
                      >
                        {source.label}
                      </Badge>
                      <span className="text-muted-foreground font-mono text-xs">
                        {s.envFallback}={s.envValue ?? "∅"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={s.value ? "outline" : "default"}
                      onClick={() =>
                        toggle.mutate({ key: s.key, value: !s.value })
                      }
                      disabled={pending}
                      className="gap-2"
                    >
                      {pending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      {s.value ? "Disattiva" : "Attiva"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </ul>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <AlertCircle className="text-muted-foreground h-4 w-4" />
          <CardTitle className="text-base">Note</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            Se Upstash Redis non è configurato, le modifiche non vengono
            persistite: l&apos;endpoint risponderà 502 e il valore effettivo
            resterà quello della env var.
          </p>
          <p>
            Ogni toggle viene loggato come{" "}
            <code className="text-xs">PLATFORM_SETTING_CHANGE</code> nell&apos;audit
            con before/after.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
