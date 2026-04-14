"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mic, Plus, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { ChatMessage, Conversation } from "@/lib/mock-ai";

const QUICK_ACTIONS = [
  "Qual è il mio allenamento di oggi?",
  "Come si fa lo squat correttamente?",
  "Posso sostituire il pollo nel pranzo?",
  "Cosa significa RPE?",
];

type DisplayMessage = ChatMessage & { streaming?: boolean };

export default function AIAssistantPage() {
  const qc = useQueryClient();
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [messages, setMessages] = React.useState<DisplayMessage[]>([]);
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["ai-conversations"],
    queryFn: async () => {
      const res = await fetch("/api/ai/conversations");
      return res.json();
    },
  });

  // Load selected conversation messages
  React.useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    const existing = conversations.find((c) => c.id === conversationId);
    if (existing) setMessages(existing.messages);
  }, [conversationId, conversations]);

  // Scroll to bottom on new messages
  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return;
    setSending(true);
    const userMsg: DisplayMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    const assistantMsg: DisplayMessage = {
      id: `local-a-${Date.now()}`,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      streaming: true,
    };
    setMessages((m) => [...m, userMsg, assistantMsg]);
    setDraft("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text }),
      });
      if (!res.ok || !res.body) throw new Error("Errore richiesta");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const ev of events) {
          const lines = ev.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          const name = eventLine?.slice(6).trim() ?? "";
          const data = JSON.parse(dataLine.slice(5).trim());
          if (name === "meta") {
            if (!conversationId && data.conversationId) {
              setConversationId(data.conversationId);
            }
          } else if (name === "token") {
            setMessages((prev) => {
              const copy = prev.slice();
              const last = copy[copy.length - 1];
              if (last) {
                copy[copy.length - 1] = {
                  ...last,
                  content: last.content + data.token,
                };
              }
              return copy;
            });
          } else if (name === "done") {
            setMessages((prev) => {
              const copy = prev.slice();
              const last = copy[copy.length - 1];
              if (last) copy[copy.length - 1] = { ...last, streaming: false };
              return copy;
            });
          }
        }
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
      qc.invalidateQueries({ queryKey: ["ai-conversations"] });
    }
  }

  function newConversation() {
    setConversationId(null);
    setMessages([]);
  }

  return (
    <div className="flex min-h-[calc(100vh-180px)] flex-col gap-4 lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64">
        <Card>
          <CardContent className="flex flex-col gap-2 p-3">
            <button
              type="button"
              onClick={newConversation}
              className="bg-primary/10 text-primary hover:bg-primary/20 flex h-10 items-center justify-center gap-1 rounded-md text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Nuova chat
            </button>
            <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Storico
            </div>
            <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setConversationId(c.id)}
                    className={cn(
                      "hover:bg-muted w-full truncate rounded-md px-2 py-2 text-left text-sm",
                      conversationId === c.id && "bg-primary/10 text-primary",
                    )}
                  >
                    {c.title}
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </aside>

      {/* Chat */}
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <header>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            AI Assistant
          </h1>
          <p className="text-muted-foreground text-xs">
            Chiedi qualsiasi cosa su allenamento e nutrizione
          </p>
        </header>

        <Card className="flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            className="flex min-h-[400px] flex-1 flex-col gap-3 overflow-y-auto p-4"
          >
            {messages.length === 0 ? (
              <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-full">
                  <Sparkles className="text-primary h-7 w-7" />
                </div>
                <p className="text-sm">Come posso aiutarti oggi?</p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex items-start gap-2",
                    m.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {m.role === "assistant" && (
                    <div className="bg-primary/10 border-primary/40 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border">
                      <span className="text-primary font-mono text-[10px] font-bold">
                        SDF
                      </span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-muted text-foreground rounded-br-sm"
                        : "border-primary/30 bg-card rounded-bl-sm border",
                    )}
                  >
                    {m.content || (m.streaming ? "…" : "")}
                    {m.streaming && (
                      <span className="bg-primary ml-0.5 inline-block h-4 w-0.5 animate-pulse align-middle" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick actions */}
          {messages.length === 0 && (
            <div className="border-border border-t p-3">
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="hover:bg-muted rounded-full border px-3 py-1.5 text-xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-border border-t p-3">
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(draft);
              }}
            >
              <button
                type="button"
                onClick={() => toast.info("Input vocale in arrivo")}
                className="hover:bg-muted flex h-12 w-12 items-center justify-center rounded-md border"
                aria-label="Voce"
                title="Input vocale (coming soon)"
              >
                <Mic className="h-5 w-5" />
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Scrivi un messaggio..."
                disabled={sending}
                className="bg-background border-border h-12 flex-1 rounded-md border px-3 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-12 w-12 items-center justify-center rounded-md disabled:opacity-50"
                aria-label="Invia"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
