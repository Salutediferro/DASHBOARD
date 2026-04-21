"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  PanelLeft,
  PanelLeftClose,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@prisma/client";

import { cn } from "@/lib/utils";
import type { NavBadgeSource, NavItem } from "@/lib/nav-items";
import { UserMenu } from "@/components/auth/user-menu";
import { useUser } from "@/lib/hooks/use-user";
import Logo from "@/components/brand/logo";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  items: NavItem[];
};

const STORAGE_KEY = "sdf-sidebar-collapsed";
const EXPANDED_WIDTH = "w-[260px]";
const COLLAPSED_WIDTH = "w-[68px]";

export function Sidebar({ items }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Hydrate from localStorage after mount to avoid SSR/client drift.
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "1") setCollapsed(true);
    } catch {
      // ignore (SSR, privacy mode, …)
    }
    setMounted(true);
  }, []);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Group items preserving insertion order. Items without a group go
  // into an implicit leading section with no heading.
  const sections = React.useMemo(() => groupItems(items), [items]);

  return (
    <TooltipProvider delay={150}>
      <aside
        className={cn(
          "bg-card/30 border-border hidden shrink-0 flex-col border-r transition-[width] duration-200 md:flex",
          collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        )}
        data-collapsed={collapsed}
        aria-label="Navigazione principale"
      >
        <SidebarHeader collapsed={collapsed} />
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-3 py-4">
          {sections.map((section, i) => (
            <SidebarSection
              key={`${section.title ?? "__default"}-${i}`}
              section={section}
              pathname={pathname ?? ""}
              collapsed={collapsed}
            />
          ))}
        </nav>
        <SidebarFooter
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          mounted={mounted}
        />
      </aside>
    </TooltipProvider>
  );
}

// ---------- Header (logo + role badge) ---------- //

function SidebarHeader({ collapsed }: { collapsed: boolean }) {
  const { role } = useUser();
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border px-3 py-4",
        collapsed && "items-center px-2",
      )}
    >
      <Link
        href="/dashboard"
        className="focus-ring inline-flex items-center gap-2 rounded-md"
        aria-label="Salute di Ferro — vai alla dashboard"
      >
        {collapsed ? (
          <Logo variant="mark" size="md" src="/logo-sdf.svg" />
        ) : (
          <span className="flex items-center gap-2">
            <Logo variant="mark" size="md" src="/logo-sdf.svg" />
            <span className="text-sm font-semibold tracking-tight">
              Salute di Ferro
            </span>
          </span>
        )}
      </Link>
      {!collapsed && role && <RoleBadge role={role} />}
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const theme = roleTheme[role];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        theme.bg,
        theme.fg,
        theme.border,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", theme.dot)} />
      {theme.label}
    </span>
  );
}

const roleTheme: Record<
  UserRole,
  { label: string; bg: string; fg: string; border: string; dot: string }
> = {
  PATIENT: {
    label: "Paziente",
    bg: "bg-info/10",
    fg: "text-info",
    border: "border-info/30",
    dot: "bg-info",
  },
  COACH: {
    label: "Coach",
    bg: "bg-accent-500/10",
    fg: "text-accent-500",
    border: "border-accent-500/30",
    dot: "bg-accent-500",
  },
  DOCTOR: {
    label: "Medico",
    bg: "bg-warning/10",
    fg: "text-warning",
    border: "border-warning/30",
    dot: "bg-warning",
  },
  ADMIN: {
    label: "Admin",
    bg: "bg-primary-500/10",
    fg: "text-primary-500",
    border: "border-primary-500/30",
    dot: "bg-primary-500",
  },
};

// ---------- Sections + items ---------- //

type Section = { title: string | null; items: NavItem[] };

function groupItems(items: NavItem[]): Section[] {
  const sections: Section[] = [];
  for (const item of items) {
    const title = item.group ?? null;
    const last = sections[sections.length - 1];
    if (last && last.title === title) {
      last.items.push(item);
    } else {
      sections.push({ title, items: [item] });
    }
  }
  return sections;
}

function SidebarSection({
  section,
  pathname,
  collapsed,
}: {
  section: Section;
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      {section.title && !collapsed && (
        <div className="mb-1 flex items-center gap-2 px-3 pt-2">
          <span className="h-px flex-1 bg-border/60" aria-hidden />
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {section.title}
          </span>
          <span className="h-px flex-1 bg-border/60" aria-hidden />
        </div>
      )}
      {section.items.map((item) => (
        <SidebarItem
          key={item.href}
          item={item}
          pathname={pathname}
          collapsed={collapsed}
        />
      ))}
    </div>
  );
}

function SidebarItem({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const active = isActive(item.href, pathname);
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group focus-ring relative flex h-10 items-center gap-3 rounded-md pr-2 text-sm font-medium transition-colors duration-150",
        collapsed ? "justify-center pl-2" : "pl-3",
        active
          ? "surface-2 text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-r-full bg-primary-500"
        />
      )}
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          active ? "text-primary-500" : "",
        )}
      />
      {!collapsed && (
        <span className="truncate flex-1">{item.label}</span>
      )}
      {!collapsed && item.badge !== undefined && (
        <BadgeCounter source={item.badge} />
      )}
      {collapsed && item.badge !== undefined && (
        <BadgeCounter source={item.badge} dot />
      )}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right" sideOffset={8}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

function isActive(href: string, pathname: string): boolean {
  if (pathname === href) return true;
  // Role-root dashboards shouldn't match every sub-page.
  const isRoleRoot =
    href === "/dashboard/coach" ||
    href === "/dashboard/doctor" ||
    href === "/dashboard/patient" ||
    href === "/dashboard/admin";
  if (isRoleRoot) return false;
  return pathname.startsWith(href + "/") || pathname === href;
}

// ---------- Badge counters ---------- //

const URGENT_BADGE_KEYS = new Set(["unread-messages", "unread-notifications"]);

function BadgeCounter({
  source,
  dot = false,
}: {
  source: NavBadgeSource;
  dot?: boolean;
}) {
  const key = typeof source === "string" ? source : "__fn";
  const urgent = typeof source === "string" && URGENT_BADGE_KEYS.has(source);

  const { data = 0 } = useQuery<number>({
    queryKey: ["nav-badge", key],
    queryFn: () => resolveBadge(source),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  if (data <= 0) return null;

  if (dot) {
    return (
      <span
        aria-label={`${data} non letti`}
        className={cn(
          "absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-card",
          urgent ? "bg-destructive" : "bg-muted-foreground",
        )}
      />
    );
  }

  const display = data > 99 ? "99+" : String(data);
  return (
    <span
      className={cn(
        "ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
        urgent
          ? "bg-destructive text-destructive-foreground"
          : "bg-muted text-muted-foreground",
      )}
    >
      {display}
    </span>
  );
}

async function resolveBadge(source: NavBadgeSource): Promise<number> {
  if (typeof source === "function") {
    try {
      return await source();
    } catch {
      return 0;
    }
  }
  if (source === "unread-messages") {
    try {
      const r = await fetch("/api/conversations", { cache: "no-store" });
      if (!r.ok) return 0;
      const list: Array<{ unreadCount?: number }> = await r.json();
      return list.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0);
    } catch {
      return 0;
    }
  }
  if (source === "unread-notifications") {
    try {
      const r = await fetch("/api/notifications?unreadOnly=1", {
        cache: "no-store",
      });
      if (!r.ok) return 0;
      const body = (await r.json()) as { count?: number };
      return body.count ?? 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

// ---------- Footer (user card + collapse) ---------- //

function SidebarFooter({
  collapsed,
  onToggle,
  mounted,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mounted: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-border p-3">
      <UserCardTrigger collapsed={collapsed} />
      <CollapseButton
        collapsed={collapsed}
        onToggle={onToggle}
        disabled={!mounted}
      />
    </div>
  );
}

function UserCardTrigger({ collapsed }: { collapsed: boolean }) {
  const { profile, user, isLoading } = useUser();
  if (isLoading || !user) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-md p-2",
          collapsed && "justify-center",
        )}
      >
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        {!collapsed && (
          <div className="flex-1 space-y-1">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-2 w-28 animate-pulse rounded bg-muted/60" />
          </div>
        )}
      </div>
    );
  }

  const name = profile?.fullName ?? user.email ?? "Utente";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const card = (
    <span
      className={cn(
        "flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted",
        collapsed && "justify-center p-1",
      )}
    >
      <Avatar className="h-8 w-8">
        {profile?.avatarUrl && <AvatarImage src={profile.avatarUrl} />}
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>
      {!collapsed && (
        <span className="flex min-w-0 flex-1 flex-col text-left">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="truncate text-[11px] text-muted-foreground">
            {user.email}
          </span>
        </span>
      )}
    </span>
  );

  return (
    <UserMenu
      trigger={card}
      contentSide={collapsed ? "right" : "top"}
      contentAlign={collapsed ? "end" : "start"}
      contentSideOffset={collapsed ? 10 : 8}
    />
  );
}

function CollapseButton({
  collapsed,
  onToggle,
  disabled,
}: {
  collapsed: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const label = collapsed ? "Espandi sidebar" : "Collassa sidebar";
  const Icon: LucideIcon = collapsed ? PanelLeft : PanelLeftClose;
  const btn = (
    <button
      type="button"
      aria-label={label}
      aria-pressed={collapsed}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "focus-ring inline-flex h-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50",
        collapsed ? "w-full" : "w-full gap-2 px-2 text-xs",
      )}
    >
      <Icon className="h-4 w-4" />
      {!collapsed && <span>Collassa</span>}
    </button>
  );
  if (!collapsed) return btn;
  return (
    <Tooltip>
      <TooltipTrigger render={btn} />
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
