"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/lib/hooks/use-notifications";

export function NotificationsBell() {
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const count = data?.unreadCount ?? 0;
  const items = data?.notifications ?? [];

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className="hover:bg-muted relative flex h-9 w-9 items-center justify-center rounded-md"
        aria-label="Notifiche"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="bg-primary text-primary-foreground absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <p className="text-sm font-semibold">Notifiche</p>
          {count > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => markAll.mutate()}
              className="h-7 gap-1 text-xs"
            >
              <CheckCheck className="h-3 w-3" />
              Segna tutte
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-xs">
              Nessuna notifica
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const Inner = (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-muted-foreground line-clamp-2 text-xs">
                        {n.body}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-[10px]">
                        {new Date(n.createdAt).toLocaleString("it-IT", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markRead.mutate(n.id);
                        }}
                        className="hover:bg-muted text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                        aria-label="Segna letta"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                );
                const className = cn(
                  "flex items-start gap-2 p-3",
                  !n.isRead && "bg-primary/5",
                );
                return (
                  <li key={n.id}>
                    {n.actionUrl ? (
                      <Link href={n.actionUrl} className={className}>
                        {Inner}
                      </Link>
                    ) : (
                      <div className={className}>{Inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
