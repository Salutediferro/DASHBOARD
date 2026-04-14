"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, ChevronRight } from "lucide-react";
import { NotificationBell } from "@/components/layout/notification-bell";
import { SearchCommand } from "@/components/layout/search-command";
import type { NavItem } from "@/lib/nav-items";

type QuickAction = { label: string; href: string };

type Props = {
  items: NavItem[];
  quickActions?: QuickAction[];
};

function useBreadcrumb(items: NavItem[]) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const match = [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => pathname === i.href || pathname.startsWith(i.href + "/"));

  return {
    root:
      segments[1] === "coach"
        ? { label: "Coach", href: "/dashboard/coach" }
        : segments[1] === "client"
          ? { label: "Cliente", href: "/dashboard/client" }
          : { label: "Dashboard", href: "/dashboard" },
    current: match?.label ?? "Dashboard",
  };
}

export function Topbar({ items, quickActions = [] }: Props) {
  const { root, current } = useBreadcrumb(items);

  return (
    <header className="bg-background/80 border-border sticky top-0 z-30 flex h-16 items-center gap-4 border-b px-4 backdrop-blur md:px-6">
      <nav className="text-muted-foreground flex items-center gap-1 text-sm">
        <Link href={root.href} className="hover:text-foreground">
          {root.label}
        </Link>
        {current !== root.label && (
          <>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{current}</span>
          </>
        )}
      </nav>

      <div className="hidden flex-1 justify-center md:flex">
        <SearchCommand items={items} />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {quickActions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="bg-primary text-primary-foreground hover:bg-primary/90 hidden h-10 items-center gap-1 rounded-md px-4 text-sm font-medium transition-colors lg:inline-flex"
          >
            <Plus className="h-4 w-4" />
            {a.label}
          </Link>
        ))}
        <NotificationBell />
      </div>
    </header>
  );
}
