"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav-items";
import { UserMenu } from "@/components/auth/user-menu";

type Props = {
  items: NavItem[];
};

export function Sidebar({ items }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside
      className={cn(
        "bg-card/40 border-border hidden shrink-0 flex-col border-r transition-[width] duration-200 md:flex",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b px-4">
        <div className="bg-card border-primary/40 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border">
          <span className="text-primary font-mono text-xs font-bold">SDF</span>
        </div>
        {!collapsed && (
          <span className="truncate text-sm font-semibold tracking-tight">
            Salute di Ferro
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard/coach" &&
              item.href !== "/dashboard/client" &&
              pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-border border-t p-3">
        <div className={cn("mb-2 flex", collapsed ? "justify-center" : "")}>
          <UserMenu />
        </div>
        <button
          type="button"
          aria-label={collapsed ? "Espandi sidebar" : "Chiudi sidebar"}
          onClick={() => setCollapsed((c) => !c)}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-11 w-full items-center justify-center rounded-md transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>
    </aside>
  );
}
