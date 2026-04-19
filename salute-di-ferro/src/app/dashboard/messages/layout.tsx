"use client";

import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useUser } from "@/lib/hooks/use-user";
import { navForRole } from "@/lib/nav-items";
import { ConversationSidebar } from "@/components/messages/conversation-sidebar";
import { cn } from "@/lib/utils";

/**
 * Messages live outside the per-role /dashboard/<role>/* subtrees
 * because the feature is cross-role (patient ↔ professional). We
 * still need the role-aware shell, so the layout resolves the
 * caller's role at runtime and picks the matching nav.
 *
 * On lg+ the UI is a 2-column shell (sidebar + thread). On mobile
 * the two panes collapse into route-switched views:
 *   /dashboard/messages        → sidebar only
 *   /dashboard/messages/[id]   → thread only (back-arrow returns)
 */
export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, isLoading } = useUser();
  const pathname = usePathname() ?? "";
  const isThread = /^\/dashboard\/messages\/[^/]+/.test(pathname);

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

  return (
    <DashboardShell items={navForRole(role)}>
      <div className="-mx-4 -my-4 flex h-[calc(100vh-4rem)] min-h-0 md:-mx-8 md:-my-8">
        <aside
          className={cn(
            "w-full shrink-0 lg:w-[320px]",
            isThread ? "hidden lg:block" : "block",
          )}
        >
          <ConversationSidebar />
        </aside>
        <main
          className={cn(
            "min-w-0 flex-1",
            isThread ? "block" : "hidden lg:block",
          )}
        >
          {children}
        </main>
      </div>
    </DashboardShell>
  );
}
