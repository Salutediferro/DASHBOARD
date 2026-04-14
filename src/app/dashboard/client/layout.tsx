"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { clientNav } from "@/lib/nav-items";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell items={clientNav}>{children}</DashboardShell>;
}
