"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { doctorNav } from "@/lib/nav-items";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell items={doctorNav}>{children}</DashboardShell>;
}
