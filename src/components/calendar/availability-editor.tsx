"use client";

import * as React from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import {
  useAvailabilitySlots,
  useCreateAvailabilitySlot,
  useDeleteAvailabilitySlot,
} from "@/lib/hooks/use-availability";

const DOW_LABELS = [
  { value: "1", label: "Lunedì" },
  { value: "2", label: "Martedì" },
  { value: "3", label: "Mercoledì" },
  { value: "4", label: "Giovedì" },
  { value: "5", label: "Venerdì" },
  { value: "6", label: "Sabato" },
  { value: "0", label: "Domenica" },
];

type Mode = "RECURRING" | "ONE_OFF";

/**
 * Manage the current professional's AvailabilitySlot rows (recurring
 * weekday windows and one-off exceptions). The backing API restricts
 * writes to the owner professional.
 */
export function AvailabilityEditor() {
  const { data = [], isLoading } = useAvailabilitySlots();
  const create = useCreateAvailabilitySlot();
  const del = useDeleteAvailabilitySlot();

  const [mode, setMode] = React.useState<Mode>("RECURRING");
  const [dayOfWeek, setDayOfWeek] = React.useState<string>("1");
  const [date, setDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("13:00");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync(
        mode === "RECURRING"
          ? { dayOfWeek: Number(dayOfWeek), startTime, endTime }
          : { date, startTime, endTime },
      );
      toast.success("Slot creato");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo slot?")) return;
    try {
      await del.mutateAsync(id);
      toast.success("Slot eliminato");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  const recurring = data.filter((s) => s.isRecurring);
  const oneOff = data.filter((s) => !s.isRecurring);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aggiungi slot</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("RECURRING")}
                className={`rounded-md border px-3 py-1 text-xs font-medium ${
                  mode === "RECURRING"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 text-muted-foreground border-border"
                }`}
              >
                Ricorrente
              </button>
              <button
                type="button"
                onClick={() => setMode("ONE_OFF")}
                className={`rounded-md border px-3 py-1 text-xs font-medium ${
                  mode === "ONE_OFF"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 text-muted-foreground border-border"
                }`}
              >
                Una tantum
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {mode === "RECURRING" ? (
                <div className="flex flex-col gap-1.5">
                  <Label>Giorno della settimana</Label>
                  <Select
                    value={dayOfWeek}
                    onValueChange={(v) => setDayOfWeek(v ?? "1")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOW_LABELS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="one-off-date">Data</Label>
                  <Input
                    id="one-off-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="start">Inizio</Label>
                <Input
                  id="start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="end">Fine</Label>
                <Input
                  id="end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Aggiungi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Slot ricorrenti
            <span className="text-muted-foreground ml-2 text-xs font-normal">
              ({recurring.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-muted-foreground flex h-20 items-center justify-center text-sm">
              Caricamento…
            </div>
          ) : recurring.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">
              Nessuno slot ricorrente configurato
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {recurring.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 px-4 py-2 text-sm"
                >
                  <span className="font-medium">
                    {DOW_LABELS.find((d) => d.value === String(s.dayOfWeek))
                      ?.label ?? "—"}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {s.startTime}–{s.endTime}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    disabled={del.isPending}
                    className="text-destructive hover:bg-destructive/10 ml-auto inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs"
                  >
                    <Trash2 className="h-3 w-3" />
                    Elimina
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {oneOff.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Eccezioni una tantum
              <span className="text-muted-foreground ml-2 text-xs font-normal">
                ({oneOff.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {oneOff.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 px-4 py-2 text-sm"
                >
                  <span className="font-medium">{s.date}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {s.startTime}–{s.endTime}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    disabled={del.isPending}
                    className="text-destructive hover:bg-destructive/10 ml-auto inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs"
                  >
                    <Trash2 className="h-3 w-3" />
                    Elimina
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
