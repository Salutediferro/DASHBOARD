"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav-items";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useConversations } from "@/lib/hooks/use-conversations";

type QuickAction = { label: string; href: string };

type Props = {
  items: NavItem[];
  quickActions?: QuickAction[];
};

const SAFE_BOTTOM = "pb-[env(safe-area-inset-bottom)]";

export function MobileNav({ items, quickActions = [] }: Props) {
  const pathname = usePathname() ?? "";
  const mobileItems = items.filter((i) => i.mobile).slice(0, 5);

  // Live unread counts — already fetched elsewhere (NotificationBell,
  // conversation sidebar), so these useQuery calls deduplicate through
  // the shared QueryClient. No extra network cost.
  const { data: notifData } = useNotifications();
  const { data: convData } = useConversations();
  const badges = computeBadges(convData, notifData);

  return (
    <>
      <QuickActionsFAB actions={quickActions} />
      <nav
        aria-label="Navigazione principale (mobile)"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-border/60 bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/60 md:hidden",
          SAFE_BOTTOM,
        )}
      >
        {mobileItems.map((item) => {
          const active = isActive(item.href, pathname);
          const badge = resolveBadge(item.href, badges);
          return (
            <MobileTab
              key={item.href}
              item={item}
              active={active}
              badge={badge}
            />
          );
        })}
      </nav>
    </>
  );
}

function isActive(href: string, pathname: string): boolean {
  if (pathname === href) return true;
  const isRoleRoot =
    href === "/dashboard/coach" ||
    href === "/dashboard/doctor" ||
    href === "/dashboard/patient" ||
    href === "/dashboard/admin";
  if (isRoleRoot) return false;
  return pathname.startsWith(href + "/");
}

/**
 * Map nav item `href` → unread count. Matching is href-substring based
 * so it survives role prefixes (`/dashboard/patient/messages` ==
 * `/dashboard/coach/messages` as far as "messages" goes). Conservative:
 * when hooks haven't resolved yet the map is empty and no badges render.
 */
function computeBadges(
  convData: ReturnType<typeof useConversations>["data"],
  notifData: ReturnType<typeof useNotifications>["data"],
): Record<string, number> {
  const out: Record<string, number> = {};
  if (convData?.items) {
    const unread = convData.items.reduce(
      (sum, c) => sum + (c.unreadCount ?? 0),
      0,
    );
    if (unread > 0) {
      // Mark any nav item whose href ends in /messages.
      out["__messages__"] = unread;
    }
  }
  if (notifData?.unreadCount && notifData.unreadCount > 0) {
    out["__notifications__"] = notifData.unreadCount;
  }
  return out;
}

function resolveBadge(href: string, badges: Record<string, number>): number {
  if (href.endsWith("/messages") || href === "/dashboard/messages") {
    return badges["__messages__"] ?? 0;
  }
  if (href.endsWith("/notifications") || href === "/dashboard/notifications") {
    return badges["__notifications__"] ?? 0;
  }
  return 0;
}

function MobileTab({
  item,
  active,
  badge,
}: {
  item: NavItem;
  active: boolean;
  badge: number;
}) {
  const Icon = item.icon;
  const showCount = badge > 0;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={
        showCount ? `${item.label} — ${badge} non letti` : item.label
      }
      className={cn(
        "focus-ring relative flex min-h-[48px] flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium outline-none",
        "transition-transform duration-100 ease-out active:scale-95",
        active ? "text-primary-500" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "relative flex h-8 min-w-[44px] items-center justify-center rounded-full transition-colors",
          // Filled pill behind the icon on active — the previous
          // top-underline was barely visible on 360px screens.
          active && "bg-primary-500/20",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5 transition-colors",
            active && "text-primary-500",
          )}
          aria-hidden
        />
        {showCount && (
          <span
            aria-hidden
            className={cn(
              "bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none",
              "ring-2 ring-card",
            )}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span
        className={cn(
          "truncate px-0.5 leading-tight",
          active && "font-semibold",
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}

// ---------- Floating action button + bottom-sheet ---------- //

function QuickActionsFAB({ actions }: { actions: QuickAction[] }) {
  const [open, setOpen] = React.useState(false);
  if (actions.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Azioni rapide"
        className={cn(
          "focus-ring fixed right-4 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-lg",
          "transition-transform duration-150 active:scale-95 hover:scale-[1.03]",
          "md:hidden",
        )}
        style={{
          backgroundImage: "var(--gradient-brand-red)",
          bottom: "calc(4rem + 1rem + env(safe-area-inset-bottom))",
        }}
      >
        <Plus className="h-6 w-6" aria-hidden />
      </button>
      <SheetContent
        side="bottom"
        className={cn(
          "rounded-t-2xl border-t border-border/60",
          "bg-popover",
          SAFE_BOTTOM,
        )}
      >
        <SheetHeader>
          <SheetTitle>Azioni rapide</SheetTitle>
          <SheetDescription>
            Scegli un&apos;azione per continuare.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 px-4 pb-4">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              onClick={() => setOpen(false)}
              className={cn(
                "focus-ring flex min-h-[48px] items-center gap-3 rounded-xl border border-border/60 bg-card px-4 text-sm font-medium transition-colors hover:bg-muted",
              )}
            >
              <span
                aria-hidden
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/15 text-primary-500"
              >
                <Plus className="h-4 w-4" />
              </span>
              <span className="flex-1 truncate">{a.label}</span>
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
