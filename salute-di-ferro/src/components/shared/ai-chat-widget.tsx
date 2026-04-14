"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Send, X, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAIChat, type ChatMode } from "@/components/shared/ai-chat-provider";

const MODE_TABS: { mode: ChatMode; label: string }[] = [
  { mode: "WORKOUT", label: "🏋️ Training" },
  { mode: "NUTRITION", label: "🍎 Nutrizione" },
  { mode: "SUPPORT", label: "💬 Supporto" },
];

const MODE_PLACEHOLDER: Record<ChatMode, string> = {
  WORKOUT: "Chiedi un consiglio sull'allenamento...",
  NUTRITION: "Chiedi qualcosa sulla nutrizione...",
  SUPPORT: "Account, abbonamento, problemi tecnici...",
};

const MODE_WELCOME: Record<ChatMode, string> = {
  WORKOUT: "Ciao! Come posso aiutarti con l'allenamento?",
  NUTRITION: "Ciao! Hai domande sul tuo piano nutrizionale?",
  SUPPORT:
    "Ciao! Sono l'assistente di supporto. Dimmi pure il tuo problema e proverò a risolverlo.",
};

export function AIChatWidget() {
  const pathname = usePathname();
  const {
    open,
    mode,
    messages,
    sending,
    exchanges,
    openPanel,
    closePanel,
    setMode,
    sendMessage,
    reset,
    escalateToCoach,
  } = useAIChat();

  const [draft, setDraft] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Hide on the full AI Assistant page
  const hidden = pathname?.startsWith("/dashboard/client/ai-assistant");

  React.useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, open]);

  if (hidden) return null;

  const showEscalationPrompt =
    mode === "SUPPORT" && exchanges >= 3 && !sending;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          onClick={openPanel}
          aria-label="Apri assistente AI"
          className="bg-primary text-primary-foreground hover:bg-primary/90 fixed right-4 bottom-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 md:right-6 md:bottom-6"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={closePanel}
            aria-hidden
          />
          <div
            role="dialog"
            aria-label="Assistente AI"
            className={cn(
              "bg-card text-card-foreground border-border fixed z-50 flex flex-col shadow-2xl",
              // Mobile: full screen sheet
              "inset-0 md:inset-auto",
              // Desktop: anchored bottom-right
              "md:right-6 md:bottom-6 md:h-[80vh] md:max-h-[700px] md:w-[400px] md:rounded-xl md:border",
            )}
          >
            {/* Header */}
            <div className="border-border flex items-center justify-between border-b p-3">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                  <MessageCircle className="text-primary h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    Assistente Salute di Ferro
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    Sempre disponibile
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Nuova conversazione"
                  className="hover:bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-md"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={closePanel}
                  aria-label="Chiudi"
                  className="hover:bg-muted flex h-8 w-8 items-center justify-center rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-border flex gap-1 border-b p-2">
              {MODE_TABS.map((t) => (
                <button
                  key={t.mode}
                  type="button"
                  onClick={() => setMode(t.mode)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    mode === t.mode
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex flex-1 flex-col gap-3 overflow-y-auto p-3"
            >
              {messages.length === 0 ? (
                <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-xs">
                  <p>{MODE_WELCOME[mode]}</p>
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
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                        m.role === "user"
                          ? "bg-muted rounded-br-sm"
                          : "border-primary/30 bg-background rounded-bl-sm border",
                      )}
                    >
                      {m.content || (m.streaming ? "…" : "")}
                      {m.streaming && (
                        <span className="bg-primary ml-0.5 inline-block h-3 w-0.5 animate-pulse align-middle" />
                      )}
                    </div>
                  </div>
                ))
              )}

              {showEscalationPrompt && (
                <div className="border-primary/40 bg-primary/5 rounded-lg border p-3 text-xs">
                  <p className="mb-2 font-medium">
                    Posso contattare il tuo coach?
                  </p>
                  <p className="text-muted-foreground mb-3">
                    Se non sono riuscito a risolvere la tua richiesta, posso
                    inoltrarla direttamente a un coach umano.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={escalateToCoach}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-md px-3 py-1.5 text-xs font-medium"
                    >
                      Sì, contatta il coach
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="hover:bg-muted flex-1 rounded-md border px-3 py-1.5 text-xs font-medium"
                    >
                      No, continua
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                const text = draft;
                setDraft("");
                void sendMessage(text);
              }}
              className="border-border flex items-center gap-2 border-t p-3"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={MODE_PLACEHOLDER[mode]}
                disabled={sending}
                className="bg-background border-border h-10 flex-1 rounded-md border px-3 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                aria-label="Invia"
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-10 w-10 items-center justify-center rounded-md disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
