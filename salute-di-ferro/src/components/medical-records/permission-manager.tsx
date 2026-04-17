"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Shield, ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGrantReportPermission,
  useReportPermissions,
  useRevokeReportPermission,
} from "@/lib/hooks/use-medical-records";

type Professional = {
  relationshipId: string;
  professionalRole: "DOCTOR" | "COACH";
  professional: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
};

type Props = {
  reportId: string;
};

/**
 * Permission manager for a single report, used by the patient owner.
 * Shows the current grantees + a selector to add a new one from the
 * patient's active professionals.
 */
export function PermissionManager({ reportId }: Props) {
  const { data: permissions = [], isLoading } = useReportPermissions(reportId);
  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ["me", "professionals"],
    queryFn: async () => {
      const res = await fetch("/api/me/professionals", { cache: "no-store" });
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });

  const [selected, setSelected] = React.useState<string>("");
  const grant = useGrantReportPermission(reportId);
  const revoke = useRevokeReportPermission(reportId);

  const activeGranteeIds = React.useMemo(
    () => new Set(permissions.filter((p) => p.active).map((p) => p.granteeId)),
    [permissions],
  );

  const available = professionals.filter(
    (p) => !activeGranteeIds.has(p.professional.id),
  );

  async function handleGrant() {
    if (!selected) return;
    try {
      await grant.mutateAsync({ granteeId: selected });
      toast.success("Accesso concesso");
      setSelected("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  async function handleRevoke(granteeId: string) {
    try {
      await revoke.mutateAsync(granteeId);
      toast.success("Accesso revocato");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Shield className="text-primary h-4 w-4" />
        <span className="font-medium">Chi può vedere questo referto</span>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Caricamento…
        </div>
      ) : permissions.filter((p) => p.active).length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nessuno, tranne te. Concedi l&apos;accesso a un professionista qui
          sotto.
        </p>
      ) : (
        <ul className="border-border divide-border divide-y rounded-md border">
          {permissions
            .filter((p) => p.active)
            .map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.grantee.fullName}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {p.grantee.email} · {p.grantee.role}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(p.granteeId)}
                  disabled={revoke.isPending}
                  className="text-destructive hover:bg-destructive/10 inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-medium disabled:opacity-50"
                >
                  <ShieldOff className="h-3 w-3" />
                  Revoca
                </button>
              </li>
            ))}
        </ul>
      )}

      {available.length > 0 && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select
              value={selected}
              onValueChange={(v) => setSelected(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Concedi a…" />
              </SelectTrigger>
              <SelectContent>
                {available.map((p) => (
                  <SelectItem
                    key={p.professional.id}
                    value={p.professional.id}
                  >
                    {p.professional.fullName} ({p.professionalRole})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={handleGrant}
            disabled={!selected || grant.isPending}
          >
            {grant.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Concedi
          </Button>
        </div>
      )}

      {available.length === 0 && professionals.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Tutti i tuoi professionisti hanno già accesso a questo referto.
        </p>
      )}
      {professionals.length === 0 && (
        <p className="text-muted-foreground text-xs">
          Non hai ancora professionisti collegati. Chiedi al tuo medico o
          coach di instaurare una relazione di cura per poter condividere i
          referti.
        </p>
      )}
    </div>
  );
}
