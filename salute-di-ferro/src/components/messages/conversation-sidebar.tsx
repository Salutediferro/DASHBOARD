"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Paperclip, Plus, Search, Stethoscope, UserRound } from "lucide-react";
import type { UserRole } from "@prisma/client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/hooks/use-user";
import {
  useConversations,
  type ConversationListItem,
} from "@/lib/hooks/use-conversations";
import { NewChatDialog } from "@/components/messages/new-chat-dialog";

type Filter = "all" | "unread" | "attachments";

export function ConversationSidebar() {
  const { profile } = useUser();
  const params = useParams<{ id?: string }>();
  const activeId = params?.id;
  const { data, isLoading } = useConversations();
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [newOpen, setNewOpen] = React.useState(false);

  const items = data?.items ?? [];

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      const other = c.others[0];
      if (!other) return false;
      if (filter === "unread" && c.unreadCount === 0) return false;
      // "attachments" filter: stub — the API doesn't flag attachments yet.
      // Keep the pill for discoverability but it resolves to the full set.
      if (filter === "attachments") return false;
      if (!q) return true;
      return (
        other.fullName.toLowerCase().includes(q) ||
        c.lastMessage?.body.toLowerCase().includes(q)
      );
    });
  }, [items, query, filter]);

  const totalUnread = items.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <aside
      aria-label="Elenco conversazioni"
      className="flex h-full flex-col border-r border-border/60 bg-card/20"
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border/60 bg-card/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-display text-base">Messaggi</h2>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            aria-label="Nuova chat"
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca conversazioni…"
            aria-label="Cerca conversazioni"
            className="focus-ring pl-9"
          />
        </div>
        <FilterPills
          value={filter}
          onChange={setFilter}
          unreadCount={totalUnread}
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ListSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyList hasItems={items.length > 0} />
        ) : (
          <ul className="flex flex-col">
            {filtered.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                meId={profile?.id}
                active={activeId === c.id}
              />
            ))}
          </ul>
        )}
      </div>

      <NewChatDialog open={newOpen} onOpenChange={setNewOpen} />
    </aside>
  );
}

// ── Filter pills ─────────────────────────────────────────────────────

function FilterPills({
  value,
  onChange,
  unreadCount,
}: {
  value: Filter;
  onChange: (f: Filter) => void;
  unreadCount: number;
}) {
  const options: Array<{ key: Filter; label: string; badge?: number; icon?: typeof Paperclip }> = [
    { key: "all", label: "Tutti" },
    { key: "unread", label: "Non letti", badge: unreadCount || undefined },
    { key: "attachments", label: "Allegati", icon: Paperclip },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Filtra conversazioni"
      className="flex flex-wrap gap-1"
    >
      {options.map((o) => {
        const active = value === o.key;
        const Icon = o.icon;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.key)}
            className={cn(
              "focus-ring inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary-500/40 bg-primary-500/15 text-primary-500"
                : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
            {o.label}
            {o.badge != null && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] tabular-nums text-primary-foreground">
                {o.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Row ────────────────────────────────────────────────────────────────

function ConversationRow({
  conversation,
  meId,
  active,
}: {
  conversation: ConversationListItem;
  meId: string | undefined;
  active: boolean;
}) {
  const other = conversation.others[0];
  if (!other) return null;
  const unread = conversation.unreadCount > 0;
  const lastIsMine = conversation.lastMessage?.senderId === meId;

  return (
    <li className="relative">
      <Link
        href={`/dashboard/messages/${conversation.id}`}
        aria-current={active ? "page" : undefined}
        className={cn(
          "focus-ring flex items-center gap-3 px-3 py-3 transition-colors",
          active
            ? "surface-2 border-l-2 border-primary-500 pl-[10px]"
            : "border-l-2 border-transparent hover:bg-muted/40",
        )}
      >
        <Avatar className="h-10 w-10 shrink-0">
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
            <RoleChip role={other.role} />
          </div>
          <p
            className={cn(
              "mt-0.5 truncate text-xs",
              unread ? "text-foreground/80" : "text-muted-foreground",
            )}
          >
            {conversation.lastMessage
              ? `${lastIsMine ? "Tu: " : ""}${conversation.lastMessage.body}`
              : "Nessun messaggio"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground">
            {formatRelative(
              conversation.lastMessage?.createdAt ?? conversation.updatedAt,
            )}
          </span>
          {unread && (
            <span
              aria-label={`${conversation.unreadCount} non letti`}
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-semibold tabular-nums text-primary-foreground"
            >
              {conversation.unreadCount > 99
                ? "99+"
                : conversation.unreadCount}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

function RoleChip({ role }: { role: UserRole }) {
  if (role === "DOCTOR") {
    return (
      <span className="chip chip-silver shrink-0">
        <Stethoscope className="h-3 w-3" aria-hidden />
        Medico
      </span>
    );
  }
  if (role === "COACH") {
    return (
      <span className="chip chip-silver shrink-0">
        <UserRound className="h-3 w-3" aria-hidden />
        Coach
      </span>
    );
  }
  if (role === "ADMIN") {
    return <span className="chip chip-red shrink-0">Admin</span>;
  }
  return null;
}

// ── Helpers ─────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "ora";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} min fa`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} or${Math.floor(diffMs / hour) === 1 ? "a" : "e"} fa`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}g fa`;
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

// ── States ─────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <ul
      className="flex flex-col"
      role="status"
      aria-busy="true"
      aria-label="Caricamento conversazioni"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-3 py-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted/60 skeleton-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="relative h-3 w-1/2 overflow-hidden rounded bg-muted/60 skeleton-shimmer" />
            <div className="relative h-2 w-4/5 overflow-hidden rounded bg-muted/60 skeleton-shimmer" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyList({ hasItems }: { hasItems: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <p className="text-sm font-medium">
        {hasItems ? "Nessun risultato" : "Nessuna conversazione"}
      </p>
      <p className="max-w-xs text-xs text-muted-foreground">
        {hasItems
          ? "Prova a rimuovere i filtri o la ricerca."
          : "Avvia la prima chat col tuo team usando il pulsante +."}
      </p>
    </div>
  );
}
