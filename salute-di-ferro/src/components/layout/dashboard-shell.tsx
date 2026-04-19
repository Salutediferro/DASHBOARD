import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Topbar } from "@/components/layout/topbar";
import type { NavItem } from "@/lib/nav-items";

type Props = {
  items: NavItem[];
  quickActions?: { label: string; href: string }[];
  children: React.ReactNode;
};

export function DashboardShell({ items, quickActions, children }: Props) {
  return (
    <div className="bg-background text-foreground flex min-h-screen">
      <Sidebar items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar items={items} quickActions={quickActions} />
        <main className="page-in flex flex-1 flex-col overflow-y-auto p-4 pb-24 md:p-8 md:pb-8">
          {children}
        </main>
      </div>
      <MobileNav items={items} quickActions={quickActions} />
    </div>
  );
}
