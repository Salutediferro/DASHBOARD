"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createClientSchema,
  type CreateClientInput,
} from "@/lib/validators/client";
import type { ClientListItem, ClientStatus } from "@/lib/mock-clients";

type SortKey = "fullName" | "email" | "lastCheckIn" | "adherencePercent";

const PLANS = ["Basic", "Premium", "VIP"] as const;

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusBadge(s: ClientStatus) {
  const map = {
    ACTIVE: { label: "Attivo", cls: "bg-green-500/20 text-green-400" },
    PAUSED: { label: "In pausa", cls: "bg-yellow-500/20 text-yellow-400" },
    ARCHIVED: { label: "Archiviato", cls: "bg-muted text-muted-foreground" },
  };
  const s1 = map[s];
  return <Badge className={s1.cls}>{s1.label}</Badge>;
}

function adherenceDot(p: number) {
  const color = p >= 80 ? "bg-green-500" : p >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      <span className="text-sm">{p}%</span>
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });
}

function AddClientDialog() {
  const [open, setOpen] = React.useState(false);
  const qc = useQueryClient();
  const form = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      birthDate: "",
      plan: "Basic",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: CreateClientInput) => {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Errore creazione cliente");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Cliente creato", {
        description: "Invito email inviato (placeholder)",
      });
      qc.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      form.reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors">
        <Plus className="h-4 w-4" />
        Aggiungi Cliente
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuovo cliente</DialogTitle>
          <DialogDescription>
            Crea un account cliente e invia l&apos;invito via email
          </DialogDescription>
        </DialogHeader>
        <form
          id="new-client"
          className="grid grid-cols-2 gap-4"
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="firstName">Nome</Label>
            <Input id="firstName" {...form.register("firstName")} />
            {form.formState.errors.firstName && (
              <p className="text-destructive text-xs">
                {form.formState.errors.firstName.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lastName">Cognome</Label>
            <Input id="lastName" {...form.register("lastName")} />
            {form.formState.errors.lastName && (
              <p className="text-destructive text-xs">
                {form.formState.errors.lastName.message}
              </p>
            )}
          </div>
          <div className="col-span-2 flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-destructive text-xs">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Telefono</Label>
            <Input id="phone" {...form.register("phone")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="birthDate">Data di nascita</Label>
            <Input id="birthDate" type="date" {...form.register("birthDate")} />
          </div>
          <div className="col-span-2 flex flex-col gap-2">
            <Label>Piano</Label>
            <Select
              defaultValue="Basic"
              onValueChange={(v) =>
                form.setValue("plan", v as CreateClientInput["plan"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLANS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex flex-col gap-2">
            <Label htmlFor="notes">Note iniziali</Label>
            <Textarea id="notes" rows={3} {...form.register("notes")} />
          </div>
        </form>
        <DialogFooter>
          <button
            type="submit"
            form="new-client"
            disabled={mutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium disabled:opacity-50"
          >
            {mutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Crea cliente
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortButton({
  label,
  column,
  sortBy,
  sortDir,
  onSort,
}: {
  label: string;
  column: SortKey;
  sortBy: SortKey;
  sortDir: "asc" | "desc";
  onSort: (c: SortKey) => void;
}) {
  const active = sortBy === column;
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn(
        "flex items-center gap-1 text-xs font-medium uppercase tracking-wider",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <Icon className="h-3 w-3" />
    </button>
  );
}

export default function ClientsListPage() {
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<"ALL" | ClientStatus>("ALL");
  const [plan, setPlan] = React.useState<"ALL" | (typeof PLANS)[number]>("ALL");
  const [sortBy, setSortBy] = React.useState<SortKey>("fullName");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [page, setPage] = React.useState(1);
  const [view, setView] = React.useState<"list" | "grid">("list");

  const params = new URLSearchParams({
    q,
    status,
    plan,
    sortBy,
    sortDir,
    page: String(page),
  });

  const { data, isLoading } = useQuery<{
    items: ClientListItem[];
    total: number;
  }>({
    queryKey: ["clients", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/clients?${params}`);
      if (!res.ok) throw new Error("Errore caricamento");
      return res.json();
    },
  });

  function onSort(col: SortKey) {
    if (col === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  const total = data?.total ?? 0;
  const perPage = 20;
  const lastPage = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Clienti
          </h1>
          <p className="text-muted-foreground text-sm">
            Gestisci i tuoi clienti e i loro piani
          </p>
        </div>
        <AddClientDialog />
      </header>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Cerca nome o email..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as "ALL" | ClientStatus);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutti gli stati</SelectItem>
              <SelectItem value="ACTIVE">Attivi</SelectItem>
              <SelectItem value="PAUSED">In pausa</SelectItem>
              <SelectItem value="ARCHIVED">Archiviati</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={plan}
            onValueChange={(v) => {
              setPlan(v as "ALL" | (typeof PLANS)[number]);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutti i piani</SelectItem>
              {PLANS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="border-border ml-auto flex rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded",
                view === "list" && "bg-muted",
              )}
              aria-label="Vista lista"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("grid")}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded",
                view === "grid" && "bg-muted",
              )}
              aria-label="Vista griglia"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="text-muted-foreground flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : view === "list" ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-border border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <SortButton
                      label="Nome"
                      column="fullName"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={onSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <SortButton
                      label="Email"
                      column="email"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={onSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Piano
                  </th>
                  <th className="px-4 py-3 text-left">
                    <SortButton
                      label="Ultimo check-in"
                      column="lastCheckIn"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={onSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <SortButton
                      label="Aderenza"
                      column="adherencePercent"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={onSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data?.items.map((c) => (
                  <tr
                    key={c.id}
                    className="border-border hover:bg-muted/20 border-b transition-colors last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {c.avatarUrl && <AvatarImage src={c.avatarUrl} />}
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {initials(c.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{c.fullName}</span>
                      </div>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {c.email}
                    </td>
                    <td className="px-4 py-3">{c.plan}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {formatDate(c.lastCheckIn)}
                    </td>
                    <td className="px-4 py-3">
                      {adherenceDot(c.adherencePercent)}
                    </td>
                    <td className="px-4 py-3">{statusBadge(c.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/coach/clients/${c.id}`}
                        className="text-primary text-xs font-medium hover:underline"
                      >
                        Apri →
                      </Link>
                    </td>
                  </tr>
                ))}
                {data?.items.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-muted-foreground px-4 py-12 text-center"
                    >
                      Nessun cliente trovato
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((c) => (
            <Link key={c.id} href={`/dashboard/coach/clients/${c.id}`}>
              <Card className="hover:border-primary/40 h-full cursor-pointer transition-colors">
                <CardContent className="flex flex-col gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {initials(c.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.fullName}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {c.email}
                      </p>
                    </div>
                    {statusBadge(c.status)}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="text-muted-foreground">Piano</p>
                      <p className="font-medium">{c.plan}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Aderenza</p>
                      {adherenceDot(c.adherencePercent)}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Check-in</p>
                      <p className="font-medium">
                        {formatDate(c.lastCheckIn)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total} clienti · pagina {page} di {lastPage}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="hover:bg-muted flex h-9 w-9 items-center justify-center rounded-md border disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= lastPage}
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              className="hover:bg-muted flex h-9 w-9 items-center justify-center rounded-md border disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
