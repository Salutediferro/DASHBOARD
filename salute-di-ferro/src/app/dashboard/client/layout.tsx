"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { clientNav } from "@/lib/nav-items";
import { AIChatProvider } from "@/components/shared/ai-chat-provider";
import { AIChatWidget } from "@/components/shared/ai-chat-widget";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AIChatProvider>
      <DashboardShell items={clientNav}>{children}</DashboardShell>
      <AIChatWidget />
    </AIChatProvider>
  );
}
