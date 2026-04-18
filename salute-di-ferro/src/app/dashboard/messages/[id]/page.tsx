"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Send } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  useMarkConversationRead,
  useSendMessage,
  useThread,
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function ThreadPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;
  const { profile } = useUser();
  const { data, isLoading } = useThread(conversationId);
  const send = useSendMessage(conversationId);
  const markRead = useMarkConversationRead();

  const [draft, setDraft] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // On mount (and any time new messages arrive) mark the thread as read.
  const lastMessageId = data?.messages[data.messages.length - 1]?.id;
  React.useEffect(() => {
    if (conversationId) markRead.mutate(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, lastMessageId]);

  // Auto-scroll to the bottom on new messages.
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lastMessageId]);

  const other = data?.conversation.members.find((m) => m.userId !== profile?.id);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || send.isPending) return;
    try {
      await send.mutateAsync(body);
      setDraft("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore invio");
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <header className="flex items-center gap-3">
        <Link
          href="/dashboard/messages"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        {other && (
          <>
            <Avatar className="h-10 w-10">
              {other.user.avatarUrl && (
                <AvatarImage src={other.user.avatarUrl} />
              )}
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {initials(other.user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">
                {other.user.fullName}
              </p>
              <p className="text-muted-foreground text-xs">
                {other.user.role === "DOCTOR"
                  ? "Medico"
                  : other.user.role === "COACH"
                    ? "Coach"
                    : other.user.role === "PATIENT"
                      ? "Paziente"
                      : "Admin"}
              </p>
            </div>
          </>
        )}
      </header>

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardContent
          ref={scrollRef}
          className="flex flex-1 flex-col gap-2 overflow-y-auto p-4"
        >
          {data.messages.length === 0 ? (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              Nessun messaggio. Scrivi il primo.
            </div>
          ) : (
            <MessageList
              messages={data.messages}
              meId={profile?.id}
              otherName={other?.user.fullName ?? ""}
            />
          )}
        </CardContent>
      </Card>

      <form onSubmit={submit} className="flex items-end gap-2">
        <Textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(e);
            }
          }}
          placeholder="Scrivi un messaggio... (Invio per inviare, Shift+Invio per nuova riga)"
          disabled={send.isPending}
          className="max-h-32 flex-1 resize-none"
        />
        <button
          type="submit"
          disabled={send.isPending || draft.trim().length === 0}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md disabled:opacity-50"
          aria-label="Invia"
        >
          {send.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}

function MessageList({
  messages,
  meId,
  otherName,
}: {
  messages: Array<{ id: string; senderId: string; body: string; createdAt: string }>;
  meId: string | undefined;
  otherName: string;
}) {
  // Group by day for a date separator.
  const nodes: React.ReactNode[] = [];
  let lastDate = "";
  for (const m of messages) {
    const day = new Date(m.createdAt).toDateString();
    if (day !== lastDate) {
      nodes.push(
        <div
          key={`sep-${m.id}`}
          className="text-muted-foreground my-2 text-center text-[10px] uppercase tracking-wider"
        >
          {formatDate(m.createdAt)}
        </div>,
      );
      lastDate = day;
    }
    const mine = m.senderId === meId;
    nodes.push(
      <div
        key={m.id}
        className={cn("flex", mine ? "justify-end" : "justify-start")}
      >
        <div
          className={cn(
            "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
            mine
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted rounded-bl-sm",
          )}
        >
          {!mine && (
            <p className="text-muted-foreground mb-0.5 text-[10px] font-semibold uppercase">
              {otherName}
            </p>
          )}
          <p className="whitespace-pre-wrap break-words">{m.body}</p>
          <p
            className={cn(
              "mt-0.5 text-right text-[10px]",
              mine ? "text-primary-foreground/60" : "text-muted-foreground",
            )}
          >
            {formatTime(m.createdAt)}
          </p>
        </div>
      </div>,
    );
  }
  return <>{nodes}</>;
}
