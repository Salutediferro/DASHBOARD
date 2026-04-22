"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DayOfWeek } from "@prisma/client";
import {
  Archive,
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  Loader2,
  Pencil,
  Pill,
  Plus,
  Trash2,
  X,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ensureNotificationPermission,
  useTherapyReminders,
} from "@/lib/hooks/use-therapy-reminders";

type TherapySelfItem = {
  id: string;
  name: string;
  dose: string | null;
  frequency: string | null;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  reminderTime: string | null;
  reminderEnabled: boolean;
  daysOfWeek: DayOfWeek[];
  createdAt: string;
};

type TherapyIntakeItem = {
  id: string;
  itemId: string;
  date: string;
  taken: boolean;
};

type FormState = {
  name: string;
  dose: string;
  frequency: string;
  notes: string;
  startDate: string;
  endDate: string;
  reminderEnabled: boolean;
  reminderTime: string;
  daysOfWeek: DayOfWeek[];
};

const EMPTY_FORM: FormState = {
  name: "",
  dose: "",
  frequency: "",
  notes: "",
  startDate: "",
  endDate: "",
  reminderEnabled: false,
  reminderTime: "",
  daysOfWeek: [],
};

const QUERY_KEY = ["therapy", "SELF"] as const;
const INTAKE_KEY = ["therapy", "intake", "today"] as const;

const WEEKDAYS: { day: DayOfWeek; label: string; short: string }[] = [
  { day: "MON", label: "Lunedì", short: "Lun" },
  { day: "TUE", label: "Martedì", short: "Mar" },
  { day: "WED", label: "Mercoledì", short: "Mer" },
  { day: "THU", label: "Giovedì", short: "Gio" },
  { day: "FRI", label: "Venerdì", short: "Ven" },
  { day: "SAT", label: "Sabato", short: "Sab" },
  { day: "SUN", label: "Domenica", short: "Dom" },
];

// JS getDay(): 0=Sun..6=Sat → our DayOfWeek enum.
const WEEKDAY_AT: Record<number, DayOfWeek> = {
  0: "SUN",
  1: "MON",
  2: "TUE",
  3: "WED",
  4: "THU",
  5: "FRI",
  6: "SAT",
};

function todayWeekday(): DayOfWeek {
  return WEEKDAY_AT[new Date().getDay()];
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function isScheduledToday(item: TherapySelfItem): boolean {
  if (!item.daysOfWeek || item.daysOfWeek.length === 0) return true;
  return item.daysOfWeek.includes(todayWeekday());
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // reminderTime is stored as UTC wall-clock by the server (see
  // parseHHMM in src/lib/services/therapy.ts); read it back with the
  // UTC accessors so CEST users don't see "01:00" instead of "23:00".
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function PatientSupplementiPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);

  const { data, isLoading } = useQuery<{ items: TherapySelfItem[] }>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/therapy?kind=SELF");
      if (!res.ok) throw new Error("Errore caricamento");
      return res.json();
    },
  });

  const intakeToday = useQuery<{ items: TherapyIntakeItem[] }>({
    queryKey: INTAKE_KEY,
    queryFn: async () => {
      const d = todayIsoDate();
      const res = await fetch(`/api/therapy/intake?from=${d}&to=${d}`);
      if (!res.ok) throw new Error("Errore caricamento");
      return res.json();
    },
  });

  // Arm the client-side reminder scheduler for every active SELF item
  // with a reminder enabled. Delivery falls back to a toast if the
  // browser notification permission is not granted.
  useTherapyReminders(data?.items ?? []);

  const bodyFrom = (f: FormState) => ({
    name: f.name.trim(),
    dose: f.dose.trim() || null,
    frequency: f.frequency.trim() || null,
    notes: f.notes.trim() || null,
    startDate: f.startDate || null,
    endDate: f.endDate || null,
    reminderEnabled: f.reminderEnabled && !!f.reminderTime,
    reminderTime: f.reminderTime || null,
    daysOfWeek: f.daysOfWeek,
  });

  const createMutation = useMutation({
    mutationFn: async (f: FormState) => {
      const res = await fetch("/api/therapy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "SELF", ...bodyFrom(f) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Errore");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Supplemento aggiunto");
      resetForm();
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, f }: { id: string; f: FormState }) => {
      const res = await fetch(`/api/therapy/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyFrom(f)),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Errore");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Supplemento aggiornato");
      resetForm();
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const intakeMutation = useMutation({
    mutationFn: async (args: { itemId: string; taken: boolean }) => {
      const res = await fetch("/api/therapy/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: args.itemId,
          date: todayIsoDate(),
          taken: args.taken,
        }),
      });
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
    onMutate: async ({ itemId, taken }) => {
      await qc.cancelQueries({ queryKey: INTAKE_KEY });
      const prev = qc.getQueryData<{ items: TherapyIntakeItem[] }>(INTAKE_KEY);
      qc.setQueryData<{ items: TherapyIntakeItem[] }>(INTAKE_KEY, (old) => {
        const existing = old?.items ?? [];
        const others = existing.filter((i) => i.itemId !== itemId);
        return {
          items: [
            ...others,
            {
              id: `optimistic-${itemId}`,
              itemId,
              date: todayIsoDate(),
              taken,
            },
          ],
        };
      });
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(INTAKE_KEY, ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: INTAKE_KEY, refetchType: "none" });
    },
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
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueryData<{ items: TherapySelfItem[] }>(QUERY_KEY);
      qc.setQueryData<{ items: TherapySelfItem[] }>(QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          items: old.items.map((m) => (m.id === id ? { ...m, active } : m)),
        };
      });
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(QUERY_KEY, ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY, refetchType: "none" });
    },
  });

  const reminderMutation = useMutation({
    mutationFn: async (args: {
      id: string;
      reminderEnabled: boolean;
      reminderTime: string | null;
    }) => {
      const res = await fetch(`/api/therapy/${args.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminderEnabled: args.reminderEnabled,
          reminderTime: args.reminderTime,
        }),
      });
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/therapy/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueryData<{ items: TherapySelfItem[] }>(QUERY_KEY);
      qc.setQueryData<{ items: TherapySelfItem[] }>(QUERY_KEY, (old) => {
        if (!old) return old;
        return { items: old.items.filter((m) => m.id !== id) };
      });
      return { prev };
    },
    onSuccess: () => toast.success("Supplemento rimosso"),
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(QUERY_KEY, ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY, refetchType: "none" });
    },
  });

  const items = data?.items ?? [];
  const active = items.filter((m) => m.active);
  const archived = items.filter((m) => !m.active);
  const dueToday = active.filter(isScheduledToday);
  const intakeByItem = React.useMemo(() => {
    const map = new Map<string, TherapyIntakeItem>();
    for (const i of intakeToday.data?.items ?? []) map.set(i.itemId, i);
    return map;
  }, [intakeToday.data?.items]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setShowForm(false);
    setEditingId(null);
  }

  function startEdit(m: TherapySelfItem) {
    setEditingId(m.id);
    setForm({
      name: m.name,
      dose: m.dose ?? "",
      frequency: m.frequency ?? "",
      notes: m.notes ?? "",
      startDate: m.startDate ? m.startDate.slice(0, 10) : "",
      endDate: m.endDate ? m.endDate.slice(0, 10) : "",
      reminderEnabled: m.reminderEnabled,
      reminderTime: fmtTime(m.reminderTime) ?? "",
      daysOfWeek: m.daysOfWeek ?? [],
    });
    setShowForm(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function submit() {
    if (!form.name.trim()) {
      toast.error("Nome del supplemento obbligatorio");
      return;
    }
    if (form.reminderEnabled && !form.reminderTime) {
      toast.error("Imposta un orario per il promemoria");
      return;
    }
    if (form.reminderEnabled) {
      // Prompt for notification permission up-front so the user
      // doesn't have to wait for the first fire to see the OS dialog.
      const granted = await ensureNotificationPermission();
      if (!granted) {
        toast.message(
          "Notifiche browser non attive — vedrai il promemoria come avviso in-app finché la pagina è aperta.",
        );
      }
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, f: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Supplementi in corso
          </h1>
          <p className="text-muted-foreground text-sm">
            Supplementi che assumi regolarmente, dosaggi e durata.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditingId(null);
            setForm(EMPTY_FORM);
            setShowForm((v) => !v);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi supplemento
        </Button>
      </header>

      {dueToday.length > 0 && (
        <TodayCheckCard
          meds={dueToday}
          intakeByItem={intakeByItem}
          loading={intakeToday.isLoading}
          onMark={(itemId, taken) =>
            intakeMutation.mutate({ itemId, taken })
          }
        />
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Modifica supplemento" : "Nuovo supplemento"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Es. Melatonina"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dose">Dose</Label>
                <Input
                  id="dose"
                  placeholder="Es. 1 mg"
                  value={form.dose}
                  onChange={(e) => setForm({ ...form, dose: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label htmlFor="frequency">Frequenza (nota)</Label>
                <Input
                  id="frequency"
                  placeholder="Es. 1 volta al giorno la sera"
                  value={form.frequency}
                  onChange={(e) =>
                    setForm({ ...form, frequency: e.target.value })
                  }
                />
              </div>

              <div className="md:col-span-2">
                <Label className="mb-1.5 block">Giorni di assunzione</Label>
                <DaySelector
                  value={form.daysOfWeek}
                  onChange={(next) => setForm({ ...form, daysOfWeek: next })}
                />
                <p className="text-muted-foreground mt-1.5 text-xs">
                  Se non selezioni nessun giorno il supplemento vale per ogni
                  giorno della settimana.
                </p>
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
                  rows={2}
                  placeholder="Istruzioni, prescrittore, motivo..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="bg-muted/40 flex flex-col gap-3 rounded-md border p-3 md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <Bell className="text-muted-foreground mt-0.5 h-4 w-4" />
                    <div>
                      <p className="text-sm font-medium">Promemoria giornaliero</p>
                      <p className="text-muted-foreground text-xs">
                        Riceverai una notifica all&apos;orario impostato ogni
                        giorno mentre la pagina è aperta.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.reminderEnabled}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, reminderEnabled: checked })
                    }
                  />
                </div>
                {form.reminderEnabled && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="reminderTime" className="text-xs">
                      Orario
                    </Label>
                    <Input
                      id="reminderTime"
                      type="time"
                      value={form.reminderTime}
                      onChange={(e) =>
                        setForm({ ...form, reminderTime: e.target.value })
                      }
                      className="w-36"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={saving}
              >
                Annulla
              </Button>
              <Button type="button" onClick={submit} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Aggiorna" : "Salva"}
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
            <Pill className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">
              Nessun supplemento registrato.
            </p>
            <Button type="button" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi il primo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <MedSection
            title="In corso"
            empty="Nessun supplemento attivo."
            meds={active}
            onEdit={startEdit}
            onToggleActive={(id, a) =>
              toggleMutation.mutate({ id, active: a })
            }
            onToggleReminder={async (item, enabled) => {
              if (enabled && !item.reminderTime) {
                toast.error(
                  "Imposta prima l'orario modificando il supplemento",
                );
                return;
              }
              if (enabled) await ensureNotificationPermission();
              reminderMutation.mutate({
                id: item.id,
                reminderEnabled: enabled,
                reminderTime: item.reminderTime,
              });
            }}
            onDelete={(id) => {
              if (confirm("Rimuovere definitivamente questo supplemento?")) {
                deleteMutation.mutate(id);
              }
            }}
          />
          {archived.length > 0 && (
            <MedSection
              title="Archivio"
              empty=""
              meds={archived}
              onEdit={startEdit}
              onToggleActive={(id, a) =>
                toggleMutation.mutate({ id, active: a })
              }
              onToggleReminder={() => {
                /* archived items cannot ring */
              }}
              onDelete={(id) => {
                if (confirm("Rimuovere definitivamente questo supplemento?")) {
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

function DaySelector({
  value,
  onChange,
}: {
  value: DayOfWeek[];
  onChange: (next: DayOfWeek[]) => void;
}) {
  const set = new Set(value);
  const toggle = (d: DayOfWeek) => {
    const next = new Set(set);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    onChange(WEEKDAYS.map((w) => w.day).filter((d) => next.has(d)));
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {WEEKDAYS.map((w) => {
        const active = set.has(w.day);
        return (
          <button
            key={w.day}
            type="button"
            onClick={() => toggle(w.day)}
            aria-pressed={active}
            aria-label={w.label}
            className={cn(
              "focus-ring inline-flex h-9 min-w-[3rem] items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            {w.short}
          </button>
        );
      })}
    </div>
  );
}

function TodayCheckCard({
  meds,
  intakeByItem,
  loading,
  onMark,
}: {
  meds: TherapySelfItem[];
  intakeByItem: Map<string, TherapyIntakeItem>;
  loading: boolean;
  onMark: (itemId: string, taken: boolean) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Oggi</CardTitle>
        <p className="text-muted-foreground text-xs">
          Segna i supplementi che hai assunto oggi. Lo storico resta nel tuo
          diario.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex h-20 items-center justify-center">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : (
          <ul className="divide-border divide-y">
            {meds.map((m) => {
              const intake = intakeByItem.get(m.id);
              const state: "taken" | "skipped" | "pending" = intake
                ? intake.taken
                  ? "taken"
                  : "skipped"
                : "pending";
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
                    <Pill className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{m.name}</p>
                    {m.dose && (
                      <p className="text-muted-foreground text-xs">
                        {m.dose}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onMark(m.id, true)}
                      className={cn(
                        "focus-ring inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs transition-colors",
                        state === "taken"
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-input bg-background text-muted-foreground hover:bg-muted",
                      )}
                      aria-pressed={state === "taken"}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Assunto
                    </button>
                    <button
                      type="button"
                      onClick={() => onMark(m.id, false)}
                      className={cn(
                        "focus-ring inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs transition-colors",
                        state === "skipped"
                          ? "border-destructive bg-destructive text-destructive-foreground"
                          : "border-input bg-background text-muted-foreground hover:bg-muted",
                      )}
                      aria-pressed={state === "skipped"}
                    >
                      <X className="h-3.5 w-3.5" />
                      Non assunto
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function MedSection({
  title,
  empty,
  meds,
  onEdit,
  onToggleActive,
  onToggleReminder,
  onDelete,
}: {
  title: string;
  empty: string;
  meds: TherapySelfItem[];
  onEdit: (item: TherapySelfItem) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onToggleReminder: (item: TherapySelfItem, enabled: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {meds.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">{empty}</p>
        ) : (
          <ul className="divide-border divide-y">
            {meds.map((m) => {
              const time = fmtTime(m.reminderTime);
              return (
                <li
                  key={m.id}
                  className={cn(
                    "flex flex-wrap items-start gap-3 px-4 py-3",
                    !m.active && "opacity-70",
                  )}
                >
                  <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
                    <Pill className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{m.name}</p>
                      {m.dose && (
                        <Badge variant="outline" className="text-[10px]">
                          {m.dose}
                        </Badge>
                      )}
                      {!m.active && (
                        <Badge variant="secondary" className="text-[10px]">
                          Archiviato
                        </Badge>
                      )}
                      {m.active && m.reminderEnabled && time && (
                        <Badge className="gap-1 text-[10px]">
                          <Bell className="h-3 w-3" />
                          {time}
                        </Badge>
                      )}
                    </div>
                    {m.frequency && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {m.frequency}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {(m.daysOfWeek?.length ?? 0) === 0 ? (
                        <Badge variant="outline" className="text-[10px]">
                          Ogni giorno
                        </Badge>
                      ) : (
                        WEEKDAYS.filter((w) =>
                          m.daysOfWeek.includes(w.day),
                        ).map((w) => (
                          <Badge
                            key={w.day}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {w.short}
                          </Badge>
                        ))
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      Dal {fmtDate(m.startDate)}
                      {m.endDate && ` al ${fmtDate(m.endDate)}`}
                    </p>
                    {m.notes && (
                      <p className="mt-1 text-xs whitespace-pre-wrap">
                        {m.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {m.active && time && (
                      <button
                        type="button"
                        onClick={() => onToggleReminder(m, !m.reminderEnabled)}
                        className="hover:bg-muted text-muted-foreground inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs"
                        aria-label={
                          m.reminderEnabled
                            ? "Disattiva promemoria"
                            : "Attiva promemoria"
                        }
                        title={
                          m.reminderEnabled
                            ? "Disattiva promemoria"
                            : "Attiva promemoria"
                        }
                      >
                        {m.reminderEnabled ? (
                          <Bell className="h-3.5 w-3.5" />
                        ) : (
                          <BellOff className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEdit(m)}
                      className="hover:bg-muted text-muted-foreground inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs"
                      aria-label="Modifica"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Modifica
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleActive(m.id, !m.active)}
                      className="hover:bg-muted text-muted-foreground inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs"
                      aria-label={m.active ? "Archivia" : "Riattiva"}
                    >
                      {m.active ? (
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
                      onClick={() => onDelete(m.id)}
                      className="text-destructive hover:bg-destructive/10 inline-flex h-8 items-center rounded-md px-2"
                      aria-label="Elimina"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
