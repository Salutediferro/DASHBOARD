"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

export type NotificationRow = {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: "REMINDER" | "CHECK_IN" | "PAYMENT" | "SYSTEM" | "AI";
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
};

export function useNotifications() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<{
      notifications: NotificationRow[];
      unreadCount: number;
    }> => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return { notifications: [], unreadCount: 0 };
      return res.json();
    },
    refetchInterval: 60_000,
  });

  // Supabase Realtime: subscribe to the user's notifications.
  //
  // Channel name MUST be unique per hook instance. When two components
  // mount `useNotifications` at the same time (after PR #D2 that's
  // `<NotificationBell>` in Topbar + `<MobileNav>`), the Supabase client
  // de-duplicates channels by name and returns the same instance to the
  // second caller — whose `.on()` then throws:
  //
  //   cannot add `postgres_changes` callbacks for realtime:
  //   notifications-stream after `subscribe()`
  //
  // A per-instance suffix gives each subscriber its own channel.
  // Multiple Realtime subscriptions are fine — each is a cheap ws event
  // handler, React Query dedupes the data layer anyway via `queryKey`.
  const channelId = React.useId();
  React.useEffect(() => {
    const supabase = createSupabaseClient();
    const channel = supabase
      .channel(`notifications-stream-${channelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Notification" },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "Notification" },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, channelId]);

  return query;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
