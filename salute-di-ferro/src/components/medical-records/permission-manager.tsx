"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  Shield,
  ShieldOff,
  Sparkles,
  UserRound,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGrantReportPermission,
  useReportPermissions,
  useRevokeReportPermission,
} from "@/lib/hooks/use-medical-records";
import { cn } from "@/lib/utils";

type Professional = {
  relationshipId: string;
  professionalRole: "DOCTOR" | "COACH";
  professional: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
  };
};

type Props = {
  reportId: string | null;
  onClose: () => void;
};

type ExpiresPreset = "7d" | "30d" | "1y" | "never";

// ── Component ────────────────────────────────────────────────────────────

export function PermissionManager({ reportId, onClose }: Props) {
  return (
    <Sheet
      open={!!reportId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col gap-0 overflow-y-auto"
      >
        <SheetHeader className="border-b border-border/60">
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary-500" aria-hidden />
            Chi può vedere questo referto
          </SheetTitle>
          <SheetDescription>
            I permessi sono sempre revocabili. Solo tu sei proprietario: chi
            riceve l&apos;accesso vede il referto finché non lo revochi (o fino
            alla scadenza impostata).
          </SheetDescription>
        </SheetHeader>
        {reportId && <PermissionManagerBody reportId={reportId} />}
      </SheetContent>
    </Sheet>
  );
}

function PermissionManagerBody({ reportId }: { reportId: string }) {
  const { data: permissions = [], isLoading } = useReportPermissions(reportId);
  const { data: professionals = [], isLoading: proLoading } = useQuery<
    Professional[]
  >({
    queryKey: ["me", "professionals"],
    queryFn: async () => {
      const res = await fetch("/api/me/professionals", { cache: "no-store" });
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });

  const grant = useGrantReportPermission(reportId);
  const revoke = useRevokeReportPermission(reportId);

  const [expiresPreset, setExpiresPreset] =
    React.useState<ExpiresPreset>("30d");
  const [customExpires, setCustomExpires] = React.useState<string>("");

  const activeGranteeIds = React.useMemo(
    () => new Set(permissions.filter((p) => p.active).map((p) => p.granteeId)),
    [permissions],
  );
  const available = professionals.filter(
    (p) => !activeGranteeIds.has(p.professional.id),
  );
  const active = permissions.filter((p) => p.active);

  function computeExpiresAt(): string | null {
    if (customExpires) return customExpires;
    if (expiresPreset === "never") return null;
    const now = new Date();
    const add = expiresPreset === "7d" ? 7 : expiresPreset === "30d" ? 30 : 365;
    now.setDate(now.getDate() + add);
    return now.toISOString();
  }

  async function handleGrant(granteeId: string) {
    try {
      await grant.mutateAsync({
        granteeId,
        expiresAt: computeExpiresAt(),
      });
      toast.success("Accesso concesso");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  async function handleRevoke(granteeId: string, name: string) {
    if (
      !confirm(
        `Revocare l'accesso a ${name}? Non vedrà più questo referto finché non lo concedi di nuovo.`,
      )
    )
      return;
    try {
      await revoke.mutateAsync(granteeId);
      toast.success("Accesso revocato");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-5">
      {/* ── Currently granted ────────────────────── */}
      <section aria-labelledby="granted-heading" className="flex flex-col gap-2">
        <h3
          id="granted-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          Accesso attivo
        </h3>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Caricamento…
          </div>
        ) : active.length === 0 ? (
          <div className="surface-1 flex items-start gap-3 rounded-xl p-3 text-sm">
            <Sparkles
              className="mt-0.5 h-4 w-4 shrink-0 text-accent-500"
              aria-hidden
            />
            <p className="text-muted-foreground">
              Al momento solo tu puoi vedere questo referto. Concedi l&apos;accesso
              a un professionista qui sotto.
            </p>
          </div>
        ) : (
          <ul className="surface-1 divide-y divide-border/60 overflow-hidden rounded-xl">
            {active.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 px-3 py-2 text-sm"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/15 text-primary text-xs">
                    {initials(p.grantee.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.grantee.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="capitalize">
                      {roleLabel(p.grantee.role)}
                    </span>
                    {p.expiresAt && (
                      <>
                        {" · "}
                        fino al {formatShort(p.expiresAt)}
                      </>
                    )}
                    {!p.expiresAt && " · senza scadenza"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(p.granteeId, p.grantee.fullName)}
                  disabled={revoke.isPending}
                  aria-label={`Revoca accesso a ${p.grantee.fullName}`}
                  className="focus-ring inline-flex h-8 items-center gap-1 rounded-md border border-border/60 px-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                >
                  <ShieldOff className="h-3 w-3" aria-hidden />
                  Revoca
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Grant new access ──────────────────────── */}
      <section aria-labelledby="grant-heading" className="flex flex-col gap-3">
        <h3
          id="grant-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          Concedi a
        </h3>

        {/* Preset expires */}
        <div className="flex flex-col gap-2">
          <Label className="flex items-center gap-1 text-xs">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            Scadenza accesso
          </Label>
          <div
            role="radiogroup"
            aria-label="Preset di scadenza"
            className="flex gap-1"
          >
            {(
              [
                { key: "7d", label: "7 giorni" },
                { key: "30d", label: "30 giorni" },
                { key: "1y", label: "1 anno" },
                { key: "never", label: "mai" },
              ] as const
            ).map((p) => {
              const active = !customExpires && expiresPreset === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setExpiresPreset(p.key);
                    setCustomExpires("");
                  }}
                  className={cn(
                    "focus-ring flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary-500/40 bg-primary-500/15 text-primary-500"
                      : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Label
              htmlFor="custom-expires"
              className="whitespace-nowrap text-[11px] text-muted-foreground"
            >
              o data precisa
            </Label>
            <Input
              id="custom-expires"
              type="date"
              value={customExpires}
              onChange={(e) => setCustomExpires(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="focus-ring h-8"
              aria-label="Data di scadenza personalizzata"
            />
          </div>
        </div>

        {/* Candidates */}
        {proLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cerco i
            tuoi professionisti…
          </div>
        ) : professionals.length === 0 ? (
          <p className="surface-1 rounded-xl p-3 text-xs text-muted-foreground">
            Non hai ancora professionisti collegati. Chiedi al tuo medico o
            coach di instaurare una relazione di cura per poter condividere i
            referti.
          </p>
        ) : available.length === 0 ? (
          <p className="surface-1 rounded-xl p-3 text-xs text-muted-foreground">
            Tutti i tuoi professionisti hanno già accesso a questo referto.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {available.map((p) => (
              <li
                key={p.professional.id}
                className="surface-1 flex items-center gap-3 rounded-xl p-3"
              >
                <Avatar className="h-9 w-9">
                  {p.professional.avatarUrl && (
                    <AvatarImage src={p.professional.avatarUrl} />
                  )}
                  <AvatarFallback className="bg-accent-500/15 text-accent-500 text-xs">
                    {initials(p.professional.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    <UserRound
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    {p.professional.fullName}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {roleLabel(p.professionalRole)} · {p.professional.email}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleGrant(p.professional.id)}
                  disabled={grant.isPending}
                >
                  {grant.isPending ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  )}
                  Concedi
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function roleLabel(role: string) {
  switch (role.toUpperCase()) {
    case "DOCTOR":
      return "Medico";
    case "COACH":
      return "Coach";
    case "ADMIN":
      return "Admin";
    case "PATIENT":
      return "Cliente";
    default:
      return role;
  }
}

function formatShort(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
