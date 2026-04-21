"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { useUser } from "@/lib/hooks/use-user";
import { useStartConversation } from "@/lib/hooks/use-conversations";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

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
        roleLabel: p.professionalRole === "DOCTOR" ? "Medico" : "Coach",
      }))
    : (patientsQuery.data?.items ?? []).map((r) => ({
        id: r.patient.id,
        fullName: r.patient.fullName,
        avatarUrl: r.patient.avatarUrl,
        roleLabel: "Cliente",
      }));

  async function pick(participantId: string) {
    try {
      const { id } = await start.mutateAsync(participantId);
      onOpenChange(false);
      router.push(`/dashboard/messages/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuova chat</DialogTitle>
          <DialogDescription>
            Scegli con chi avviare la conversazione.
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
            candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c.id)}
                disabled={start.isPending}
                className="focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted/40 disabled:opacity-50"
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
              </button>
            ))
          )}
        </div>
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
