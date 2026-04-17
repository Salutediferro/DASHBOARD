"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { coachNav } from "@/lib/nav-items";

const quickActions: { label: string; href: string }[] = [];

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell items={coachNav} quickActions={quickActions}>
      {children}
    </DashboardShell>
  );
}
