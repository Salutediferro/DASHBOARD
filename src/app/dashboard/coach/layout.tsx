"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { coachNav } from "@/lib/nav-items";

const quickActions = [
  { label: "Nuovo Cliente", href: "/dashboard/coach/clients?new=1" },
];

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
