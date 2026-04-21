"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav-items";
import { NotificationBell } from "@/components/layout/notification-bell";
import { SearchCommand } from "@/components/layout/search-command";
import { UserMenu } from "@/components/auth/user-menu";
import { useUser } from "@/lib/hooks/use-user";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type QuickAction = { label: string; href: string };

type Props = {
  items: NavItem[];
  quickActions?: QuickAction[];
};

export function Topbar({ items, quickActions = [] }: Props) {
  return (
    <header
      className={cn(
        "surface-glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/50 px-4 md:gap-4 md:px-6",
      )}
    >
      <Breadcrumb items={items} />

      <div className="hidden flex-1 justify-center md:flex">
        <SearchCommand items={items} variant="full" />
      </div>

      <div className="ml-auto flex items-center gap-1 md:gap-2">
        <SearchCommand items={items} variant="icon" className="md:hidden" />
        <QuickActions actions={quickActions} />
        <NotificationBell />
        <TopbarUserMenu />
      </div>
    </header>
  );
}

// ---------- Breadcrumb ---------- //

function Breadcrumb({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? "";
  const segments = pathname.split("/").filter(Boolean);
  const seg1 = segments[1];

  const roleRoots: Record<string, { label: string; href: string }> = {
    admin: { label: "Admin", href: "/dashboard/admin" },
    doctor: { label: "Medico", href: "/dashboard/doctor" },
    coach: { label: "Coach", href: "/dashboard/coach" },
    patient: { label: "Cliente", href: "/dashboard/patient" },
  };
  const root = (seg1 ? roleRoots[seg1] : undefined) ?? {
    label: "Dashboard",
    href: "/dashboard",
  };

  const current = [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => pathname === i.href || pathname.startsWith(i.href + "/"));

  const crumbs: Array<{ label: string; href?: string }> = [root];
  if (current && current.href !== root.href) {
    if (current.group) crumbs.push({ label: current.group });
    crumbs.push({ label: current.label });
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center gap-1.5 text-sm"
    >
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1.5 min-w-0">
            {i > 0 && (
              <span aria-hidden className="select-none text-muted-foreground/60">
                /
              </span>
            )}
            {c.href && !last ? (
              <Link
                href={c.href}
                className="focus-ring truncate rounded text-muted-foreground transition-colors hover:text-foreground"
              >
                {c.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "truncate",
                  last ? "text-foreground font-medium" : "text-muted-foreground",
                )}
                aria-current={last ? "page" : undefined}
              >
                {c.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// ---------- Quick actions ---------- //

function QuickActions({ actions }: { actions: QuickAction[] }) {
  if (actions.length === 0) return null;

  // Up to 2 actions inline (desktop only); more → "Azioni" dropdown.
  if (actions.length <= 2) {
    return (
      <>
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="focus-ring hidden h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 lg:inline-flex"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {a.label}
          </Link>
        ))}
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus-ring hidden h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 md:inline-flex">
        <Plus className="h-4 w-4" aria-hidden />
        Azioni
        <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Azioni rapide</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((a) => (
          <DropdownMenuItem key={a.href} render={<Link href={a.href} />}>
            <Plus className="mr-2 h-4 w-4 text-primary-500" aria-hidden />
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------- User menu (avatar-only trigger) ---------- //

function TopbarUserMenu() {
  const { profile, user, isLoading } = useUser();

  if (isLoading || !user) {
    return (
      <div
        aria-hidden
        className="h-9 w-9 animate-pulse rounded-full bg-muted"
      />
    );
  }

  const name = profile?.fullName ?? user.email ?? "Utente";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const avatar = (
    <span
      aria-label={name}
      title={name}
      className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-105"
    >
      <Avatar className="h-9 w-9">
        {profile?.avatarUrl && <AvatarImage src={profile.avatarUrl} />}
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>
    </span>
  );

  return (
    <UserMenu
      trigger={avatar}
      contentSide="bottom"
      contentAlign="end"
      contentSideOffset={8}
    />
  );
}
