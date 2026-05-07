"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Archive,
  ArrowLeft,
  ArrowDown,
  BellOff,
  Check,
  CheckCheck,
  Loader2,
  MoreVertical,
  Paperclip,
  Send,
  Smile,
  UserRound,
  Users,
} from "lucide-react";
import type { UserRole } from "@prisma/client";
import {
  format,
  isSameDay,
  isToday,
  isYesterday,
} from "date-fns";
import { it } from "date-fns/locale";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useMarkConversationRead,
  useSendMessage,
  useThread,
  type MessageRow,
} from "@/lib/hooks/use-conversations";
import { useUser } from "@/lib/hooks/use-user";

type Props = { conversationId: string };

export function ThreadView({ conversationId }: Props) {
  const { profile } = useUser();
  const { data, isLoading } = useThread(conversationId);
  const send = useSendMessage(conversationId);
  const markRead = useMarkConversationRead();

  const messages = data?.messages ?? [];
  const lastMessageId = messages[messages.length - 1]?.id;
  const me = profile?.id;

  // Mark read on mount + whenever the tail changes.
  React.useEffect(() => {
    if (conversationId) markRead.mutate(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, lastMessageId]);

  // ── Auto-scroll logic ─────────────────────────────────────
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [pinnedToBottom, setPinnedToBottom] = React.useState(true);
  const seenCountRef = React.useRef<number>(messages.length);
  const [unseenNew, setUnseenNew] = React.useState(0);

  // Track scroll position
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const gap = el.scrollHeight - (el.scrollTop + el.clientHeight);
      const atBottom = gap < 24;
      setPinnedToBottom(atBottom);
      if (atBottom) {
        seenCountRef.current = messages.length;
        setUnseenNew(0);
      }
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [messages.length]);

  // Auto-scroll to bottom when pinned; otherwise count new messages.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (pinnedToBottom) {
      el.scrollTop = el.scrollHeight;
      seenCountRef.current = messages.length;
      setUnseenNew(0);
    } else if (messages.length > seenCountRef.current) {
      setUnseenNew(messages.length - seenCountRef.current);
    }
  }, [messages.length, lastMessageId, pinnedToBottom]);

  const others = (data?.conversation.members ?? []).filter(
    (m) => m.userId !== me,
  );
  const isGroup = others.length > 1;
  // For groups "letto da tutti" requires every other member to have a
  // lastReadAt past the message timestamp. We hand the array down so
  // the bubble can decide; in 1:1 it collapses to the single peer.
  const othersLastReadAt = others
    .map((m) => m.lastReadAt)
    .filter((v): v is string => !!v);

  return (
    <TooltipProvider delay={200}>
      <div className="flex h-full flex-col overflow-hidden bg-background">
        <ThreadHeader
          others={others.map((m) => m.user)}
        />

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2
              className="h-6 w-6 animate-spin text-muted-foreground"
              aria-label="Caricamento conversazione"
            />
          </div>
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-5"
              aria-live="polite"
            >
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Nessun messaggio. Scrivi il primo.
                </div>
              ) : (
                <MessageList
                  messages={messages}
                  meId={me}
                  members={data?.conversation.members ?? []}
                  isGroup={isGroup}
                  othersLastReadAt={othersLastReadAt}
                  totalOthers={others.length}
                />
              )}
            </div>

            {unseenNew > 0 && (
              <button
                type="button"
                onClick={() => {
                  const el = scrollRef.current;
                  if (el) el.scrollTop = el.scrollHeight;
                }}
                className="focus-ring absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105"
                aria-label={`${unseenNew} nuovi messaggi, clicca per andare in fondo`}
              >
                <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                {unseenNew} nuovo{unseenNew > 1 ? "i" : ""} messaggio
                {unseenNew > 1 ? "" : ""}
              </button>
            )}
          </div>
        )}

        <Composer
          disabled={isLoading}
          sending={send.isPending}
          onSend={async (body) => {
            try {
              await send.mutateAsync(body);
              // Force pinned to bottom after sending your own message.
              setPinnedToBottom(true);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Errore invio");
              throw err;
            }
          }}
        />
      </div>
    </TooltipProvider>
  );
}

// ── Header ────────────────────────────────────────────────────────

type HeaderUser = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
};

function ThreadHeader({ others }: { others: HeaderUser[] }) {
  const isGroup = others.length > 1;
  const single = others[0];

  // Group heading: comma-separated first names, capped at 3 visible.
  const title = isGroup
    ? others
        .map((o) => o.fullName.split(" ")[0])
        .slice(0, 3)
        .join(", ") + (others.length > 3 ? `, +${others.length - 3}` : "")
    : (single?.fullName ?? "—");

  const subtitle = isGroup
    ? `Gruppo · ${others.length} membri`
    : `${roleLabel(single?.role)} · ` ;

  return (
    <header className="page-header-glass sticky top-0 z-10 flex items-center gap-3 border-b border-border/50 px-4 py-3">
      <Link
        href="/dashboard/messages"
        aria-label="Torna all'elenco"
        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      {isGroup ? (
        <HeaderGroupAvatar others={others} />
      ) : (
        <div className="relative">
          <Avatar className="h-10 w-10">
            {single?.avatarUrl && <AvatarImage src={single.avatarUrl} />}
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {initials(single?.fullName ?? "")}
            </AvatarFallback>
          </Avatar>
          {/* Presence dot (mock) */}
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 inline-flex h-3 w-3 items-center justify-center rounded-full border-2 border-background bg-success"
            title="Online"
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
          {isGroup && <Users className="h-3 w-3" aria-hidden />}
          {subtitle}
          {!isGroup && <span className="text-success">Online</span>}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Azioni conversazione"
          className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => toast.info("Funzione in arrivo")}>
            <Archive className="mr-2 h-4 w-4" aria-hidden />
            Archivia conversazione
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.info("Funzione in arrivo")}>
            <BellOff className="mr-2 h-4 w-4" aria-hidden />
            Silenzia notifiche
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => toast.info("Funzione in arrivo")}>
            <UserRound className="mr-2 h-4 w-4" aria-hidden />
            {isGroup ? "Visualizza membri" : "Visualizza profilo"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function HeaderGroupAvatar({ others }: { others: HeaderUser[] }) {
  const visible = others.slice(0, 2);
  const extra = others.length - visible.length;
  return (
    <div className="relative h-10 w-10 shrink-0">
      {visible.map((o, i) => (
        <Avatar
          key={o.id}
          className={cn(
            "border-background absolute h-7 w-7 border-2",
            i === 0 ? "left-0 top-0" : "right-0 bottom-0",
          )}
        >
          {o.avatarUrl && <AvatarImage src={o.avatarUrl} />}
          <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
            {initials(o.fullName)}
          </AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 && (
        <span className="bg-muted text-muted-foreground border-background absolute -bottom-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full border-2 px-1 text-[9px] font-semibold tabular-nums">
          +{extra}
        </span>
      )}
    </div>
  );
}

function roleLabel(role: string | undefined) {
  switch (role) {
    case "DOCTOR":
      return "Professionista";
    case "COACH":
      return "Coach";
    case "ADMIN":
      return "Admin";
    case "PATIENT":
      return "Cliente";
    default:
      return "";
  }
}

// ── Message list (grouping + dividers) ────────────────────────

type ThreadMember = {
  userId: string;
  lastReadAt: string | null;
  user: HeaderUser;
};

function MessageList({
  messages,
  meId,
  members,
  isGroup,
  othersLastReadAt,
  totalOthers,
}: {
  messages: MessageRow[];
  meId: string | undefined;
  members: ThreadMember[];
  isGroup: boolean;
  /** lastReadAt for every other member; missing entries treated as null. */
  othersLastReadAt: string[];
  totalOthers: number;
}) {
  // Sender lookup once per render — bubbles fish their author out by id.
  const byId = React.useMemo(() => {
    const m = new Map<string, HeaderUser>();
    for (const x of members) m.set(x.userId, x.user);
    return m;
  }, [members]);

  const nodes: React.ReactNode[] = [];
  const GROUP_MS = 5 * 60 * 1000;
  let lastDate: Date | null = null;

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const t = new Date(m.createdAt);
    const prev = i > 0 ? messages[i - 1] : null;
    const prevT = prev ? new Date(prev.createdAt) : null;

    // Day separator — modern chat convention: centered pill, no lines.
    if (!lastDate || !isSameDay(lastDate, t)) {
      nodes.push(
        <div
          key={`sep-${m.id}`}
          role="separator"
          aria-label={dayLabel(t)}
          className="my-4 flex items-center justify-center"
        >
          <span className="bg-muted/70 text-muted-foreground rounded-full px-3 py-1 text-xs font-medium">
            {dayLabel(t)}
          </span>
        </div>,
      );
      lastDate = t;
    }

    // Grouping within 5 min same sender
    const sameSenderClose =
      prev &&
      prev.senderId === m.senderId &&
      prevT &&
      t.getTime() - prevT.getTime() < GROUP_MS &&
      isSameDay(prevT, t);
    const isFirstOfGroup = !sameSenderClose;
    const mine = m.senderId === meId;
    const isLast = i === messages.length - 1;

    // For a 1:1 thread "letto" means the single peer's lastReadAt has
    // moved past the message timestamp. For a group, all other members
    // must have read it. Show the sender's first name in the receipt
    // when the message hasn't been read by everyone yet, so the patient
    // can see who's still pending.
    const readByAll =
      mine &&
      totalOthers > 0 &&
      othersLastReadAt.length === totalOthers &&
      othersLastReadAt.every((iso) => new Date(iso).getTime() >= t.getTime());

    const sender = byId.get(m.senderId);

    nodes.push(
      <MessageBubble
        key={m.id}
        message={m}
        mine={mine}
        senderName={sender?.fullName ?? ""}
        senderAvatar={sender?.avatarUrl ?? null}
        showSenderMeta={isFirstOfGroup && !mine}
        // In groups always print the sender name above their first
        // bubble in a streak, even when the avatar gutter would
        // otherwise be enough — many people can write in groups.
        forceSenderName={isGroup}
        isLast={isLast}
        readByOther={readByAll}
      />,
    );
  }

  return <div className="flex flex-col gap-0.5">{nodes}</div>;
}

function dayLabel(d: Date): string {
  if (isToday(d)) return "oggi";
  if (isYesterday(d)) return "ieri";
  return format(d, "EEEE d MMMM", { locale: it });
}

function MessageBubble({
  message,
  mine,
  senderName,
  senderAvatar,
  showSenderMeta,
  forceSenderName,
  isLast,
  readByOther,
}: {
  message: MessageRow;
  mine: boolean;
  senderName: string;
  senderAvatar: string | null;
  showSenderMeta: boolean;
  /** Always render the sender's name above their bubble (group chats). */
  forceSenderName: boolean;
  isLast: boolean;
  readByOther: boolean;
}) {
  const time = format(new Date(message.createdAt), "HH:mm");
  return (
    <div
      className={cn(
        "group/msg flex items-end gap-2",
        mine ? "justify-end" : "justify-start",
        showSenderMeta ? "mt-3" : "mt-0.5",
      )}
    >
      {!mine && (
        <div className="w-8 shrink-0">
          {showSenderMeta && (
            <Avatar className="h-8 w-8">
              {senderAvatar && <AvatarImage src={senderAvatar} />}
              <AvatarFallback className="bg-primary/20 text-primary text-[11px] font-semibold">
                {initials(senderName)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-1",
          mine ? "items-end" : "items-start",
        )}
      >
        {(showSenderMeta || forceSenderName) && !mine && (
          <span className="text-muted-foreground px-1 text-xs font-medium">
            {senderName}
          </span>
        )}
        <div
          className={cn(
            "px-3.5 py-2 text-sm leading-snug shadow-sm",
            mine
              ? "bg-primary text-primary-foreground rounded-[18px_18px_4px_18px]"
              : "bg-card text-foreground border border-border/60 rounded-[18px_18px_18px_4px]",
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
        </div>
        <span
          className={cn(
            "text-muted-foreground inline-flex items-center gap-1 px-1 text-[11px] tabular-nums",
            // Last mine bubble always shows time + receipt so the user
            // sees delivery status at a glance. Others fade in on hover.
            isLast && mine
              ? "opacity-70"
              : "opacity-0 transition-opacity duration-150 group-hover/msg:opacity-70",
          )}
        >
          {time}
          {mine && <ReadReceipt read={readByOther} />}
        </span>
      </div>
    </div>
  );
}

function ReadReceipt({ read }: { read: boolean }) {
  return read ? (
    <CheckCheck
      className="h-3 w-3 text-primary-500"
      aria-label="Letto"
    />
  ) : (
    <Check className="h-3 w-3" aria-label="Inviato" />
  );
}

// ── Composer ─────────────────────────────────────────────────

function Composer({
  onSend,
  sending,
  disabled,
}: {
  onSend: (body: string) => Promise<void>;
  sending: boolean;
  disabled?: boolean;
}) {
  const [draft, setDraft] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize to content, clamped to ~5 lines.
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const maxPx = 5 * 22 /* line-height */ + 16 /* padding */;
    el.style.height = `${Math.min(el.scrollHeight, maxPx)}px`;
  }, [draft]);

  async function submit() {
    const body = draft.trim();
    if (!body || sending) return;
    try {
      await onSend(body);
      setDraft("");
    } catch {
      // error already toasted upstream
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="border-t border-border/60 bg-card/30 px-3 py-2.5"
    >
      <div className="surface-1 flex items-end gap-1.5 rounded-2xl px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary/40">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={() => toast.info("Allegati in arrivo")}
                aria-label="Allega"
                className="focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                disabled={disabled}
              >
                <Paperclip className="h-4 w-4" />
              </button>
            }
          />
          <TooltipContent side="top">Allegati — prossimamente</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label="Emoji"
                disabled
                className="focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground/50 disabled:cursor-not-allowed"
              >
                <Smile className="h-4 w-4" />
              </button>
            }
          />
          <TooltipContent side="top">Emoji — prossimamente</TooltipContent>
        </Tooltip>

        <Textarea
          ref={textareaRef}
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Scrivi un messaggio… (Invio per inviare, Shift+Invio per andare a capo)"
          aria-label="Messaggio"
          disabled={disabled || sending}
          className="focus-ring min-h-[34px] flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm shadow-none focus-visible:ring-0"
        />

        <button
          type="submit"
          disabled={sending || draft.trim().length === 0}
          aria-label="Invia"
          className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-all hover:scale-105 hover:bg-primary/90 disabled:opacity-50 disabled:hover:scale-100"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </form>
  );
}

// ── utils ─────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
