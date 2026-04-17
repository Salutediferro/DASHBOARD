"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users, Trash2, Copy, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InvitePatientDialog } from "@/components/invitations/invite-patient-dialog";

type PatientListItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

type CareRelationRow = {
  id: string;
  patientId: string;
  patient: PatientListItem;
};

type PatientsResponse = { items: CareRelationRow[]; total: number };

type InvitationRow = {
  id: string;
  token: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  createdAt: string;
  usedAt: string | null;
  usedBy: { id: string; fullName: string; email: string } | null;
};

type InvitationsResponse = { items: InvitationRow[] };

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusBadge(status: InvitationRow["status"]) {
  switch (status) {
    case "PENDING":
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" /> In attesa
        </Badge>
      );
    case "ACCEPTED":
      return (
        <Badge variant="secondary" className="gap-1 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" /> Accettato
        </Badge>
      );
    case "EXPIRED":
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" /> Scaduto
        </Badge>
      );
    case "REVOKED":
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <XCircle className="h-3 w-3" /> Revocato
        </Badge>
      );
  }
}

export function PatientsListSection({
  /** Used to build the per-patient detail link */
  basePath,
  /** Page title shown in the header */
  title = "I miei pazienti",
}: {
  basePath: "/dashboard/coach/patients" | "/dashboard/doctor/patients";
  title?: string;
}) {
  const qc = useQueryClient();

  const patientsQuery = useQuery<PatientsResponse>({
    queryKey: ["my-patients"],
    queryFn: async () => {
      const res = await fetch("/api/clients?status=ACTIVE");
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });

  const invitesQuery = useQuery<InvitationsResponse>({
    queryKey: ["my-invitations"],
    queryFn: async () => {
      const res = await fetch("/api/invitations");
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });

  async function copyLink(token: string) {
    const url = `${window.location.origin}/register?invite=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiato");
    } catch {
      toast.error("Copia non riuscita");
    }
  }

  async function revoke(id: string) {
    const ok = confirm("Revocare questo invito?");
    if (!ok) return;
    const res = await fetch(`/api/invitations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Revoca non riuscita");
      return;
    }
    toast.success("Invito revocato");
    qc.invalidateQueries({ queryKey: ["my-invitations"] });
  }

  const pendingInvites =
    invitesQuery.data?.items.filter((i) => i.status === "PENDING") ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="text-muted-foreground text-sm">
            {patientsQuery.data
              ? `${patientsQuery.data.total} attivi`
              : "Caricamento..."}
          </p>
        </div>
        <InvitePatientDialog
          onCreated={() =>
            qc.invalidateQueries({ queryKey: ["my-invitations"] })
          }
        />
      </header>

      {patientsQuery.isLoading && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      )}

      {patientsQuery.data && patientsQuery.data.items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Users className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">
              Nessun paziente attivo. Invia un invito per iniziare.
            </p>
          </CardContent>
        </Card>
      )}

      {patientsQuery.data && patientsQuery.data.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Elenco</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            {patientsQuery.data.items.map((rel) => (
              <Link
                key={rel.id}
                href={`${basePath}/${rel.patientId}`}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/40"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {initials(rel.patient.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {rel.patient.fullName}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {rel.patient.email}
                  </p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending invitations list */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Inviti in attesa ({pendingInvites.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            {pendingInvites.map((inv) => {
              const label =
                inv.firstName || inv.lastName
                  ? `${inv.firstName ?? ""} ${inv.lastName ?? ""}`.trim()
                  : inv.email || "Invito generico";
              return (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{label}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {inv.email ?? "nessuna email pre-compilata"} · scade il{" "}
                      {new Date(inv.expiresAt).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  {statusBadge(inv.status)}
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => copyLink(inv.token)}
                    aria-label="Copia link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => revoke(inv.id)}
                    aria-label="Revoca"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
