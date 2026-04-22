"use client";

import { usePathname } from "next/navigation";

import { ConversationSidebar } from "@/components/messages/conversation-sidebar";
import { cn } from "@/lib/utils";

/**
 * Messages live outside the per-role /dashboard/<role>/* subtrees
 * because the feature is cross-role (patient ↔ professional). The
 * role-aware shell (sidebar + topbar) is now provided by the parent
 * `/dashboard/layout.tsx`, so this layout only builds the inner
 * sidebar + thread two-column UI.
 *
 * On lg+ the UI is a 2-column shell (sidebar + thread). On mobile
 * the two panes collapse into route-switched views:
 *   /dashboard/messages        → sidebar only
 *   /dashboard/messages/[id]   → thread only (back-arrow returns)
 *
 * IMPORTANT: keeping the DashboardShell at `/dashboard/layout.tsx`
 * means navigating Messaggi ↔ any other /dashboard/* page doesn't
 * remount the shell — previously both sides had their own shell, so
 * switching felt like a hard refresh. Sharing the parent layout
 * makes it a soft swap.
 */
export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const isThread = /^\/dashboard\/messages\/[^/]+/.test(pathname);

  return (
    <div className="-mx-4 -my-4 flex h-[calc(100vh-4rem)] min-h-0 overflow-hidden md:-mx-8 md:-my-8">
      <aside
        className={cn(
          "w-full shrink-0 overflow-hidden lg:w-[320px]",
          isThread ? "hidden lg:block" : "block",
        )}
      >
        <ConversationSidebar />
      </aside>
      <main
        className={cn(
          "min-w-0 flex-1 overflow-hidden",
          isThread ? "block" : "hidden lg:block",
        )}
      >
        {children}
      </main>
    </div>
  );
}
