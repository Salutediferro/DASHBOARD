"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav-items";

type Props = { items: NavItem[] };

export function MobileNav({ items }: Props) {
  const pathname = usePathname();
  const mobileItems = items.filter((i) => i.mobile).slice(0, 5);

  return (
    <nav className="bg-card/80 border-border fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t backdrop-blur md:hidden">
      {mobileItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
