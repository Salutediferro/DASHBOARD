"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClientListItem } from "@/lib/mock-clients";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
};

export function AssignDialog({ open, onOpenChange, templateId }: Props) {
  const { data: clientsData } = useQuery<{ items: ClientListItem[]; total: number }>({
    queryKey: ["clients-for-assign"],
    queryFn: async () => {
      const res = await fetch("/api/clients?status=ACTIVE&perPage=100");
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: open,
  });

  const [clientId, setClientId] = React.useState("");
  const [startDate, setStartDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  );
  const [durationWeeks, setDurationWeeks] = React.useState(4);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit() {
    if (!clientId) {
      toast.error("Seleziona un cliente");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/workouts/${templateId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, startDate, durationWeeks }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Errore assegnazione");
      return;
    }
    toast.success("Scheda assegnata");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assegna scheda a cliente</DialogTitle>
          <DialogDescription>
            Una copia personalizzabile verrà creata per il cliente
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={(v) => setClientId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona cliente..." />
              </SelectTrigger>
              <SelectContent>
                {(clientsData?.items ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Data inizio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="durationWeeks">Durata (settimane)</Label>
              <Input
                id="durationWeeks"
                type="number"
                min={1}
                max={52}
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center rounded-md px-4 text-sm font-medium disabled:opacity-50"
          >
            Assegna
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
