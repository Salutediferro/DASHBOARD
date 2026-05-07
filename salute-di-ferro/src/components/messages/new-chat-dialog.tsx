"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/hooks/use-user";
import { useStartConversation } from "@/lib/hooks/use-conversations";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

/**
 * Single picker that supports both 1:1 chats and patient-initiated
 * groups (multiple professionals in one thread). For pros the dialog
 * stays single-select — only patients can pull multiple people into a
 * room (see canMessageMany on the server). The "Avvia chat" button at
 * the bottom posts the full set; the server returns either an existing
 * conversation with that exact membership or a fresh one.
 */
export function NewChatDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { profile } = useUser();
  const start = useStartConversation();

  const isPatient = profile?.role === "PATIENT";
  const isPro = profile?.role === "DOCTOR" || profile?.role === "COACH";

  const patientsQuery = useQuery<{
    items: Array<{
      patientId: string;
      patient: { id: string; fullName: string; avatarUrl: string | null };
    }>;
  }>({
    queryKey: ["my-patients-for-chat"],
    enabled: open && isPro,
    queryFn: async () => {
      const res = await fetch("/api/clients?status=ACTIVE");
      if (!res.ok) return { items: [] };
      return res.json();
    },
  });

  const prosQuery = useQuery<
    Array<{
      professional: { id: string; fullName: string; avatarUrl: string | null };
      professionalRole: "DOCTOR" | "COACH";
    }>
  >({
    queryKey: ["my-professionals"],
    enabled: open && isPatient,
    queryFn: async () => {
      const res = await fetch("/api/me/professionals");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const candidates = isPatient
    ? (prosQuery.data ?? []).map((p) => ({
        id: p.professional.id,
        fullName: p.professional.fullName,
        avatarUrl: p.professional.avatarUrl,
        roleLabel: p.professionalRole === "DOCTOR" ? "Professionista" : "Coach",
      }))
    : (patientsQuery.data?.items ?? []).map((r) => ({
        id: r.patient.id,
        fullName: r.patient.fullName,
        avatarUrl: r.patient.avatarUrl,
        roleLabel: "Cliente",
      }));

  // Patients can group-chat with multiple pros at once. Pros and admins
  // stay single-select.
  const supportsMulti = isPatient;

  const [selected, setSelected] = React.useState<string[]>([]);

  // Reset on (re)open so a stale selection doesn't bleed into a new
  // dialog session.
  React.useEffect(() => {
    if (open) setSelected([]);
  }, [open]);

  function toggle(id: string) {
    setSelected((prev) => {
      const has = prev.includes(id);
      if (!supportsMulti) return has ? [] : [id];
      return has ? prev.filter((p) => p !== id) : [...prev, id];
    });
  }

  async function submit() {
    if (selected.length === 0) return;
    try {
      const { id } = await start.mutateAsync(selected);
      onOpenChange(false);
      router.push(`/dashboard/messages/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  const canSubmit = selected.length > 0 && !start.isPending;
  const isGroup = selected.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuova chat</DialogTitle>
          <DialogDescription>
            {supportsMulti
              ? "Seleziona uno o più professionisti del tuo team. Selezionandone due o più crei una chat di gruppo."
              : "Scegli con chi avviare la conversazione."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          {candidates.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {isPatient
                ? "Non hai ancora professionisti collegati."
                : "Nessun cliente attivo."}
            </p>
          ) : (
            candidates.map((c) => {
              const checked = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  disabled={start.isPending}
                  aria-pressed={supportsMulti ? checked : undefined}
                  className={cn(
                    "focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors disabled:opacity-50",
                    checked
                      ? "bg-primary-500/10 ring-1 ring-inset ring-primary-500/30"
                      : "hover:bg-muted/40",
                  )}
                >
                  <Avatar className="h-9 w-9">
                    {c.avatarUrl && <AvatarImage src={c.avatarUrl} />}
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {initials(c.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.fullName}</p>
                    <p className="text-xs text-muted-foreground">{c.roleLabel}</p>
                  </div>
                  {supportsMulti && (
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                        checked
                          ? "border-primary-500 bg-primary-500 text-primary-foreground"
                          : "border-border bg-card",
                      )}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {candidates.length > 0 && (
          <DialogFooter>
            <p className="text-muted-foreground mr-auto inline-flex items-center gap-1.5 text-xs">
              {isGroup && <Users className="h-3.5 w-3.5" aria-hidden />}
              {selected.length === 0
                ? "Nessuno selezionato"
                : isGroup
                  ? `Gruppo · ${selected.length} membri`
                  : "1 selezionato"}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={start.isPending}
            >
              Annulla
            </Button>
            <Button type="button" onClick={submit} disabled={!canSubmit}>
              {start.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isGroup ? "Avvia gruppo" : "Avvia chat"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
