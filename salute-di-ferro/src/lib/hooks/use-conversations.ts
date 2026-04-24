"use client";

import * as React from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { UserRole } from "@prisma/client";

import { createClient as createSupabaseClient } from "@/lib/supabase/client";

export type ConversationListItem = {
  id: string;
  updatedAt: string;
  lastMessage: {
    id: string;
    body: string;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  others: Array<{
    id: string;
    fullName: string;
    avatarUrl: string | null;
    role: UserRole;
  }>;
};

export type MessageRow = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type ThreadResponse = {
  conversation: {
    id: string;
    members: Array<{
      userId: string;
      lastReadAt: string | null;
      user: {
        id: string;
        fullName: string;
        avatarUrl: string | null;
        role: UserRole;
      };
    }>;
  };
  messages: MessageRow[];
};

/**
 * Conversation inbox — subscribed to Supabase Realtime on both Message
 * and ConversationMember so the unread count stays live. The list is
 * small (tens of rows at worst), so invalidate-and-refetch is fine.
 */
export function useConversations() {
  const qc = useQueryClient();
  const query = useQuery<{ items: ConversationListItem[] }>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("/api/conversations");
      if (!res.ok) return { items: [] };
      return res.json();
    },
    refetchInterval: 60_000,
  });

  // Per-instance channel name — same reasoning as in `useNotifications`.
  // Without this, two components mounting `useConversations` (after
  // PR #D2: ConversationSidebar + MobileNav) race on the same shared
  // channel and the second `.on()` call throws.
  const channelId = React.useId();
  React.useEffect(() => {
    const supabase = createSupabaseClient();
    const channel = supabase
      .channel(`conversations-stream-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Message" },
        () => qc.invalidateQueries({ queryKey: ["conversations"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ConversationMember" },
        () => qc.invalidateQueries({ queryKey: ["conversations"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, channelId]);

  return query;
}

/**
 * Thread view — listens for INSERTs on Message and refetches on match.
 * The filter is server-scoped (the GET enforces membership), so the
 * client can't tail a conversation it shouldn't see.
 */
export function useThread(conversationId: string | null) {
  const qc = useQueryClient();
  const query = useQuery<ThreadResponse>({
    queryKey: ["conversation", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (!res.ok) throw new Error("Errore caricamento");
      return res.json();
    },
  });

  React.useEffect(() => {
    if (!conversationId) return;
    const supabase = createSupabaseClient();
    const channel = supabase
      .channel(`thread-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          filter: `conversationId=eq.${conversationId}`,
        },
        () =>
          qc.invalidateQueries({ queryKey: ["conversation", conversationId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);

  return query;
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(
          typeof b.error === "string" ? b.error : "Invio fallito",
        );
      }
      return (await res.json()) as MessageRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversation", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await fetch(`/api/conversations/${conversationId}/read`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (participantId: string) => {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(
          typeof b.error === "string" ? b.error : "Impossibile avviare chat",
        );
      }
      return (await res.json()) as { id: string; created: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
