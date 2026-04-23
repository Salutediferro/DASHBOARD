"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Info,
  Loader2,
  Megaphone,
  Siren,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Severity = "info" | "warning" | "critical";

type Broadcast = {
  message: string;
  severity: Severity;
  expiresAt: string | null;
  activatedBy: { id: string; fullName: string };
  activatedAt: string;
};

type GetResponse = { broadcast: Broadcast | null };
type MutateResponse = { ok: true; broadcast: Broadcast };

const SEVERITY_META: Record<
  Severity,
  { label: string; icon: React.ElementType; tone: string }
> = {
  info: {
    label: "Info",
    icon: Info,
    tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  critical: {
    label: "Critico",
    icon: Siren,
    tone: "bg-red-500/20 text-red-700 dark:text-red-300",
  },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalDateTimeInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  // <input type="datetime-local"> wants `YYYY-MM-DDTHH:MM` in local tz.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminBroadcastPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<GetResponse>({
    queryKey: ["admin-broadcast"],
    queryFn: async () => {
      const res = await fetch("/api/admin/broadcast");
      if (!res.ok) throw new Error("Errore caricamento broadcast");
      return res.json();
    },
  });

  const existing = data?.broadcast ?? null;

  const [message, setMessage] = React.useState("");
  const [severity, setSeverity] = React.useState<Severity>("info");
  const [expiresAtLocal, setExpiresAtLocal] = React.useState("");

  // Prefill the form when a new broadcast arrives server-side. Using the
  // "store previous prop in state + reset during render" pattern from the
  // React docs so we don't hit the set-state-in-effect lint rule.
  const [prevLoadedAt, setPrevLoadedAt] = React.useState<string | null>(null);
  const existingKey = existing?.activatedAt ?? null;
  if (existingKey !== prevLoadedAt) {
    setPrevLoadedAt(existingKey);
    if (existing) {
      setMessage(existing.message);
      setSeverity(existing.severity);
      setExpiresAtLocal(toLocalDateTimeInput(existing.expiresAt));
    }
  }

  const putMutation = useMutation<MutateResponse, Error, void>({
    mutationFn: async () => {
      const expiresAt = expiresAtLocal
        ? new Date(expiresAtLocal).toISOString()
        : null;
      const res = await fetch("/api/admin/broadcast", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), severity, expiresAt }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string"
            ? json.error
            : "Pubblicazione fallita",
        );
      }
      return json;
    },
    onSuccess: (data) => {
      toast.success("Broadcast pubblicato");
      qc.setQueryData<GetResponse>(["admin-broadcast"], {
        broadcast: data.broadcast,
      });
      qc.invalidateQueries({ queryKey: ["broadcast"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const clearMutation = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      const res = await fetch("/api/admin/broadcast", { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string" ? json.error : "Errore",
        );
      }
      return json;
    },
    onSuccess: () => {
      toast.success("Broadcast rimosso");
      qc.setQueryData<GetResponse>(["admin-broadcast"], { broadcast: null });
      qc.invalidateQueries({ queryKey: ["broadcast"] });
      setMessage("");
      setSeverity("info");
      setExpiresAtLocal("");
    },
    onError: (e) => toast.error(e.message),
  });

  // `Date.now()` is impure at render time — the lint rule wants it
  // behind useSyncExternalStore. Tick once every 30s so the "Scaduto"
  // state flips on its own without a full refetch.
  const now = React.useSyncExternalStore(
    (cb) => {
      const id = setInterval(cb, 30_000);
      return () => clearInterval(id);
    },
    () => Date.now(),
    () => 0,
  );
  const isExpired = !!(
    existing?.expiresAt && new Date(existing.expiresAt).getTime() < now
  );
  const canSubmit = message.trim().length >= 3 && !putMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Messaggio broadcast
        </h1>
        <p className="text-muted-foreground text-sm">
          Banner globale visibile a tutti gli utenti autenticati nel dashboard
          (e sulla pagina di login). Un solo broadcast attivo alla volta.
        </p>
      </header>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          {existing && (
            <Card
              className={cn(
                isExpired && "border-amber-500/30",
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Megaphone className="text-muted-foreground h-4 w-4" />
                  <CardTitle className="text-base">Attualmente online</CardTitle>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "gap-1 text-[10px]",
                    SEVERITY_META[existing.severity].tone,
                  )}
                >
                  {SEVERITY_META[existing.severity].label.toUpperCase()}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm">{existing.message}</p>
                <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                  <span>
                    Da <span className="text-foreground">{existing.activatedBy.fullName}</span>
                  </span>
                  <span>Pubblicato {formatDateTime(existing.activatedAt)}</span>
                  {existing.expiresAt ? (
                    <span
                      className={cn(
                        isExpired && "text-amber-700 dark:text-amber-300",
                      )}
                    >
                      {isExpired ? "Scaduto" : "Scade"}{" "}
                      {formatDateTime(existing.expiresAt)}
                    </span>
                  ) : (
                    <span>Senza scadenza</span>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearMutation.mutate()}
                    disabled={clearMutation.isPending}
                    className="gap-1 text-red-600 hover:text-red-700"
                  >
                    {clearMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Rimuovi
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {existing ? "Aggiorna broadcast" : "Pubblica broadcast"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="message">Messaggio</Label>
                <textarea
                  id="message"
                  rows={3}
                  maxLength={280}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Es. Manutenzione programmata stanotte dalle 22 alle 24"
                  className="border-border bg-background rounded-md border px-3 py-2 text-sm"
                />
                <span className="text-muted-foreground text-xs">
                  {message.length}/280 caratteri · min 3
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="severity">Severità</Label>
                  <Select
                    value={severity}
                    onValueChange={(v) =>
                      setSeverity((v as Severity) ?? "info")
                    }
                  >
                    <SelectTrigger id="severity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info (sky)</SelectItem>
                      <SelectItem value="warning">Warning (amber)</SelectItem>
                      <SelectItem value="critical">
                        Critico (red, non dismissable)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="expiresAt">Scadenza (opzionale)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={expiresAtLocal}
                    onChange={(e) => setExpiresAtLocal(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => putMutation.mutate()}
                  disabled={!canSubmit}
                  className="gap-2"
                >
                  {putMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Megaphone className="h-4 w-4" />
                  )}
                  {existing ? "Aggiorna" : "Pubblica"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Note</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2 text-sm">
              <p>
                Il banner viene servito dall&apos;endpoint pubblico{" "}
                <code className="text-xs">GET /api/broadcast</code> (cache 15s
                edge). I client polling ogni 60s lo vedono entro ~1 min.
              </p>
              <p>
                Severità <strong>Critico</strong> rimuove il bottone di chiusura
                client-side — usala per comunicazioni bloccanti (manutenzione
                in corso, incidente).
              </p>
              <p>
                Ogni pubblicazione viene loggata come{" "}
                <code className="text-xs">BROADCAST_SET</code>, le rimozioni come{" "}
                <code className="text-xs">BROADCAST_CLEAR</code>.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
