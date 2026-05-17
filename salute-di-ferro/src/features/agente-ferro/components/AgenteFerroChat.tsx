"use client";

/**
 * AgenteFerroChat · chat principale Agente di Ferro.
 *
 * Stack: AI SDK v6 useChat + DefaultChatTransport → POST /api/agente-ferro.
 *
 * Pattern a11y (review accessibility-lead 6 mag 2026):
 *  - <section aria-labelledby="agente-titolo"> + H2 dentro header.
 *  - Live region SOLO al complete (aria-atomic="true"), NON token-by-token.
 *  - aria-busy sul container chat durante streaming.
 *  - Tool invocation: status sr-only + cleanup a null.
 *  - Suggested = <div role="group"> + <ul> + <button>, NO listbox.
 *  - Hint visibile + aria-describedby su textarea.
 *  - Send button disabled reale (non aria-disabled). Pattern Stop durante streaming.
 *  - Avatar aria-hidden + live region testuale separata.
 *  - Skip link "Vai al campo messaggio" per chat lunghe.
 *  - Mobile: 100dvh + safe-area-inset-bottom + overscroll-contain.
 *  - Keyboard: "/" focus input, "Esc" clear input (con guard).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  AlertCircle,
  KeyRound,
  Loader2,
  Send,
  Sparkles,
  Square,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SUGGESTED_QUESTIONS } from "@/features/agente-ferro/lib";

import { AgenteFerroBanner } from "./AgenteFerroBanner";
import {
  AGENTE_FERRO_STATE_LABELS,
  AgenteFerroAvatar,
  type AgenteFerroAvatarState,
} from "./AgenteFerroAvatar";

// ============================================================
// Types · normalizzazione minimi UIMessage parts (AI SDK v6)
// ============================================================

type TextPart = { type: "text"; text: string; state?: string };
type ToolPart = {
  type: `tool-${string}`;
  toolName?: string;
  state?: "input-streaming" | "input-available" | "output-available" | "output-error";
};
type AnyPart = TextPart | ToolPart | { type: string };

function isTextPart(p: AnyPart): p is TextPart {
  return p.type === "text";
}

function isToolPart(p: AnyPart): p is ToolPart {
  return typeof p.type === "string" && p.type.startsWith("tool-");
}

function getMessageText(message: { parts?: AnyPart[] }): string {
  return (message.parts ?? [])
    .filter(isTextPart)
    .map((p) => p.text)
    .join("");
}

/** Tool name human-readable per status sr-only durante chiamata. */
function describeToolCall(toolPart: ToolPart): string {
  const name = toolPart.toolName ?? toolPart.type.replace(/^tool-/, "");
  switch (name) {
    case "get_user_profile":
      return "Recupero il tuo profilo";
    case "get_orders":
      return "Verifico il tuo storico ordini";
    case "get_test_results":
      return "Cerco i tuoi referti";
    default:
      return "Sto consultando i tuoi dati";
  }
}

// ============================================================
// Component
// ============================================================

interface Props {
  className?: string;
}

export function AgenteFerroChat({ className }: Props) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/agente-ferro" }),
    []
  );

  const { messages, sendMessage, status, error, stop, regenerate } = useChat({
    transport,
  });

  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesListRef = useRef<HTMLOListElement>(null);

  const isStreaming = status === "submitted" || status === "streaming";
  const isReady = status === "ready" || status === undefined;
  const isError = status === "error";

  // ── Avatar state derivation ───────────────────────────────────
  const avatarState: AgenteFerroAvatarState = useMemo(() => {
    if (status === "submitted") return "thinking";
    if (status === "streaming") {
      // Se l'ultimo messaggio assistant ha tool part attiva → thinking
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") {
        const activeTool = (last.parts as AnyPart[])?.some(
          (p) => isToolPart(p) && (p.state === "input-streaming" || p.state === "input-available")
        );
        if (activeTool) return "thinking";
        return "speaking";
      }
      return "speaking";
    }
    return "idle";
  }, [status, messages]);

  // ── Auto-scroll smart: solo se l'utente è già vicino al fondo ─
  useEffect(() => {
    const list = messagesListRef.current;
    if (!list) return;
    const distanceFromBottom =
      list.scrollHeight - list.scrollTop - list.clientHeight;
    if (distanceFromBottom < 120) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  // ── Keyboard shortcuts globali (con guard) ────────────────────
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "TEXTAREA" || target?.tagName === "INPUT";

      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && target === inputRef.current) {
        setInput("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Submit ────────────────────────────────────────────────────
  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || !isReady) return;
      sendMessage({ role: "user", parts: [{ type: "text", text: trimmed }] });
      setInput("");
      // Mantieni focus sull'input (UX standard chat)
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [input, isReady, sendMessage]
  );

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSubmit(e as unknown as FormEvent);
      }
    },
    [onSubmit]
  );

  const onSuggestionClick = useCallback(
    (text: string) => {
      if (!isReady) return;
      sendMessage({ role: "user", parts: [{ type: "text", text }] });
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [isReady, sendMessage]
  );

  // ── Live region content (solo al complete o stato attivo) ────
  const liveAvatarLabel = AGENTE_FERRO_STATE_LABELS[avatarState];
  const lastAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i];
    }
    return null;
  }, [messages]);
  const lastAssistantText = lastAssistantMessage
    ? getMessageText(lastAssistantMessage)
    : "";
  const announcedText = !isStreaming ? lastAssistantText : "";

  const isEmpty = messages.length === 0;

  return (
    <section
      aria-labelledby="agente-ferro-title"
      className={cn(
        "flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col bg-background",
        className
      )}
    >
      {/* Skip link */}
      <a
        href="#agente-ferro-input"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md focus:ring-2 focus:ring-ring"
      >
        Vai al campo messaggio
      </a>

      {/* Header con avatar + titolo + badge AI */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-background px-4 py-3">
        <AgenteFerroAvatar state={avatarState} size="md" />
        <div className="min-w-0 flex-1">
          <h2
            id="agente-ferro-title"
            className="flex items-center gap-2 text-base font-semibold leading-tight"
          >
            Agente di Ferro
            <Badge
              variant="outline"
              className="border-foreground/30 px-2 py-0 text-[10px] font-bold uppercase tracking-wider"
              aria-label="Assistente intelligenza artificiale"
            >
              AI
            </Badge>
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            Compagno motivazionale per il tuo percorso di salute
          </p>
        </div>

        {/* Live region per stato avatar (sr-only) */}
        <span role="status" aria-live="polite" className="sr-only">
          {liveAvatarLabel}
        </span>
      </header>

      {/* Banner UE AI Act */}
      <AgenteFerroBanner />

      {/* Message list */}
      <ol
        ref={messagesListRef}
        aria-label={`Conversazione con l'agente, ${messages.length} ${messages.length === 1 ? "messaggio" : "messaggi"}`}
        aria-busy={isStreaming}
        className="flex min-h-0 flex-1 list-none flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {isEmpty && <EmptyState onSuggestionClick={onSuggestionClick} />}

        {messages.map((m) => (
          <li
            key={m.id}
            className={cn(
              "flex max-w-full",
              m.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <MessageBubble message={m} />
          </li>
        ))}

        {/* Tool invocation indicator (solo durante streaming con tool part attiva) */}
        {isStreaming && lastAssistantMessage && (
          <ActiveToolIndicator message={lastAssistantMessage} />
        )}

        {/* Skeleton "sta scrivendo..." prima del primo token */}
        {status === "submitted" && (
          <li className="flex justify-start" aria-hidden="true">
            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Agente sta scrivendo…
              </span>
            </div>
          </li>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </ol>

      {/* Live region che annuncia messaggio AI completo (no token spam) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcedText}
      </div>

      {/* Error state recuperabile */}
      {isError && (
        <div
          role="alert"
          className="mx-4 mb-2 flex shrink-0 items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <div className="flex-1">
            <p className="font-medium">Qualcosa è andato storto.</p>
            <p className="text-muted-foreground">
              {error?.message || "Riprova fra qualche secondo."}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => regenerate()}>
            Riprova
          </Button>
        </div>
      )}

      {/* Input area */}
      <form
        onSubmit={onSubmit}
        className="shrink-0 border-t border-border bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
      >
        <label htmlFor="agente-ferro-input" className="sr-only">
          Scrivi un messaggio all&apos;Agente di Ferro
        </label>
        <div className="flex items-end gap-2">
          <Textarea
            id="agente-ferro-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Chiedimi qualcosa…"
            rows={2}
            aria-describedby="agente-ferro-input-hint agente-ferro-send-status"
            aria-keyshortcuts="Slash Escape"
            className="min-h-[44px] flex-1 resize-none"
            disabled={isError}
          />
          {isStreaming ? (
            <Button
              type="button"
              onClick={stop}
              variant="outline"
              size="icon"
              aria-label="Interrompi la risposta in corso"
              className="h-11 w-11 shrink-0"
            >
              <Square className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!input.trim() || !isReady}
              size="icon"
              aria-label="Invia messaggio"
              className="h-11 w-11 shrink-0"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
        <p
          id="agente-ferro-input-hint"
          className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">
              Invio
            </kbd>{" "}
            invia
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">
              Shift+Invio
            </kbd>{" "}
            a capo
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">
              <KeyRound className="inline h-2.5 w-2.5" aria-hidden="true" /> /
            </kbd>{" "}
            focus
          </span>
        </p>
        {isStreaming && (
          <span
            id="agente-ferro-send-status"
            role="status"
            className="sr-only"
          >
            L&apos;agente sta rispondendo, attendi prima di inviare un nuovo messaggio.
          </span>
        )}
      </form>
    </section>
  );
}

// ============================================================
// Sub-components
// ============================================================

function EmptyState({
  onSuggestionClick,
}: {
  onSuggestionClick: (text: string) => void;
}) {
  return (
    <li
      className="flex flex-col items-center justify-center gap-6 px-2 py-8 text-center"
      aria-label="Inizio conversazione"
    >
      <AgenteFerroAvatar state="idle" size="xl" />
      <div className="max-w-md space-y-2">
        <h3 className="text-lg font-semibold">Ciao, sono l&apos;Agente di Ferro.</h3>
        <p className="text-sm text-muted-foreground">
          Sono qui per spingerti a prendere il controllo della tua salute. Domande
          su pannelli, prelievi, percorso? Dimmi.
        </p>
      </div>
      <div role="group" aria-labelledby="agente-ferro-suggestions-title" className="w-full">
        <h3
          id="agente-ferro-suggestions-title"
          className="mb-3 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Domande suggerite
        </h3>
        <ul className="flex flex-wrap justify-center gap-2 p-0">
          {SUGGESTED_QUESTIONS.map((q) => (
            <li key={q}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => onSuggestionClick(q)}
              >
                {q}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

function MessageBubble({
  message,
}: {
  message: { id: string; role: string; parts?: AnyPart[] };
}) {
  const isUser = message.role === "user";
  const text = getMessageText(message);
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
        isUser
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-foreground"
      )}
    >
      {/* Tool calls inline (solo per assistant) — minimi, info */}
      {!isUser &&
        message.parts
          ?.filter(isToolPart)
          .filter((p) => p.state === "output-available")
          .map((p, idx) => (
            <p
              key={`${message.id}-tool-${idx}`}
              className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground"
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {describeToolCall(p)}
            </p>
          ))}
      {text && <p className="whitespace-pre-wrap">{text}</p>}
    </div>
  );
}

function ActiveToolIndicator({
  message,
}: {
  message: { id: string; role: string; parts?: AnyPart[] };
}) {
  const activeTool = (message.parts ?? [])
    .filter(isToolPart)
    .find(
      (p) =>
        p.state === "input-streaming" ||
        p.state === "input-available"
    );
  if (!activeTool) return null;
  const description = describeToolCall(activeTool);
  return (
    <li className="flex justify-start">
      <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Loader2
          className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span aria-hidden="true">{description}…</span>
        <span role="status" aria-live="polite" className="sr-only">
          {description}
        </span>
      </div>
    </li>
  );
}
