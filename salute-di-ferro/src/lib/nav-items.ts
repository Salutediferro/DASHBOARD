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
  MessageSquare,
  NotebookPen,
  Pill,
  ScrollText,
  Stethoscope,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@prisma/client";

/**
 * Named badge sources resolved by the Sidebar to live counters.
 * Plain strings are serializable across the RSC boundary — functions are
 * also accepted for client-created items that need full flexibility.
 */
export type NavBadgeKey = "unread-messages" | "unread-notifications";
export type NavBadgeSource =
  | NavBadgeKey
  | (() => number | Promise<number>);

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** show in mobile bottom nav */
  mobile?: boolean;
  /** section label used by the desktop sidebar to group items */
  group?: string;
  /** lazy counter rendered as a pill at the right of the item */
  badge?: NavBadgeSource;
};

// Group labels — kept as constants so typos are caught at import time
// and refactors are cheap.
const G = {
  overview: "Panoramica",
  journey: "Il mio percorso",
  therapy: "Supplementazione",
  interactions: "Interazioni",
  schedule: "Agenda",
  work: "Il mio lavoro",
  docs: "Documenti",
  management: "Gestione",
  account: "Account",
} as const;

export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard, mobile: true, group: G.overview },
  { label: "Audit log", href: "/dashboard/admin/audit", icon: ScrollText, group: G.overview },
  { label: "Utenti", href: "/dashboard/admin/users", icon: Users, mobile: true, group: G.management },
  { label: "Organizzazioni", href: "/dashboard/admin/organizations", icon: Building2, group: G.management },
  { label: "Messaggi", href: "/dashboard/messages", icon: MessageSquare, group: G.interactions, badge: "unread-messages" },
  { label: "Profilo", href: "/dashboard/admin/profile", icon: UserRound, group: G.account },
];

export const doctorNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/doctor", icon: LayoutDashboard, mobile: true, group: G.work },
  { label: "I miei clienti", href: "/dashboard/doctor/patients", icon: Users, mobile: true, group: G.work },
  { label: "Calendario", href: "/dashboard/doctor/calendar", icon: Calendar, mobile: true, group: G.schedule },
  { label: "Disponibilità", href: "/dashboard/doctor/availability", icon: CalendarClock, group: G.schedule },
  { label: "Referti", href: "/dashboard/doctor/reports", icon: FileText, group: G.docs },
  { label: "Messaggi", href: "/dashboard/messages", icon: MessageSquare, mobile: true, group: G.interactions, badge: "unread-messages" },
  { label: "Profilo", href: "/dashboard/doctor/profile", icon: UserRound, group: G.account },
];

export const coachNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/coach", icon: LayoutDashboard, mobile: true, group: G.work },
  { label: "I miei assistiti", href: "/dashboard/coach/patients", icon: Users, mobile: true, group: G.work },
  { label: "Monitoraggio", href: "/dashboard/coach/monitoring", icon: LineChart, group: G.work },
  { label: "Calendario", href: "/dashboard/coach/calendar", icon: Calendar, mobile: true, group: G.schedule },
  { label: "Disponibilità", href: "/dashboard/coach/availability", icon: CalendarClock, group: G.schedule },
  { label: "Messaggi", href: "/dashboard/messages", icon: MessageSquare, mobile: true, group: G.interactions, badge: "unread-messages" },
  { label: "Profilo", href: "/dashboard/coach/profile", icon: UserRound, group: G.account },
];

export const patientNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/patient", icon: LayoutDashboard, mobile: true, group: G.journey },
  { label: "Percorso", href: "/dashboard/patient/percorso", icon: Stethoscope, mobile: true, group: G.journey },
  { label: "Dati Salute", href: "/dashboard/patient/health", icon: HeartPulse, mobile: true, group: G.journey },
  { label: "Cartella del cliente", href: "/dashboard/patient/medical-records", icon: ClipboardList, mobile: true, group: G.journey },
  { label: "Diario", href: "/dashboard/patient/symptoms", icon: NotebookPen, group: G.journey },
  { label: "Timeline", href: "/dashboard/patient/timeline", icon: Activity, group: G.journey },
  { label: "Supplementi", href: "/dashboard/patient/supplementi", icon: Pill, group: G.therapy },
  { label: "Notifiche", href: "/dashboard/patient/notifications", icon: Bell, group: G.therapy, badge: "unread-notifications" },
  { label: "Appuntamenti", href: "/dashboard/patient/appointments", icon: Calendar, mobile: true, group: G.interactions },
  { label: "Messaggi", href: "/dashboard/messages", icon: MessageSquare, mobile: true, group: G.interactions, badge: "unread-messages" },
  { label: "Profilo", href: "/dashboard/patient/profile", icon: UserRound, group: G.account },
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
