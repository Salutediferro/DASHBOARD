"use client";

import * as React from "react";
import Link from "next/link";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  ClipboardCheck,
  Hourglass,
  Loader2,
  Scale,
  Star,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StatusFilter = "PENDING" | "REVIEWED" | "ALL";

type CheckInRow = {
  id: string;
  date: string;
  weight: number | null;
  measurements: Record<string, number | null> | null;
  frontPhotoUrl: string | null;
  sidePhotoUrl: string | null;
  backPhotoUrl: string | null;
  notes: string | null;
  rating: number | null;
  professionalFeedback: string | null;
  status: "PENDING" | "REVIEWED";
  patientId: string;
  patient: { id: string; fullName: string; email: string };
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CoachMonitoringPage() {
  const qc = useQueryClient();
  const [status, setStatus] = React.useState<StatusFilter>("PENDING");
  const [q, setQ] = React.useState("");
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery<{ items: CheckInRow[] }>({
    queryKey: ["coach-check-ins", { status, q }],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("status", status);
      if (q.trim()) sp.set("q", q.trim());
      const res = await fetch(`/api/check-ins?${sp.toString()}`);
      if (!res.ok) throw new Error("Errore caricamento");
      return res.json();
    },
  });

  const items = React.useMemo(() => data?.items ?? [], [data]);

  // Aggregate stats — computed server-side would be more precise but
  // the list itself is already bounded at 100 items which is plenty for
  // a coach's caseload in beta.
  const { data: pendingCount } = useQuery<number>({
    queryKey: ["coach-check-ins-pending-count"],
    queryFn: async () => {
      const res = await fetch("/api/check-ins?status=PENDING");
      if (!res.ok) return 0;
      const body: { items: CheckInRow[] } = await res.json();
      return body.items.length;
    },
  });

  const clientsWithCheckIn = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of items) set.add(r.patientId);
    return set.size;
  }, [items]);

  const activeRow = items.find((r) => r.id === activeId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Monitoraggio
        </h1>
        <p className="text-muted-foreground text-sm">
          Check-in settimanali dei tuoi assistiti. Revisiona, lascia feedback,
          segna come completato.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Hourglass className="h-5 w-5" />}
          label="Da revisionare"
          value={pendingCount ?? "—"}
          tone="warning"
        />
        <StatCard
          icon={<ClipboardCheck className="h-5 w-5" />}
          label={`Check-in (${status === "ALL" ? "tutti" : status === "PENDING" ? "pending" : "rivisti"})`}
          value={isLoading ? "—" : items.length}
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Assistiti attivi in lista"
          value={isLoading ? "—" : clientsWithCheckIn}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3 border-b border-border pb-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Stato</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as StatusFilter)}
          >
            <SelectTrigger id="status" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Da revisionare</SelectItem>
              <SelectItem value="REVIEWED">Rivisti</SelectItem>
              <SelectItem value="ALL">Tutti</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="q">Cerca per nome</Label>
          <Input
            id="q"
            placeholder="Nome assistito..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-[260px]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <ClipboardCheck className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">
              {status === "PENDING"
                ? "Nessun check-in in attesa. Tutto a posto."
                : "Nessun check-in trovato con questi filtri."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {items.length} check-in
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {items.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {initials(r.patient.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/coach/patients/${r.patientId}`}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {r.patient.fullName}
                      </Link>
                      {r.status === "PENDING" ? (
                        <Badge variant="secondary" className="gap-1">
                          <Hourglass className="h-3 w-3" /> Da revisionare
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="gap-1 text-green-600 dark:text-green-400"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Rivisto
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-3 text-xs">
                      <span>{formatDate(r.date)}</span>
                      {r.weight != null && (
                        <span className="inline-flex items-center gap-1">
                          <Scale className="h-3 w-3" /> {r.weight.toFixed(1)} kg
                        </span>
                      )}
                      {r.rating != null && (
                        <span className="inline-flex items-center gap-1">
                          <Star className="fill-primary text-primary h-3 w-3" />
                          {r.rating}/5
                        </span>
                      )}
                      {r.notes && (
                        <span className="max-w-xs truncate">
                          {r.notes.slice(0, 80)}
                          {r.notes.length > 80 ? "..." : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  {[r.frontPhotoUrl, r.sidePhotoUrl, r.backPhotoUrl]
                    .filter(Boolean)
                    .slice(0, 3)
                    .map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={url as string}
                        alt="check-in"
                        className="border-border h-12 w-10 rounded border object-cover"
                      />
                    ))}
                  <button
                    type="button"
                    onClick={() => setActiveId(r.id)}
                    className="border-border hover:bg-muted inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-medium"
                  >
                    Apri
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <CheckInReviewDialog
        row={activeRow}
        onClose={() => setActiveId(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["coach-check-ins"] });
          qc.invalidateQueries({
            queryKey: ["coach-check-ins-pending-count"],
          });
        }}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: "warning";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={cn(
            "bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-md",
            tone === "warning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            {label}
          </p>
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CheckInReviewDialog({
  row,
  onClose,
  onSaved,
}: {
  row: CheckInRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [feedback, setFeedback] = React.useState("");

  React.useEffect(() => {
    setFeedback(row?.professionalFeedback ?? "");
  }, [row?.id, row?.professionalFeedback]);

  const saveMutation = useMutation({
    mutationFn: async (args: { status?: "PENDING" | "REVIEWED" }) => {
      if (!row) return;
      const res = await fetch(`/api/check-ins/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalFeedback: feedback || null,
          ...(args.status ? { status: args.status } : {}),
        }),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Salvato");
      onSaved();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!row) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Check-in · {row.patient.fullName} · {formatDate(row.date)}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { url: row.frontPhotoUrl, label: "Fronte" },
              { url: row.sidePhotoUrl, label: "Fianco" },
              { url: row.backPhotoUrl, label: "Schiena" },
            ].map((p) => (
              <div key={p.label} className="flex flex-col gap-1">
                <span className="text-muted-foreground text-[10px] uppercase">
                  {p.label}
                </span>
                {p.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.url}
                    alt={p.label}
                    className="border-border aspect-[3/4] w-full rounded border object-cover"
                  />
                ) : (
                  <div className="bg-muted/40 border-border text-muted-foreground flex aspect-[3/4] w-full items-center justify-center rounded border text-xs">
                    —
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground text-xs uppercase">Peso</p>
              <p className="font-heading text-lg tabular-nums">
                {row.weight != null ? `${row.weight.toFixed(1)} kg` : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Rating</p>
              <p className="font-heading text-lg tabular-nums">
                {row.rating != null ? `${row.rating}/5` : "—"}
              </p>
            </div>
            {row.measurements &&
              Object.entries(row.measurements)
                .filter(([, v]) => v != null)
                .slice(0, 6)
                .map(([k, v]) => (
                  <div key={k}>
                    <p className="text-muted-foreground text-xs uppercase">
                      {k}
                    </p>
                    <p className="font-heading text-lg tabular-nums">
                      {v} cm
                    </p>
                  </div>
                ))}
          </div>

          {row.notes && (
            <div>
              <p className="text-muted-foreground text-xs uppercase">
                Note del cliente
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{row.notes}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="feedback">Tuo feedback</Label>
            <Textarea
              id="feedback"
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Scrivi una nota operativa: progressione, aderenza, correzioni..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saveMutation.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => saveMutation.mutate({})}
            disabled={saveMutation.isPending}
          >
            Salva bozza
          </Button>
          <Button
            type="button"
            onClick={() => saveMutation.mutate({ status: "REVIEWED" })}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Marca come rivisto"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
