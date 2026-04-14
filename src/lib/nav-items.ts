import {
  Activity,
  Bell,
  Building2,
  Calendar,
  CalendarClock,
  ClipboardList,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LineChart,
  ScrollText,
  Stethoscope,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@prisma/client";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** show in mobile bottom nav */
  mobile?: boolean;
};

export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard, mobile: true },
  { label: "Utenti", href: "/dashboard/admin/users", icon: Users, mobile: true },
  { label: "Organizzazioni", href: "/dashboard/admin/organizations", icon: Building2 },
  { label: "Audit log", href: "/dashboard/admin/audit", icon: ScrollText },
  { label: "Profilo", href: "/dashboard/admin/profile", icon: UserRound },
];

export const doctorNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/doctor", icon: LayoutDashboard, mobile: true },
  { label: "I miei pazienti", href: "/dashboard/doctor/patients", icon: Users, mobile: true },
  { label: "Referti", href: "/dashboard/doctor/reports", icon: FileText, mobile: true },
  { label: "Calendario", href: "/dashboard/doctor/calendar", icon: Calendar, mobile: true },
  { label: "Disponibilità", href: "/dashboard/doctor/availability", icon: CalendarClock },
  { label: "Profilo", href: "/dashboard/doctor/profile", icon: UserRound },
];

export const coachNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/coach", icon: LayoutDashboard, mobile: true },
  { label: "I miei assistiti", href: "/dashboard/coach/patients", icon: Users, mobile: true },
  { label: "Monitoraggio", href: "/dashboard/coach/monitoring", icon: LineChart, mobile: true },
  { label: "Calendario", href: "/dashboard/coach/calendar", icon: Calendar, mobile: true },
  { label: "Disponibilità", href: "/dashboard/coach/availability", icon: CalendarClock },
  { label: "Profilo", href: "/dashboard/coach/profile", icon: UserRound },
];

export const patientNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/patient", icon: LayoutDashboard, mobile: true },
  { label: "Profilo", href: "/dashboard/patient/profile", icon: UserRound },
  { label: "Dati Salute", href: "/dashboard/patient/health", icon: HeartPulse, mobile: true },
  { label: "Cartella Clinica", href: "/dashboard/patient/medical-records", icon: ClipboardList, mobile: true },
  { label: "Appuntamenti", href: "/dashboard/patient/appointments", icon: Calendar, mobile: true },
  { label: "Notifiche", href: "/dashboard/patient/notifications", icon: Bell },
];

export const patientHealthSubNav: NavItem[] = [
  { label: "Corporei", href: "/dashboard/patient/health/corporei", icon: Activity },
  { label: "Circonferenze", href: "/dashboard/patient/health/circonferenze", icon: Activity },
  { label: "Cardiovascolare", href: "/dashboard/patient/health/cardiovascolare", icon: HeartPulse },
  { label: "Metabolica", href: "/dashboard/patient/health/metabolica", icon: Stethoscope },
  { label: "Sonno", href: "/dashboard/patient/health/sonno", icon: Activity },
  { label: "Attività", href: "/dashboard/patient/health/attivita", icon: Activity },
];

export function navForRole(role: UserRole): NavItem[] {
  switch (role) {
    case "ADMIN":
      return adminNav;
    case "DOCTOR":
      return doctorNav;
    case "COACH":
      return coachNav;
    case "PATIENT":
      return patientNav;
  }
}
