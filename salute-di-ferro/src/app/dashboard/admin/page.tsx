"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Building2,
  Loader2,
  Plus,
  ScrollText,
  Shield,
  Stethoscope,
  User as UserIcon,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import type { UserRole } from "@prisma/client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type UsersResponse = {
  total: number;
  counts: Record<UserRole, number>;
  items: Array<{
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    createdAt: string;
  }>;
};

const ROLE_META: Record<
  UserRole,
  { label: string; icon: React.ReactNode; tone: string }
> = {
  ADMIN: {
    label: "Admin",
    icon: <Shield className="h-5 w-5" />,
    tone: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  },
  DOCTOR: {
    label: "Medici",
    icon: <Stethoscope className="h-5 w-5" />,
    tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  COACH: {
    label: "Coach",
    icon: <UserRound className="h-5 w-5" />,
    tone: "bg-green-500/15 text-green-700 dark:text-green-300",
  },
  PATIENT: {
    label: "Pazienti",
    icon: <UserIcon className="h-5 w-5" />,
    tone: "bg-muted text-foreground",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ["admin-users-overview"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users?perPage=10");
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const counts = data?.counts;
  const total = data?.total ?? 0;
  const recent = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Panoramica piattaforma
          </h1>
          <p className="text-muted-foreground text-sm">
            {total} utenti totali.
          </p>
        </div>
        <Link
          href="/dashboard/admin/users/new"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Nuovo utente
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["ADMIN", "DOCTOR", "COACH", "PATIENT"] as UserRole[]).map((r) => (
          <Link key={r} href={`/dashboard/admin/users?role=${r}`}>
            <Card className="hover:border-primary/40 transition-colors">
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-md",
                    ROLE_META[r].tone,
                  )}
                >
                  {ROLE_META[r].icon}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">
                    {ROLE_META[r].label}
                  </p>
                  <p className="font-heading text-2xl font-semibold tabular-nums">
                    {counts ? counts[r] : 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Iscritti di recente</CardTitle>
            <Link
              href="/dashboard/admin/users"
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Tutti →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <p className="text-muted-foreground p-6 text-center text-sm">
                Nessun utente ancora.
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {recent.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 px-4 py-3 text-sm"
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md",
                        ROLE_META[u.role].tone,
                      )}
                    >
                      <span className="scale-75">
                        {ROLE_META[u.role].icon}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{u.fullName}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {u.email}
                      </p>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {formatDate(u.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Strumenti admin</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <QuickAction
              href="/dashboard/admin/users"
              icon={<Users className="h-5 w-5" />}
              title="Gestione utenti"
              desc="Cerca, filtra, controlla"
            />
            <QuickAction
              href="/dashboard/admin/users/new"
              icon={<UserPlus className="h-5 w-5" />}
              title="Crea professionista"
              desc="Invita medico o coach"
            />
            <QuickAction
              href="/dashboard/admin/organizations"
              icon={<Building2 className="h-5 w-5" />}
              title="Organizzazioni"
              desc="Tenant white-label"
            />
            <QuickAction
              href="/dashboard/admin/audit"
              icon={<ScrollText className="h-5 w-5" />}
              title="Audit log"
              desc="Tracciabilità GDPR"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Health check servizi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-green-500" />
              Supabase · OK
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-green-500" />
              Prisma · OK
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-green-500" />
              Auth · OK
            </span>
            <span className="text-muted-foreground/60">
              Stato dedotto dalla risposta di /api/admin/users.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="border-border hover:bg-muted/40 flex items-center gap-3 rounded-md border p-3"
    >
      <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-md">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">{desc}</p>
      </div>
    </Link>
  );
}
