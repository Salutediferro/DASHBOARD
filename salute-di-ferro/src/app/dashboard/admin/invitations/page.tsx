"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Mail,
  Send,
  TicketCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import type { InvitationStatus } from "@prisma/client";
import { toast } from "@/lib/toast";

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
import { AdminListSkeleton } from "@/components/admin/admin-skeletons";

type Row = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  note: string | null;
  professionalRole: "DOCTOR" | "COACH";
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  usedAt: string | null;
  professional: { id: string; fullName: string; email: string };
  usedBy: { id: string; fullName: string; email: string } | null;
};

type ListResponse = {
  items: Row[];
  total: number;
  page: number;
  perPage: number;
  counts: Record<InvitationStatus, number>;
};

const PER_PAGE = 30;

const STATUS_META: Record<
  InvitationStatus,
  { label: string; tone: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: "In attesa",
    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    icon: <Clock className="h-3 w-3" />,
  },
  ACCEPTED: {
    label: "Accettato",
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  EXPIRED: {
    label: "Scaduto",
    tone: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
    icon: <XCircle className="h-3 w-3" />,
  },
  REVOKED: {
    label: "Revocato",
    tone: "bg-red-500/15 text-red-700 dark:text-red-300",
    icon: <XCircle className="h-3 w-3" />,
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fullNameOf(r: Row) {
  const n = [r.firstName, r.lastName].filter(Boolean).join(" ").trim();
  return n || r.email || "Senza nome";
}

export default function AdminInvitationsPage() {
  const qc = useQueryClient();
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<string>("ALL");
  const [page, setPage] = React.useState(1);

  const onQChange = (v: string) => {
    setQ(v);
    setPage(1);
  };
  const onStatusChange = (v: string) => {
    setStatus(v);
    setPage(1);
  };
  const onReset = () => {
    setQ("");
    setStatus("ALL");
    setPage(1);
  };

  const { data, isLoading, isFetching } = useQuery<ListResponse>({
    queryKey: ["admin-invitations", { q, status, page }],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (status !== "ALL") sp.set("status", status);
      sp.set("page", String(page));
      sp.set("perPage", String(PER_PAGE));
      const res = await fetch(`/api/admin/invitations?${sp.toString()}`);
      if (!res.ok) throw new Error("Errore caricamento inviti");
      return res.json();
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const counts = data?.counts;

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin-invitations"] });

  const resendMutation = useMutation<
    {
      ok: true;
      emailDelivered: boolean;
      fallbackLink: string | null;
      expiresAt: string;
    },
    Error,
    string
  >({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/invitations/${id}/resend`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string" ? json.error : "Resend fallito",
        );
      }
      return json;
    },
    onSuccess: (data) => {
      if (data.emailDelivered) {
        toast.success(
          `Invito reinviato — scade il ${formatDate(data.expiresAt)}`,
        );
      } else if (data.fallbackLink) {
        void navigator.clipboard
          ?.writeText(data.fallbackLink)
          .catch(() => undefined);
        toast.warning(
          "Invio email fallito — link reinvito copiato negli appunti",
        );
      }
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeMutation = useMutation<unknown, Error, string>({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invitations/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string" ? json.error : "Revoca fallita",
        );
      }
      return json;
    },
    onSuccess: () => {
      toast.success("Invito revocato");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Inviti
        </h1>
        <p className="text-muted-foreground text-sm">
          Tutti gli inviti generati dai professionisti della piattaforma.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"] as InvitationStatus[]).map(
          (s) => (
            <Card key={s}>
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-md",
                    STATUS_META[s].tone,
                  )}
                >
                  {STATUS_META[s].icon}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">
                    {STATUS_META[s].label}
                  </p>
                  <p className="font-heading text-2xl font-semibold tabular-nums">
                    {counts ? counts[s] : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ),
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 border-b border-border pb-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="q">Cerca</Label>
          <Input
            id="q"
            placeholder="Email, nome, professionista..."
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            className="w-[280px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Stato</Label>
          <Select value={status} onValueChange={(v) => onStatusChange(v ?? "ALL")}>
            <SelectTrigger id="status" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutti</SelectItem>
              <SelectItem value="PENDING">In attesa</SelectItem>
              <SelectItem value="ACCEPTED">Accettati</SelectItem>
              <SelectItem value="EXPIRED">Scaduti</SelectItem>
              <SelectItem value="REVOKED">Revocati</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(q || status !== "ALL") && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            Reset
          </Button>
        )}
      </div>

      {isLoading ? (
        <AdminListSkeleton rows={6} />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <TicketCheck className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">
              Nessun invito con questi filtri.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {total} invit{total === 1 ? "o" : "i"}
              {isFetching && !isLoading && (
                <Loader2 className="text-muted-foreground ml-2 inline h-3 w-3 animate-spin" />
              )}
            </CardTitle>
            <span className="text-muted-foreground text-xs">
              Pagina {page} di {totalPages}
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {items.map((row) => {
                const canResend =
                  row.status !== "ACCEPTED" && row.email !== null;
                const canRevoke =
                  row.status === "PENDING" || row.status === "EXPIRED";
                return (
                  <li
                    key={row.id}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {fullNameOf(row)}
                        </p>
                        <Badge
                          variant="secondary"
                          className={cn("gap-1", STATUS_META[row.status].tone)}
                        >
                          {STATUS_META[row.status].icon}
                          {STATUS_META[row.status].label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {row.professionalRole === "DOCTOR"
                            ? "Medico"
                            : "Coach"}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-3 text-xs">
                        {row.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {row.email}
                          </span>
                        )}
                        <span>
                          Da <span className="text-foreground">{row.professional.fullName}</span>
                        </span>
                        <span>Creato il {formatDate(row.createdAt)}</span>
                        <span>
                          {row.status === "PENDING"
                            ? `Scade il ${formatDate(row.expiresAt)}`
                            : row.status === "ACCEPTED" && row.usedAt
                              ? `Usato il ${formatDate(row.usedAt)}`
                              : `Scaduto il ${formatDate(row.expiresAt)}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canResend && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resendMutation.mutate(row.id)}
                          disabled={
                            resendMutation.isPending &&
                            resendMutation.variables === row.id
                          }
                          className="gap-1"
                        >
                          {resendMutation.isPending &&
                          resendMutation.variables === row.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          Reinvia
                        </Button>
                      )}
                      {canRevoke && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Revocare l'invito a ${fullNameOf(row)}?`,
                              )
                            ) {
                              revokeMutation.mutate(row.id);
                            }
                          }}
                          disabled={
                            revokeMutation.isPending &&
                            revokeMutation.variables === row.id
                          }
                          className="gap-1"
                        >
                          {revokeMutation.isPending &&
                          revokeMutation.variables === row.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          Revoca
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isFetching}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Precedente
          </Button>
          <span className="text-muted-foreground text-xs">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isFetching}
            className="gap-1"
          >
            Successiva
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
