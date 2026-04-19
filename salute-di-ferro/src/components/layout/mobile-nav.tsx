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

type QuickAction = { label: string; href: string };

type Props = {
  items: NavItem[];
  quickActions?: QuickAction[];
};

const SAFE_BOTTOM = "pb-[env(safe-area-inset-bottom)]";

export function MobileNav({ items, quickActions = [] }: Props) {
  const pathname = usePathname() ?? "";
  const mobileItems = items.filter((i) => i.mobile).slice(0, 5);

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
          return (
            <MobileTab key={item.href} item={item} active={active} />
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

function MobileTab({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium outline-none",
        "transition-transform duration-100 ease-out active:scale-95",
        active ? "text-primary-500" : "text-muted-foreground",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute top-0 left-1/2 h-1 w-10 -translate-x-1/2 rounded-b-full bg-primary-500/80"
        />
      )}
      <span
        className={cn(
          "relative flex h-7 w-12 items-center justify-center rounded-full transition-colors",
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
      </span>
      <span className="truncate px-1">{item.label}</span>
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
