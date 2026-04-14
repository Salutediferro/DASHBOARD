import {
  LayoutDashboard,
  Users,
  UserRound,
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
];

export const doctorNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/doctor", icon: LayoutDashboard, mobile: true },
  { label: "I miei pazienti", href: "/dashboard/doctor/patients", icon: Users, mobile: true },
];

export const coachNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/coach", icon: LayoutDashboard, mobile: true },
  { label: "I miei assistiti", href: "/dashboard/coach/clients", icon: Users, mobile: true },
];

export const patientNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/client", icon: LayoutDashboard, mobile: true },
  { label: "Profilo", href: "/dashboard/client/profile", icon: UserRound, mobile: true },
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
