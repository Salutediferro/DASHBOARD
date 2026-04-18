"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  MessageSquare,
  Plus,
  Stethoscope,
  UserRound,
} from "lucide-react";
import type { UserRole } from "@prisma/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import {
  useConversations,
  useStartConversation,
  type ConversationListItem,
} from "@/lib/hooks/use-conversations";
import { useUser } from "@/lib/hooks/use-user";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (diffMin < 1) return "ora";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

export default function MessagesPage() {
  const [newOpen, setNewOpen] = React.useState(false);
  const { data, isLoading } = useConversations();

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Messaggi
          </h1>
          <p className="text-muted-foreground text-sm">
            Conversazioni dirette con il tuo team.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Nuova chat
        </button>
      </header>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <MessageSquare className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">
              Nessuna conversazione. Avviane una nuova.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {items.map((c) => (
                <ConversationRow key={c.id} conversation={c} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <NewChatDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

function ConversationRow({
  conversation,
}: {
  conversation: ConversationListItem;
}) {
  const { profile } = useUser();
  const other = conversation.others[0];
  if (!other) return null;
  const unread = conversation.unreadCount > 0;
  const lastIsMine =
    conversation.lastMessage?.senderId === profile?.id;

  return (
    <li>
      <Link
        href={`/dashboard/messages/${conversation.id}`}
        className={cn(
          "hover:bg-muted/40 flex items-center gap-3 px-4 py-3 transition-colors",
          unread && "bg-primary/5",
        )}
      >
        <Avatar className="h-10 w-10">
          {other.avatarUrl && <AvatarImage src={other.avatarUrl} />}
          <AvatarFallback className="bg-primary/20 text-primary text-xs">
            {initials(other.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "truncate text-sm",
                unread ? "font-semibold" : "font-medium",
              )}
            >
              {other.fullName}
            </p>
            <RoleTag role={other.role} />
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {conversation.lastMessage
              ? `${lastIsMine ? "Tu: " : ""}${conversation.lastMessage.body}`
              : "Nessun messaggio"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-muted-foreground text-[10px]">
            {conversation.lastMessage
              ? formatWhen(conversation.lastMessage.createdAt)
              : formatWhen(conversation.updatedAt)}
          </span>
          {unread && (
            <Badge className="bg-primary text-primary-foreground h-5 min-w-5 justify-center px-1.5 text-[10px]">
              {conversation.unreadCount}
            </Badge>
          )}
        </div>
      </Link>
    </li>
  );
}

function RoleTag({ role }: { role: UserRole }) {
  if (role === "DOCTOR")
    return (
      <Badge variant="outline" className="gap-1 text-[10px]">
        <Stethoscope className="h-3 w-3" /> Medico
      </Badge>
    );
  if (role === "COACH")
    return (
      <Badge variant="outline" className="gap-1 text-[10px]">
        <UserRound className="h-3 w-3" /> Coach
      </Badge>
    );
  return null;
}

function NewChatDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const { profile } = useUser();
  const start = useStartConversation();

  // Candidates differ by role: patients start with their active pros;
  // pros start with their active patients.
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
        roleLabel: "Paziente",
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
        </DialogHeader>
        <div className="flex flex-col gap-1">
          {candidates.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {isPatient
                ? "Non hai ancora professionisti collegati."
                : "Nessun paziente attivo."}
            </p>
          ) : (
            candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c.id)}
                disabled={start.isPending}
                className="hover:bg-muted/40 flex items-center gap-3 rounded-md px-3 py-2 text-left disabled:opacity-50"
              >
                <Avatar className="h-9 w-9">
                  {c.avatarUrl && <AvatarImage src={c.avatarUrl} />}
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {initials(c.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.fullName}</p>
                  <p className="text-muted-foreground text-xs">{c.roleLabel}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
