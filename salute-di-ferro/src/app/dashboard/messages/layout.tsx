"use client";

import { Loader2 } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useUser } from "@/lib/hooks/use-user";
import { navForRole } from "@/lib/nav-items";

/**
 * Messages live outside the per-role /dashboard/<role>/* subtrees
 * because the feature is cross-role (patient ↔ professional). We
 * still need the role-aware shell, so the layout resolves the
 * caller's role at runtime and picks the matching nav.
 */
export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, isLoading } = useUser();

  if (isLoading || !role) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return <DashboardShell items={navForRole(role)}>{children}</DashboardShell>;
}
