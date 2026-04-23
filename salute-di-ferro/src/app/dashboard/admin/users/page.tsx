"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  Loader2,
  Mail,
  Phone,
  Plus,
  Shield,
  ShieldAlert,
  Stethoscope,
  User as UserIcon,
  UserRound,
  Users,
} from "lucide-react";
import type { UserRole } from "@prisma/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
  phone: string | null;
  createdAt: string;
  deletedAt: string | null;
  onboardingCompleted: boolean;
  organization: { id: string; name: string } | null;
};

type ListResponse = {
  items: UserRow[];
  total: number;
  page: number;
  perPage: number;
  counts: Record<UserRole, number>;
};

const ROLE_META: Record<
  UserRole,
  { label: string; icon: React.ReactNode; tone: string }
> = {
  ADMIN: {
    label: "Admin",
    icon: <Shield className="h-3 w-3" />,
    tone: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  },
  DOCTOR: {
    label: "Medico",
    icon: <Stethoscope className="h-3 w-3" />,
    tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  COACH: {
    label: "Coach",
    icon: <UserRound className="h-3 w-3" />,
    tone: "bg-green-500/15 text-green-700 dark:text-green-300",
  },
  PATIENT: {
    label: "Cliente",
    icon: <UserIcon className="h-3 w-3" />,
    tone: "bg-muted text-foreground",
  },
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminUsersPage() {
  const [q, setQ] = React.useState("");
  const [role, setRole] = React.useState<UserRole | "ALL">("ALL");

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ["admin-users", { q, role }],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (role !== "ALL") sp.set("role", role);
      const res = await fetch(`/api/admin/users?${sp.toString()}`);
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });

  const items = data?.items ?? [];
  const counts = data?.counts;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Utenti
          </h1>
          <p className="text-muted-foreground text-sm">
            Gestione account della piattaforma.
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
          <Card key={r}>
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
                  {counts ? counts[r] : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 border-b border-border pb-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="q">Cerca</Label>
          <Input
            id="q"
            placeholder="Nome o email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-[280px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role">Ruolo</Label>
          <Select
            value={role}
            onValueChange={(v) => setRole((v as UserRole | "ALL") ?? "ALL")}
          >
            <SelectTrigger id="role" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutti</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="DOCTOR">Medici</SelectItem>
              <SelectItem value="COACH">Coach</SelectItem>
              <SelectItem value="PATIENT">Clienti</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Users className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">
              Nessun utente trovato con questi filtri.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {data?.total ?? items.length} utent
              {(data?.total ?? items.length) === 1 ? "e" : "i"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {items.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/dashboard/admin/users/${u.id}`}
                    className="hover:bg-muted/40 flex flex-wrap items-center gap-3 px-4 py-3 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      {u.avatarUrl && <AvatarImage src={u.avatarUrl} />}
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {initials(u.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={cn(
                            "truncate text-sm font-medium",
                            u.deletedAt && "text-muted-foreground line-through",
                          )}
                        >
                          {u.fullName}
                        </p>
                        <Badge
                          variant="secondary"
                          className={cn("gap-1", ROLE_META[u.role].tone)}
                        >
                          {ROLE_META[u.role].icon}
                          {ROLE_META[u.role].label}
                        </Badge>
                        {u.deletedAt && (
                          <Badge
                            variant="secondary"
                            className="gap-1 bg-red-500/15 text-red-700 dark:text-red-300"
                          >
                            <ShieldAlert className="h-3 w-3" />
                            Disabilitato
                          </Badge>
                        )}
                        {!u.deletedAt &&
                          !u.onboardingCompleted &&
                          u.role !== "ADMIN" && (
                            <Badge variant="outline" className="text-[10px]">
                              Onboarding in corso
                            </Badge>
                          )}
                      </div>
                      <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-3 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {u.email}
                        </span>
                        {u.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {u.phone}
                          </span>
                        )}
                        {u.organization && <span>{u.organization.name}</span>}
                        <span>Dal {formatDate(u.createdAt)}</span>
                      </div>
                    </div>
                    <ChevronRight className="text-muted-foreground h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
