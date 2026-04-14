"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { coachNav } from "@/lib/nav-items";
import { AIChatProvider } from "@/components/shared/ai-chat-provider";
import { AIChatWidget } from "@/components/shared/ai-chat-widget";

const quickActions = [
  { label: "Nuovo Cliente", href: "/dashboard/coach/clients?new=1" },
  { label: "Nuova Scheda", href: "/dashboard/coach/workouts?new=1" },
];

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AIChatProvider>
      <DashboardShell items={coachNav} quickActions={quickActions}>
        {children}
      </DashboardShell>
      <AIChatWidget />
    </AIChatProvider>
  );
}
