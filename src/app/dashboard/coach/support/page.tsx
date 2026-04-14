"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, MessageSquare, LifeBuoy } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Escalation, EscalationStatus } from "@/lib/mock-escalations";

type TabValue = "ALL" | "OPEN" | "RESOLVED";

const TABS: { value: TabValue; label: string }[] = [
  { value: "OPEN", label: "Aperte" },
  { value: "ALL", label: "Tutte" },
  { value: "RESOLVED", label: "Risolte" },
];

const CATEGORY_LABEL: Record<string, string> = {
  ACCOUNT: "Account",
  BILLING: "Abbonamento",
  TRAINING: "Allenamento",
  NUTRITION: "Nutrizione",
  TECHNICAL: "Tecnico",
  OTHER: "Altro",
};

function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "adesso";
  if (min < 60) return `${min} min fa`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ore fa`;
  const d = Math.floor(h / 24);
  return `${d} giorni fa`;
}

async function fetchEscalations(
  tab: TabValue,
): Promise<Escalation[]> {
  const qs = tab === "ALL" ? "" : `?status=${tab}`;
  const res = await fetch(`/api/escalations${qs}`);
  if (!res.ok) throw new Error("Errore caricamento escalation");
  const data = (await res.json()) as { escalations: Escalation[] };
  return data.escalations;
}

export default function CoachSupportPage() {
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<TabValue>("OPEN");
  const [replyTarget, setReplyTarget] = React.useState<Escalation | null>(null);
  const [replyText, setReplyText] = React.useState("");

  const { data: escalations = [], isLoading } = useQuery({
    queryKey: ["escalations", tab],
    queryFn: () => fetchEscalations(tab),
  });

  const patchMutation = useMutation({
    mutationFn: async (input: {
      id: string;
      action: "RESOLVE" | "REPLY";
      message?: string;
    }) => {
      const res = await fetch("/api/escalations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Errore aggiornamento");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["escalations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleResolve(id: string) {
    if (!window.confirm("Segnare questa richiesta come risolta?")) return;
    patchMutation.mutate({ id, action: "RESOLVE" }, {
      onSuccess: () => toast.success("Richiesta risolta"),
    });
  }

  function handleOpenReply(esc: Escalation) {
    setReplyTarget(esc);
    setReplyText("");
  }

  function handleSubmitReply() {
    if (!replyTarget || !replyText.trim()) return;
    patchMutation.mutate(
      { id: replyTarget.id, action: "REPLY", message: replyText.trim() },
      {
        onSuccess: () => {
          toast.success("Risposta inviata al cliente");
          setReplyTarget(null);
          setReplyText("");
        },
      },
    );
  }

  const openCount = React.useMemo(
    () =>
      (escalations as Escalation[]).filter((e) => e.status === "OPEN").length,
    [escalations],
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <LifeBuoy className="text-primary h-6 w-6" />
            Supporto clienti
          </h1>
          <p className="text-muted-foreground text-xs">
            Richieste escalate dall'assistente AI
          </p>
        </div>
        {tab === "OPEN" && openCount > 0 && (
          <Badge className="bg-destructive text-destructive-foreground">
            {openCount} aperte
          </Badge>
        )}
      </header>

      <div className="border-border flex w-fit gap-1 rounded-lg border p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2 p-3">
          {isLoading ? (
            <div className="text-muted-foreground p-6 text-center text-sm">
              Caricamento...
            </div>
          ) : escalations.length === 0 ? (
            <div className="text-muted-foreground p-6 text-center text-sm">
              Nessuna richiesta in questa categoria.
            </div>
          ) : (
            escalations.map((esc) => (
              <EscalationRow
                key={esc.id}
                escalation={esc}
                onReply={() => handleOpenReply(esc)}
                onResolve={() => handleResolve(esc.id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Dialog
        open={replyTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setReplyTarget(null);
            setReplyText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rispondi al cliente</DialogTitle>
            <DialogDescription>
              {replyTarget?.clientName} —{" "}
              {CATEGORY_LABEL[replyTarget?.category ?? "OTHER"]}
            </DialogDescription>
          </DialogHeader>
          {replyTarget && (
            <div className="bg-muted/50 rounded-md p-3 text-xs whitespace-pre-wrap">
              {replyTarget.summary}
            </div>
          )}
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Scrivi la tua risposta..."
            rows={6}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReplyTarget(null);
                setReplyText("");
              }}
            >
              Annulla
            </Button>
            <Button
              onClick={handleSubmitReply}
              disabled={!replyText.trim() || patchMutation.isPending}
            >
              Invia risposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EscalationRow({
  escalation,
  onReply,
  onResolve,
}: {
  escalation: Escalation;
  onReply: () => void;
  onResolve: () => void;
}) {
  const isOpen = escalation.status === "OPEN";
  return (
    <div className="border-border hover:bg-muted/30 flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{escalation.clientName}</span>
          <Badge variant="outline" className="text-[10px]">
            {CATEGORY_LABEL[escalation.category] ?? escalation.category}
          </Badge>
          <StatusBadge status={escalation.status} />
          <span className="text-muted-foreground text-[10px]">
            {formatRelative(escalation.createdAt)}
          </span>
        </div>
        <p className="text-muted-foreground line-clamp-2 text-xs">
          {escalation.summary}
        </p>
      </div>
      {isOpen && (
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={onReply}>
            <MessageSquare className="mr-1 h-3 w-3" /> Rispondi
          </Button>
          <Button size="sm" onClick={onResolve}>
            <CheckCircle2 className="mr-1 h-3 w-3" /> Risolvi
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: EscalationStatus }) {
  if (status === "OPEN") {
    return (
      <Badge className="bg-destructive/10 text-destructive border-destructive/30 border text-[10px]">
        Aperta
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px]">
      Risolta
    </Badge>
  );
}
