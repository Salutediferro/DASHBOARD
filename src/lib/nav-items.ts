import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Apple,
  ClipboardCheck,
  CalendarDays,
  BookOpen,
  LifeBuoy,
  Sparkles,
  Settings,
  Home,
  LineChart,
  FileText,
  User as UserIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** show in mobile bottom nav */
  mobile?: boolean;
};

export const coachNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/coach", icon: LayoutDashboard, mobile: true },
  { label: "Clienti", href: "/dashboard/coach/clients", icon: Users, mobile: true },
  { label: "Allenamenti", href: "/dashboard/coach/workouts", icon: Dumbbell, mobile: true },
  { label: "Nutrizione", href: "/dashboard/coach/nutrition", icon: Apple, mobile: true },
  { label: "Check-in", href: "/dashboard/coach/check-ins", icon: ClipboardCheck },
  { label: "Calendario", href: "/dashboard/coach/calendar", icon: CalendarDays, mobile: true },
  { label: "Libreria Esercizi", href: "/dashboard/coach/exercises", icon: BookOpen },
  { label: "Supporto", href: "/dashboard/coach/support", icon: LifeBuoy },
  { label: "AI Assistant", href: "/dashboard/coach/ai", icon: Sparkles },
  { label: "Impostazioni", href: "/dashboard/coach/settings", icon: Settings },
];

export const clientNav: NavItem[] = [
  { label: "Home", href: "/dashboard/client", icon: Home, mobile: true },
  { label: "Allenamento", href: "/dashboard/client/workout", icon: Dumbbell, mobile: true },
  { label: "Nutrizione", href: "/dashboard/client/nutrition", icon: Apple, mobile: true },
  { label: "Progressi", href: "/dashboard/client/progress", icon: LineChart, mobile: true },
  { label: "Appuntamenti", href: "/dashboard/client/appointments", icon: CalendarDays },
  { label: "Referti", href: "/dashboard/client/medical-reports", icon: FileText },
  { label: "AI", href: "/dashboard/client/ai-assistant", icon: Sparkles },
  { label: "Profilo", href: "/dashboard/client/profile", icon: UserIcon, mobile: true },
];
