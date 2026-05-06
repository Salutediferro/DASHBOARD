"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { readApiError } from "@/lib/api-error";

type ClientRow = {
  id: string;
  patientId: string;
  patient: { id: string; fullName: string; email: string };
  status: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (patient: { id: string; fullName: string }) => void;
};

// Lightweight patient picker scoped to ACTIVE clients of the calling
// professional. Used by the coach nutrition list to select a patient
// when creating a new plan.
export function PatientPickerDialog({ open, onOpenChange, onPick }: Props) {
  const [q, setQ] = React.useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["clients", "picker", q] as const,
    enabled: open,
    queryFn: async (): Promise<{ items: ClientRow[] }> => {
      const params = new URLSearchParams();
      params.set("status", "ACTIVE");
      params.set("perPage", "20");
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/clients?${params}`);
      if (!res.ok) throw new Error(await readApiError(res, "Errore caricamento"));
      return res.json();
    },
  });

  const items = data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Seleziona un paziente</DialogTitle>
          <DialogDescription>
            Il piano sarà associato al paziente scelto.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Cerca per nome o email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Nessun paziente trovato.
            </p>
          ) : (
            <ul className="divide-border flex flex-col divide-y">
              {items.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {row.patient.fullName}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {row.patient.email}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onPick({
                        id: row.patient.id,
                        fullName: row.patient.fullName,
                      });
                      onOpenChange(false);
                    }}
                  >
                    Seleziona
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
