"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, UserRound } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

type PatientItem = {
  patientId: string;
  patient: { id: string; fullName: string; avatarUrl: string | null };
};

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function PatientPickerDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  const patientsQuery = useQuery<{ items: PatientItem[]; total: number }>({
    queryKey: ["my-patients-for-nutrition"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch(
        "/api/clients?status=ACTIVE&role=DOCTOR&perPage=100",
      );
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });

  const items = patientsQuery.data?.items ?? [];
  const filtered = query.trim()
    ? items.filter((p) =>
        p.patient.fullName.toLowerCase().includes(query.toLowerCase()),
      )
    : items;

  function pick(patientId: string) {
    onOpenChange(false);
    router.push(`/dashboard/doctor/nutrition/${patientId}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seleziona un paziente</DialogTitle>
          <DialogDescription>
            Scegli per chi vuoi creare o modificare un piano nutrizionale.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Cerca per nome…"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="-mx-1 flex max-h-[55vh] flex-col gap-1 overflow-y-auto px-1">
          {patientsQuery.isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 p-3 text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Caricamento…
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs">
              Nessun paziente trovato.
            </p>
          ) : (
            filtered.map((p) => (
              <Button
                key={p.patientId}
                type="button"
                variant="ghost"
                className="h-auto justify-start gap-3 p-2.5"
                onClick={() => pick(p.patient.id)}
              >
                <Avatar className="h-9 w-9">
                  {p.patient.avatarUrl && (
                    <AvatarImage
                      src={p.patient.avatarUrl}
                      alt={p.patient.fullName}
                    />
                  )}
                  <AvatarFallback className="text-xs">
                    {initials(p.patient.fullName)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate text-left text-sm font-medium">
                  {p.patient.fullName}
                </span>
                <UserRound className="text-muted-foreground h-4 w-4" />
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
