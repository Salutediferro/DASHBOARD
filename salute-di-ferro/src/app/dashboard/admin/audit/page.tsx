"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSearch,
  Loader2,
} from "lucide-react";

import { AdminListSkeleton } from "@/components/admin/admin-skeletons";

import { AUDIT_ACTIONS } from "@/lib/audit-actions";
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

type AuditRow = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  actor: { id: string; email: string; fullName: string } | null;
};

type ListResponse = {
  items: AuditRow[];
  total: number;
  page: number;
  perPage: number;
  csvMaxRows: number;
};

const PER_PAGE = 30;

// Group actions into semantic buckets so the badge color telegraphs intent
// at a glance — audit scans are usually "what sensitive thing happened?".
const ACTION_TONE: Record<string, string> = {
  LOGIN: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  LOGOUT: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  PROFILE_UPDATE: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  AVATAR_UPDATE: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  MEDICAL_REPORT_UPLOAD: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  MEDICAL_REPORT_VIEW: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  MEDICAL_REPORT_UPDATE: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  MEDICAL_REPORT_DELETE: "bg-red-500/20 text-red-700 dark:text-red-300",
  REPORT_PERMISSION_GRANT: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  REPORT_PERMISSION_REVOKE: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  BIOMETRIC_CREATE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  BIOMETRIC_UPDATE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  BIOMETRIC_DELETE: "bg-red-500/20 text-red-700 dark:text-red-300",
  APPOINTMENT_CREATE: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  APPOINTMENT_UPDATE: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  APPOINTMENT_CANCEL: "bg-red-500/20 text-red-700 dark:text-red-300",
  AVAILABILITY_CREATE: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  AVAILABILITY_DELETE: "bg-red-500/20 text-red-700 dark:text-red-300",
  USER_REGISTER: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  USER_SOFT_DELETE: "bg-red-500/20 text-red-700 dark:text-red-300",
  USER_EXPORT: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  ADMIN_USER_PROVISION: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  INVITATION_CREATE: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  INVITATION_REVOKE: "bg-red-500/20 text-red-700 dark:text-red-300",
};

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(id: string | null) {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function formatMetadata(m: unknown): string | null {
  if (m == null) return null;
  if (typeof m === "string") return m;
  try {
    return JSON.stringify(m);
  } catch {
    return String(m);
  }
}

function buildQuery(params: {
  q: string;
  action: string;
  from: string;
  to: string;
  page: number;
}) {
  const sp = new URLSearchParams();
  if (params.q.trim()) sp.set("q", params.q.trim());
  if (params.action !== "ALL") sp.set("action", params.action);
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  sp.set("page", String(params.page));
  sp.set("perPage", String(PER_PAGE));
  return sp;
}

export default function AdminAuditPage() {
  const [q, setQ] = React.useState("");
  const [action, setAction] = React.useState<string>("ALL");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [page, setPage] = React.useState(1);

  // Filter setters snap back to page 1 — without this you get empty pages
  // from a narrowed result set sitting on page 5.
  const onQChange = (v: string) => {
    setQ(v);
    setPage(1);
  };
  const onActionChange = (v: string) => {
    setAction(v);
    setPage(1);
  };
  const onFromChange = (v: string) => {
    setFrom(v);
    setPage(1);
  };
  const onToChange = (v: string) => {
    setTo(v);
    setPage(1);
  };
  const onReset = () => {
    setQ("");
    setAction("ALL");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const { data, isLoading, isFetching } = useQuery<ListResponse>({
    queryKey: ["admin-audit", { q, action, from, to, page }],
    queryFn: async () => {
      const sp = buildQuery({ q, action, from, to, page });
      const res = await fetch(`/api/admin/audit?${sp.toString()}`);
      if (!res.ok) throw new Error("Errore nel caricamento audit log");
      return res.json();
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  function handleExport() {
    const sp = buildQuery({ q, action, from, to, page: 1 });
    sp.set("format", "csv");
    sp.delete("page");
    sp.delete("perPage");
    window.location.href = `/api/admin/audit?${sp.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Audit log
          </h1>
          <p className="text-muted-foreground text-sm">
            Tracciabilità delle azioni sensibili (GDPR Art. 30).
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={total === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Esporta CSV
        </Button>
      </header>

      <div className="flex flex-wrap items-end gap-3 border-b border-border pb-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="q">Cerca</Label>
          <Input
            id="q"
            placeholder="Actor, azione, entità..."
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            className="w-[260px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="action">Azione</Label>
          <Select
            value={action}
            onValueChange={(v) => onActionChange(v ?? "ALL")}
          >
            <SelectTrigger id="action" className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutte</SelectItem>
              {AUDIT_ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from">Dal</Label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to">Al</Label>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            className="w-[160px]"
          />
        </div>
        {(q || action !== "ALL" || from || to) && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            Reset
          </Button>
        )}
      </div>

      {isLoading ? (
        <AdminListSkeleton rows={8} />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <FileSearch className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">
              Nessuna azione trovata con questi filtri.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {total} azion{total === 1 ? "e" : "i"}
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
                const metaStr = formatMetadata(row.metadata);
                return (
                  <li key={row.id} className="flex flex-col gap-2 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "font-mono text-xs",
                          ACTION_TONE[row.action] ?? "bg-muted",
                        )}
                      >
                        {row.action}
                      </Badge>
                      <span className="text-sm font-medium">
                        {row.entityType}
                      </span>
                      {row.entityId && (
                        <span className="text-muted-foreground font-mono text-xs">
                          {shortId(row.entityId)}
                        </span>
                      )}
                      <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                        {formatTimestamp(row.createdAt)}
                      </span>
                    </div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
                      <span>
                        {row.actor ? (
                          <>
                            <span className="text-foreground">
                              {row.actor.fullName}
                            </span>{" "}
                            · {row.actor.email}
                          </>
                        ) : (
                          <span className="italic">Sistema</span>
                        )}
                      </span>
                      {row.ipAddress && (
                        <span className="font-mono">{row.ipAddress}</span>
                      )}
                    </div>
                    {metaStr && (
                      <details className="group">
                        <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
                          <span className="group-open:hidden">
                            Metadata ▸
                          </span>
                          <span className="hidden group-open:inline">
                            Metadata ▾
                          </span>
                        </summary>
                        <pre className="bg-muted/40 mt-1 overflow-x-auto rounded-md p-2 font-mono text-xs leading-relaxed">
                          {metaStr}
                        </pre>
                      </details>
                    )}
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
