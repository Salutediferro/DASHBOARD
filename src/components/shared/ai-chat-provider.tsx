"use client";

import * as React from "react";
import { toast } from "sonner";

import type { ChatMessage } from "@/lib/mock-ai";

export type ChatMode = "WORKOUT" | "NUTRITION" | "SUPPORT";

type DisplayMessage = ChatMessage & { streaming?: boolean };

type ModeState = {
  conversationId: string | null;
  messages: DisplayMessage[];
  exchanges: number;
};

type AIChatContextValue = {
  open: boolean;
  mode: ChatMode;
  sending: boolean;
  conversationId: string | null;
  messages: DisplayMessage[];
  exchanges: number;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setMode: (mode: ChatMode) => void;
  sendMessage: (text: string) => Promise<void>;
  reset: () => void;
  escalateToCoach: () => Promise<void>;
};

const AIChatContext = React.createContext<AIChatContextValue | null>(null);

const STORAGE_KEY = "sdf-ai-chat-state-v1";

function loadPersisted(): Record<ChatMode, string | null> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistIds(ids: Record<ChatMode, string | null>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

const EMPTY: ModeState = { conversationId: null, messages: [], exchanges: 0 };

export function AIChatProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [mode, setModeState] = React.useState<ChatMode>("WORKOUT");
  const [sending, setSending] = React.useState(false);
  const [states, setStates] = React.useState<Record<ChatMode, ModeState>>({
    WORKOUT: { ...EMPTY },
    NUTRITION: { ...EMPTY },
    SUPPORT: { ...EMPTY },
  });

  // Restore persisted conversationIds on first mount
  React.useEffect(() => {
    const persisted = loadPersisted();
    if (!persisted) return;
    setStates((prev) => ({
      WORKOUT: { ...prev.WORKOUT, conversationId: persisted.WORKOUT ?? null },
      NUTRITION: {
        ...prev.NUTRITION,
        conversationId: persisted.NUTRITION ?? null,
      },
      SUPPORT: { ...prev.SUPPORT, conversationId: persisted.SUPPORT ?? null },
    }));
  }, []);

  const persist = React.useCallback(
    (next: Record<ChatMode, ModeState>) => {
      persistIds({
        WORKOUT: next.WORKOUT.conversationId,
        NUTRITION: next.NUTRITION.conversationId,
        SUPPORT: next.SUPPORT.conversationId,
      });
    },
    [],
  );

  const openPanel = React.useCallback(() => setOpen(true), []);
  const closePanel = React.useCallback(() => setOpen(false), []);
  const togglePanel = React.useCallback(() => setOpen((v) => !v), []);

  const setMode = React.useCallback((m: ChatMode) => {
    setModeState(m);
  }, []);

  const reset = React.useCallback(() => {
    setStates((prev) => {
      const next = { ...prev, [mode]: { ...EMPTY } };
      persist(next);
      return next;
    });
  }, [mode, persist]);

  const sendMessage = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      const currentMode = mode;
      setSending(true);

      const userMsg: DisplayMessage = {
        id: `local-u-${Date.now()}`,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      const assistantMsg: DisplayMessage = {
        id: `local-a-${Date.now()}`,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        streaming: true,
      };

      setStates((prev) => ({
        ...prev,
        [currentMode]: {
          ...prev[currentMode],
          messages: [...prev[currentMode].messages, userMsg, assistantMsg],
        },
      }));

      const currentConvId = states[currentMode].conversationId;

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: currentConvId,
            message: trimmed,
            mode: currentMode,
          }),
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
              if (data.conversationId) {
                setStates((prev) => {
                  const next = {
                    ...prev,
                    [currentMode]: {
                      ...prev[currentMode],
                      conversationId: data.conversationId,
                    },
                  };
                  persist(next);
                  return next;
                });
              }
            } else if (name === "token") {
              setStates((prev) => {
                const cm = prev[currentMode];
                const msgs = cm.messages.slice();
                const last = msgs[msgs.length - 1];
                if (last) {
                  msgs[msgs.length - 1] = {
                    ...last,
                    content: last.content + data.token,
                  };
                }
                return {
                  ...prev,
                  [currentMode]: { ...cm, messages: msgs },
                };
              });
            } else if (name === "done") {
              setStates((prev) => {
                const cm = prev[currentMode];
                const msgs = cm.messages.slice();
                const last = msgs[msgs.length - 1];
                if (last) {
                  msgs[msgs.length - 1] = { ...last, streaming: false };
                }
                return {
                  ...prev,
                  [currentMode]: {
                    ...cm,
                    messages: msgs,
                    exchanges: cm.exchanges + 1,
                  },
                };
              });
            }
          }
        }
      } catch (e) {
        toast.error((e as Error).message);
        setStates((prev) => {
          const cm = prev[currentMode];
          const msgs = cm.messages.slice();
          const last = msgs[msgs.length - 1];
          if (last) msgs[msgs.length - 1] = { ...last, streaming: false };
          return { ...prev, [currentMode]: { ...cm, messages: msgs } };
        });
      } finally {
        setSending(false);
      }
    },
    [mode, sending, states, persist],
  );

  const escalateToCoach = React.useCallback(async () => {
    const current = states.SUPPORT;
    const last = current.messages
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Cliente" : "AI"}: ${m.content}`)
      .join("\n");
    const summary =
      last.length > 0
        ? last
        : "Il cliente richiede assistenza dal coach ma la conversazione è vuota.";

    try {
      const res = await fetch("/api/ai/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: current.conversationId ?? undefined,
          conversationSummary: summary,
          category: "OTHER",
        }),
      });
      if (!res.ok) throw new Error("Errore invio richiesta");
      toast.success("Richiesta inviata al coach. Ti risponderà a breve.");
      setStates((prev) => ({
        ...prev,
        SUPPORT: { ...prev.SUPPORT, exchanges: 0 },
      }));
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [states]);

  const current = states[mode];

  const value: AIChatContextValue = {
    open,
    mode,
    sending,
    conversationId: current.conversationId,
    messages: current.messages,
    exchanges: current.exchanges,
    openPanel,
    closePanel,
    togglePanel,
    setMode,
    sendMessage,
    reset,
    escalateToCoach,
  };

  return (
    <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>
  );
}

export function useAIChat() {
  const ctx = React.useContext(AIChatContext);
  if (!ctx) throw new Error("useAIChat must be used within AIChatProvider");
  return ctx;
}
