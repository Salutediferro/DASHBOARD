"use client";

import * as React from "react";
import Link from "next/link";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bell,
  Calendar,
  CheckCheck,
  CircleAlert,
  ClipboardCheck,
  CreditCard,
  Loader2,
} from "lucide-react";
import type { NotificationType } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type NotificationRow = {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
};

type ListResponse = {
  notifications: NotificationRow[];
  unreadCount: number;
};

type TypeMeta = { label: string; icon: React.ReactNode };

const TYPE_META: Partial<Record<NotificationType, TypeMeta>> = {
  REMINDER: { label: "Promemoria", icon: <Calendar className="h-4 w-4" /> },
  CHECK_IN: {
    label: "Check-in",
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  PAYMENT: { label: "Pagamento", icon: <CreditCard className="h-4 w-4" /> },
  SYSTEM: { label: "Sistema", icon: <CircleAlert className="h-4 w-4" /> },
};

const DEFAULT_META: TypeMeta = {
  label: "Sistema",
  icon: <CircleAlert className="h-4 w-4" />,
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "ora";
  if (diffMin < 60) return `${diffMin} min fa`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h fa`;
  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PatientNotificationsPage() {
  const qc = useQueryClient();
  const [unreadOnly, setUnreadOnly] = React.useState(false);

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ["notifications", { unreadOnly }],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (unreadOnly) sp.set("unreadOnly", "1");
      const res = await fetch(`/api/notifications?${sp.toString()}`);
      if (!res.ok) throw new Error("Errore caricamento");
      return res.json();
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
    // Flip the read state locally so the dot/badge disappear the instant
    // the user clicks, without waiting for the server + refetch round-trip.
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const snapshots: Array<[readonly unknown[], ListResponse | undefined]> =
        [];
      qc.getQueriesData<ListResponse>({ queryKey: ["notifications"] }).forEach(
        ([key, data]) => {
          snapshots.push([key, data]);
          if (!data) return;
          qc.setQueryData<ListResponse>(key, {
            notifications: data.notifications.map((n) =>
              n.id === id ? { ...n, isRead: true } : n,
            ),
            unreadCount: Math.max(0, data.unreadCount - 1),
          });
        },
      );
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      // Keep the cache ultimately in sync with the server truth without
      // forcing an immediate refetch — React Query will revalidate next
      // time this query becomes stale.
      qc.invalidateQueries({ queryKey: ["notifications"], refetchType: "none" });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
    onSuccess: (body: { count: number }) => {
      toast.success(
        body.count > 0
          ? `${body.count} notifiche segnate come lette`
          : "Tutto a posto",
      );
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Notifiche
          </h1>
          <p className="text-muted-foreground text-sm">
            Promemoria, messaggi dei professionisti e aggiornamenti sistema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUnreadOnly((v) => !v)}
            className={cn(
              "border-border hover:bg-muted inline-flex h-9 items-center gap-1 rounded-md border px-3 text-xs font-medium",
              unreadOnly && "bg-primary/10 border-primary/40",
            )}
          >
            Solo non lette
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {unreadCount}
              </Badge>
            )}
          </button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending || unreadCount === 0}
          >
            {markAllRead.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCheck className="h-4 w-4" />
                Segna tutte lette
              </>
            )}
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Bell className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">
              {unreadOnly
                ? "Nessuna notifica non letta."
                : "Nessuna notifica per ora."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {items.length} notific{items.length === 1 ? "a" : "he"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {items.map((n) => {
                const meta = TYPE_META[n.type] ?? DEFAULT_META;
                const body = (
                  <>
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                        n.isRead
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/15 text-primary",
                      )}
                    >
                      {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={cn(
                            "truncate text-sm",
                            n.isRead ? "font-normal" : "font-semibold",
                          )}
                        >
                          {n.title}
                        </p>
                        <Badge variant="outline" className="text-[10px]">
                          {meta.label}
                        </Badge>
                        {!n.isRead && (
                          <span
                            aria-label="Non letta"
                            className="bg-primary h-2 w-2 rounded-full"
                          />
                        )}
                      </div>
                      <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                        {n.body}
                      </p>
                      <p className="text-muted-foreground mt-1 text-[11px]">
                        {formatWhen(n.createdAt)}
                      </p>
                    </div>
                  </>
                );

                const onOpen = () => {
                  if (!n.isRead) markRead.mutate(n.id);
                };

                return (
                  <li key={n.id}>
                    {n.actionUrl ? (
                      <Link
                        href={n.actionUrl}
                        onClick={onOpen}
                        className={cn(
                          "hover:bg-muted/40 flex items-start gap-3 px-4 py-3 transition-colors",
                          !n.isRead && "bg-primary/5",
                        )}
                      >
                        {body}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={onOpen}
                        className={cn(
                          "hover:bg-muted/40 flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                          !n.isRead && "bg-primary/5",
                        )}
                      >
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
