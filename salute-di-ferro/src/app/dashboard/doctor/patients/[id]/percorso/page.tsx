"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  Stethoscope,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type PrescribedItem = {
  id: string;
  name: string;
  dose: string | null;
  frequency: string | null;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
};

type FormState = {
  name: string;
  dose: string;
  frequency: string;
  notes: string;
  startDate: string;
  endDate: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  dose: "",
  frequency: "",
  notes: "",
  startDate: "",
  endDate: "",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DoctorPatientPercorsoPage() {
  const params = useParams<{ id: string }>();
  const patientId = params.id;
  const qc = useQueryClient();

  const queryKey = React.useMemo(
    () => ["therapy", "PRESCRIBED", patientId] as const,
    [patientId],
  );

  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);

  const { data, isLoading } = useQuery<{ items: PrescribedItem[] }>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(
        `/api/therapy?kind=PRESCRIBED&patientId=${patientId}`,
      );
      if (!res.ok) throw new Error("Errore caricamento");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (f: FormState) => {
      const res = await fetch("/api/therapy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "PRESCRIBED",
          patientId,
          name: f.name.trim(),
          dose: f.dose.trim() || null,
          frequency: f.frequency.trim() || null,
          notes: f.notes.trim() || null,
          startDate: f.startDate || null,
          endDate: f.endDate || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.error === "string" ? err.error : "Errore",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Indicazione aggiunta");
      setForm(EMPTY_FORM);
      setShowForm(false);
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/therapy/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
    onMutate: async ({ id, active }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<{ items: PrescribedItem[] }>(queryKey);
      qc.setQueryData<{ items: PrescribedItem[] }>(queryKey, (old) => {
        if (!old) return old;
        return {
          items: old.items.map((m) => (m.id === id ? { ...m, active } : m)),
        };
      });
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/therapy/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<{ items: PrescribedItem[] }>(queryKey);
      qc.setQueryData<{ items: PrescribedItem[] }>(queryKey, (old) => {
        if (!old) return old;
        return { items: old.items.filter((m) => m.id !== id) };
      });
      return { prev };
    },
    onSuccess: () => toast.success("Indicazione rimossa"),
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });

  const items = data?.items ?? [];
  const active = items.filter((m) => m.active);
  const archived = items.filter((m) => !m.active);

  function submit() {
    if (!form.name.trim()) {
      toast.error("Nome obbligatorio");
      return;
    }
    createMutation.mutate(form);
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/dashboard/doctor/patients/${patientId}`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Scheda cliente
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Percorso
          </h1>
          <p className="text-muted-foreground text-sm">
            Indicazioni che il cliente vedrà nel suo percorso.
          </p>
        </div>
        <Button type="button" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi indicazione
        </Button>
      </header>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuova indicazione</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Es. Ramipril"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dose">Dose</Label>
                <Input
                  id="dose"
                  placeholder="Es. 5 mg"
                  value={form.dose}
                  onChange={(e) => setForm({ ...form, dose: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label htmlFor="frequency">Frequenza</Label>
                <Input
                  id="frequency"
                  placeholder="Es. 1 volta al giorno dopo colazione"
                  value={form.frequency}
                  onChange={(e) =>
                    setForm({ ...form, frequency: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="startDate">Inizio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="endDate">Fine (opzionale)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label htmlFor="notes">Note</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  placeholder="Istruzioni, motivazione, interazioni..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                }}
                disabled={createMutation.isPending}
              >
                Annulla
              </Button>
              <Button
                type="button"
                onClick={submit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salva
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Stethoscope className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">
              Nessuna indicazione registrata per questo cliente.
            </p>
            <Button type="button" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi la prima
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <PercorsoSection
            title="In corso"
            empty="Nessuna indicazione attiva."
            items={active}
            onToggle={(id, a) => toggleMutation.mutate({ id, active: a })}
            onDelete={(id) => {
              if (confirm("Rimuovere definitivamente questa indicazione?")) {
                deleteMutation.mutate(id);
              }
            }}
          />
          {archived.length > 0 && (
            <PercorsoSection
              title="Archivio"
              empty=""
              items={archived}
              onToggle={(id, a) => toggleMutation.mutate({ id, active: a })}
              onDelete={(id) => {
                if (confirm("Rimuovere definitivamente questa indicazione?")) {
                  deleteMutation.mutate(id);
                }
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function PercorsoSection({
  title,
  empty,
  items,
  onToggle,
  onDelete,
}: {
  title: string;
  empty: string;
  items: PrescribedItem[];
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">{empty}</p>
        ) : (
          <ul className="divide-border divide-y">
            {items.map((i) => (
              <li
                key={i.id}
                className={cn(
                  "flex flex-wrap items-start gap-3 px-4 py-3",
                  !i.active && "opacity-70",
                )}
              >
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{i.name}</p>
                    {i.dose && (
                      <Badge variant="outline" className="text-[10px]">
                        {i.dose}
                      </Badge>
                    )}
                    {!i.active && (
                      <Badge variant="secondary" className="text-[10px]">
                        Archiviato
                      </Badge>
                    )}
                  </div>
                  {i.frequency && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {i.frequency}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Dal {fmtDate(i.startDate)}
                    {i.endDate && ` al ${fmtDate(i.endDate)}`}
                  </p>
                  {i.notes && (
                    <p className="mt-1 text-xs whitespace-pre-wrap">
                      {i.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onToggle(i.id, !i.active)}
                    className="hover:bg-muted text-muted-foreground inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs"
                    aria-label={i.active ? "Archivia" : "Riattiva"}
                  >
                    {i.active ? (
                      <>
                        <Archive className="h-3.5 w-3.5" />
                        Archivia
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Riattiva
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(i.id)}
                    className="text-destructive hover:bg-destructive/10 inline-flex h-8 items-center rounded-md px-2"
                    aria-label="Elimina"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
