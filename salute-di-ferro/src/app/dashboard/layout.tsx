"use client";

import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useUser } from "@/lib/hooks/use-user";
import { navForRole } from "@/lib/nav-items";

/**
 * Single shared shell for every /dashboard/* page.
 *
 * Before this layout existed, each role (admin, coach, doctor,
 * patient) mounted its own DashboardShell, and `/dashboard/messages`
 * mounted yet another one. Navigating between role pages and Messaggi
 * therefore remounted the whole chrome — sidebar, topbar, everything
 * — which showed up in the UI as a hard refresh flash. Hoisting the
 * shell up here makes those navigations soft: only the leaf page
 * swaps, the shell is untouched.
 *
 * Nav items depend on the caller's role, so we resolve it client-side
 * from `useUser()`. `/dashboard/settings/*` routes (e.g. the 2FA
 * security page) deliberately render WITHOUT the shell — they are
 * auth / device-verification flows that should look intentional and
 * focused, not nested inside the app chrome.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const { role, isLoading } = useUser();

  // Security / settings pages render bare — they are focused flows
  // (password change, 2FA) that shouldn't be framed in the chrome.
  if (pathname.startsWith("/dashboard/settings")) {
    return <>{children}</>;
  }

  if (isLoading || !role) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          aria-label="Caricamento"
        />
      </div>
    );
  }

  return <DashboardShell items={navForRole(role)}>{children}</DashboardShell>;
}
