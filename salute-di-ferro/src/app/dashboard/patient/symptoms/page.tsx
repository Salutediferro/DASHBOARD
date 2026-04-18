"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Battery,
  Loader2,
  Moon,
  NotebookPen,
  Plus,
  Smile,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

type SymptomLog = {
  id: string;
  date: string;
  mood: number | null;
  energy: number | null;
  sleepQuality: number | null;
  symptoms: string[];
  notes: string | null;
};

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
}

const QUICK_SYMPTOMS = [
  "Mal di testa",
  "Nausea",
  "Stanchezza",
  "Ansia",
  "Dolori muscolari",
  "Reflusso",
  "Insonnia",
  "Tosse",
  "Febbre",
];

type RatingProps = {
  label: string;
  icon: React.ReactNode;
  value: number | null;
  onChange: (n: number | null) => void;
};

function RatingRow({ label, icon, value, onChange }: RatingProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            aria-label={`${label} ${n}`}
            className={cn(
              "border-border hover:bg-muted h-10 w-10 rounded-md border text-sm font-semibold",
              value === n && "bg-primary text-primary-foreground border-primary",
            )}
          >
            {n}
          </button>
        ))}
        {value != null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-foreground ml-1 text-xs"
            aria-label="Azzera"
          >
            Azzera
          </button>
        )}
      </div>
    </div>
  );
}

export default function PatientSymptomsPage() {
  const qc = useQueryClient();
  const [date, setDate] = React.useState(todayIso());
  const [mood, setMood] = React.useState<number | null>(null);
  const [energy, setEnergy] = React.useState<number | null>(null);
  const [sleepQuality, setSleepQuality] = React.useState<number | null>(null);
  const [symptoms, setSymptoms] = React.useState<string[]>([]);
  const [symptomInput, setSymptomInput] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const { data, isLoading } = useQuery<{ items: SymptomLog[] }>({
    queryKey: ["symptom-logs"],
    queryFn: async () => {
      const res = await fetch("/api/symptom-logs");
      if (!res.ok) throw new Error("Errore caricamento");
      return res.json();
    },
  });

  const items = React.useMemo(() => data?.items ?? [], [data]);
  const entryForDate = React.useMemo(
    () => items.find((i) => dayKey(i.date) === date),
    [items, date],
  );

  // Hydrate form when switching to a date that already has an entry.
  React.useEffect(() => {
    if (entryForDate) {
      setMood(entryForDate.mood);
      setEnergy(entryForDate.energy);
      setSleepQuality(entryForDate.sleepQuality);
      setSymptoms(entryForDate.symptoms);
      setNotes(entryForDate.notes ?? "");
    } else {
      setMood(null);
      setEnergy(null);
      setSleepQuality(null);
      setSymptoms([]);
      setNotes("");
    }
  }, [entryForDate]);

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/symptom-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          mood,
          energy,
          sleepQuality,
          symptoms,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Errore");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(entryForDate ? "Diario aggiornato" : "Diario salvato");
      qc.invalidateQueries({ queryKey: ["symptom-logs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function addSymptomFromInput() {
    const v = symptomInput.trim();
    if (!v) return;
    if (!symptoms.includes(v)) setSymptoms([...symptoms, v]);
    setSymptomInput("");
  }

  function toggleQuick(s: string) {
    setSymptoms(
      symptoms.includes(s) ? symptoms.filter((x) => x !== s) : [...symptoms, s],
    );
  }

  const history = items.filter((i) => dayKey(i.date) !== date).slice(0, 30);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Diario salute
        </h1>
        <p className="text-muted-foreground text-sm">
          Annota umore, energia, sonno e sintomi. Ti aiuta a riconoscere
          schemi e a informare il tuo medico.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {date === todayIso() ? "Oggi" : fmtDay(date)}
          </CardTitle>
          <Input
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 w-auto"
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <RatingRow
              label="Umore"
              icon={<Smile className="h-3.5 w-3.5" />}
              value={mood}
              onChange={setMood}
            />
            <RatingRow
              label="Energia"
              icon={<Battery className="h-3.5 w-3.5" />}
              value={energy}
              onChange={setEnergy}
            />
            <RatingRow
              label="Sonno"
              icon={<Moon className="h-3.5 w-3.5" />}
              value={sleepQuality}
              onChange={setSleepQuality}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Sintomi</Label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SYMPTOMS.map((s) => {
                const active = symptoms.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleQuick(s)}
                    className={cn(
                      "border-border hover:bg-muted h-7 rounded-full border px-3 text-[11px] font-medium",
                      active && "bg-primary/10 border-primary/40",
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Aggiungi un sintomo personalizzato"
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSymptomFromInput();
                  }
                }}
              />
              <button
                type="button"
                onClick={addSymptomFromInput}
                disabled={!symptomInput.trim()}
                className="border-border hover:bg-muted h-10 rounded-md border px-3 text-xs font-medium disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {symptoms.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {symptoms.map((s) => (
                  <Badge
                    key={s}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() =>
                        setSymptoms(symptoms.filter((x) => x !== s))
                      }
                      className="hover:text-destructive"
                      aria-label={`Rimuovi ${s}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Dettagli, contesto, cosa hai mangiato..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium disabled:opacity-50"
            >
              {submit.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {entryForDate ? "Aggiorna diario" : "Salva diario"}
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Storico</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <NotebookPen className="text-muted-foreground h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                Niente ancora. Inizia col diario di oggi.
              </p>
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="hover:bg-muted/40 flex flex-col gap-1 px-4 py-3 text-sm"
                  onClick={() => setDate(dayKey(h.date))}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setDate(dayKey(h.date));
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium">{fmtDay(h.date)}</span>
                    {h.mood != null && (
                      <span className="text-muted-foreground">
                        Umore {h.mood}/5
                      </span>
                    )}
                    {h.energy != null && (
                      <span className="text-muted-foreground">
                        Energia {h.energy}/5
                      </span>
                    )}
                    {h.sleepQuality != null && (
                      <span className="text-muted-foreground">
                        Sonno {h.sleepQuality}/5
                      </span>
                    )}
                  </div>
                  {h.symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {h.symptoms.slice(0, 6).map((s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {h.notes && (
                    <p className="text-muted-foreground line-clamp-2 text-xs whitespace-pre-wrap">
                      {h.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
