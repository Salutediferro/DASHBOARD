"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  Eye,
  FlameKindling,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Trash2,
  User as UserIcon,
  UserRound,
} from "lucide-react";
import type { UserRole } from "@prisma/client";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type UserDetail = {
  id: string;
  email: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  avatarUrl: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  onboardingCompleted: boolean;
  organization: { id: string; name: string } | null;
};

type ResetPasswordResult = {
  ok: true;
  emailDelivered: boolean;
  fallbackLink: string | null;
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

async function patchUser(id: string, body: unknown) {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof json?.error === "string"
        ? json.error
        : "Azione fallita, riprova";
    throw new Error(msg);
  }
  return json;
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: user, isLoading, isError } = useQuery<UserDetail>({
    queryKey: ["admin-user", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${id}`);
      if (!res.ok) throw new Error("Utente non trovato");
      return res.json();
    },
  });

  const disabled = !!user?.deletedAt;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-user", id] });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const disableMutation = useMutation({
    mutationFn: () => patchUser(id, { action: "DISABLE" }),
    onSuccess: () => {
      toast.success("Utente disabilitato");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restoreMutation = useMutation({
    mutationFn: () => patchUser(id, { action: "RESTORE" }),
    onSuccess: () => {
      toast.success("Utente ripristinato");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleMutation = useMutation({
    mutationFn: (role: UserRole) => patchUser(id, { action: "CHANGE_ROLE", role }),
    onSuccess: () => {
      toast.success("Ruolo aggiornato");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMutation = useMutation<ResetPasswordResult>({
    mutationFn: () => patchUser(id, { action: "RESET_PASSWORD" }),
    onSuccess: (data) => {
      if (data.emailDelivered) {
        toast.success("Email di reset inviata");
      } else if (data.fallbackLink) {
        void navigator.clipboard
          ?.writeText(data.fallbackLink)
          .catch(() => undefined);
        toast.warning(
          "Invio email fallito — link di reset copiato negli appunti",
        );
      }
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string"
            ? json.error
            : "Eliminazione fallita",
        );
      }
      return json as { ok: true; storagePurged: number };
    },
    onSuccess: (data) => {
      toast.success(
        `Utente eliminato definitivamente (${data.storagePurged} file purgati dallo storage)`,
      );
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      router.push("/dashboard/admin/users");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleExport() {
    window.location.href = `/api/admin/users/${id}/export`;
  }

  function handleHardDelete() {
    if (!user) return;
    const first = window.prompt(
      `Eliminazione DEFINITIVA di ${user.fullName}.\n\n` +
        `Tutti i dati (referti, misurazioni, appuntamenti, messaggi) saranno persi e non recuperabili.\n\n` +
        `Scrivi l'email dell'utente per confermare:\n${user.email}`,
    );
    if (first !== user.email) return;
    if (
      !window.confirm(
        `Ultimo conferma: eliminare definitivamente ${user.email}? ` +
          `Questa azione NON è reversibile.`,
      )
    ) {
      return;
    }
    hardDeleteMutation.mutate();
  }

  function confirmThen(message: string, fn: () => void) {
    if (window.confirm(message)) fn();
  }

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Utente non trovato o accesso negato.
          </p>
          <Button variant="outline" onClick={() => router.back()}>
            Indietro
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/admin/users"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Torna agli utenti
      </Link>

      <header className="flex flex-wrap items-center gap-4">
        <Avatar className="h-16 w-16">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
          <AvatarFallback className="bg-primary/20 text-primary">
            {initials(user.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {user.fullName}
            </h1>
            <Badge
              variant="secondary"
              className={cn("gap-1", ROLE_META[user.role].tone)}
            >
              {ROLE_META[user.role].icon}
              {ROLE_META[user.role].label}
            </Badge>
            {disabled && (
              <Badge
                variant="secondary"
                className="gap-1 bg-red-500/15 text-red-700 dark:text-red-300"
              >
                <ShieldAlert className="h-3 w-3" />
                Disabilitato
              </Badge>
            )}
            {!user.onboardingCompleted && user.role !== "ADMIN" && (
              <Badge variant="outline" className="text-[10px]">
                Onboarding in corso
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {user.email}
            </span>
            {user.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {user.phone}
              </span>
            )}
            {user.organization && <span>{user.organization.name}</span>}
            <span>Creato il {formatDate(user.createdAt)}</span>
          </div>
        </div>
        <Link
          href={`/dashboard/admin/users/${user.id}/view-as`}
          className="border-border hover:bg-muted/40 inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors"
        >
          <Eye className="h-4 w-4" />
          Visualizza come utente
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stato account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-muted-foreground max-w-prose text-sm">
            {disabled
              ? "Account disabilitato: sessioni attive revocate e login bloccato (ban Supabase). Ripristina per riattivare l'accesso."
              : "Account attivo. Disabilitarlo termina le sessioni e blocca nuovi login finché non lo ripristini."}
          </p>
          {disabled ? (
            <Button
              variant="outline"
              onClick={() =>
                confirmThen(
                  `Ripristinare ${user.fullName}? Tornerà a poter fare login.`,
                  () => restoreMutation.mutate(),
                )
              }
              disabled={restoreMutation.isPending}
              className="gap-2"
            >
              {restoreMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Ripristina
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() =>
                confirmThen(
                  `Disabilitare ${user.fullName}? Le sue sessioni verranno chiuse e non potrà più accedere finché non lo ripristini.`,
                  () => disableMutation.mutate(),
                )
              }
              disabled={disableMutation.isPending}
              className="gap-2"
            >
              {disableMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Disabilita
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ruolo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-muted-foreground max-w-prose text-sm">
            Il ruolo è sincronizzato con Supabase <code>app_metadata</code>.
            Cambiarlo aggiorna subito i permessi su tutta la piattaforma.
          </p>
          <div className="flex items-center gap-2">
            <Select
              value={user.role}
              onValueChange={(v) =>
                confirmThen(
                  `Cambiare il ruolo di ${user.fullName} da ${user.role} a ${v}?`,
                  () => roleMutation.mutate(v as UserRole),
                )
              }
              disabled={roleMutation.isPending || disabled}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="DOCTOR">Medico</SelectItem>
                <SelectItem value="COACH">Coach</SelectItem>
                <SelectItem value="PATIENT">Cliente</SelectItem>
              </SelectContent>
            </Select>
            {roleMutation.isPending && (
              <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Password</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-muted-foreground max-w-prose text-sm">
            Invia all&apos;utente un&apos;email con un link per reimpostare
            la password (valido 24h). Se l&apos;invio email fallisce, il link
            viene copiato automaticamente negli appunti per l&apos;inoltro
            manuale.
          </p>
          <Button
            variant="outline"
            onClick={() =>
              confirmThen(
                `Inviare un'email di reset password a ${user.email}?`,
                () => resetMutation.mutate(),
              )
            }
            disabled={resetMutation.isPending || disabled}
            className="gap-2"
          >
            {resetMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Invia reset password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Esporta dati (GDPR Art. 15/20)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-muted-foreground max-w-prose text-sm">
            Scarica un JSON con tutti i dati dell&apos;utente: profilo,
            misurazioni, appuntamenti, referti (metadati), permessi, messaggi,
            notifiche, audit log. I file dei referti non sono inclusi — vanno
            scaricati separatamente con i signed URL.
          </p>
          <Button
            variant="outline"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Scarica export JSON
          </Button>
        </CardContent>
      </Card>

      <Card className="border-red-500/30">
        <CardHeader>
          <CardTitle className="text-base text-red-600 dark:text-red-400">
            Cancellazione definitiva (GDPR Art. 17)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground max-w-prose text-sm">
            Elimina l&apos;utente e tutti i suoi dati in modo{" "}
            <strong className="text-red-600 dark:text-red-400">
              irreversibile
            </strong>
            . Purga i file dallo storage, elimina l&apos;account Supabase, e
            cascata tutte le relazioni Prisma. Richiesta per l&apos;esercizio
            del diritto all&apos;oblio.
          </p>
          {!disabled ? (
            <p className="text-muted-foreground text-xs">
              ⚠︎ Prima disabilita l&apos;utente (sezione &ldquo;Stato
              account&rdquo;). Il processo è a due passi di sicurezza.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Un medico/coach che ha caricato referti per altri pazienti non
              può essere eliminato finché quei referti non vengono riassegnati
              o cancellati (FK Restrict).
            </p>
          )}
          <div className="flex justify-end">
            <Button
              variant="destructive"
              onClick={handleHardDelete}
              disabled={!disabled || hardDeleteMutation.isPending}
              className="gap-2"
            >
              {hardDeleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FlameKindling className="h-4 w-4" />
              )}
              Elimina definitivamente
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <Link
            href={`/dashboard/admin/audit?q=${encodeURIComponent(user.id)}`}
            className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
          >
            <RotateCcw className="h-4 w-4" />
            Vedi tutte le azioni che coinvolgono questo utente
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
