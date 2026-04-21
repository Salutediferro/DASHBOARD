"use client";

import * as React from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addDays, format, isSameDay } from "date-fns";
import { it } from "date-fns/locale";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  useAvailabilitySlots,
  useCreateAvailabilitySlot,
  useDeleteAvailabilitySlot,
  type AvailabilitySlotDTO,
} from "@/lib/hooks/use-availability";

const DOW: Array<{ value: number; label: string; short: string }> = [
  { value: 1, label: "Lunedì", short: "Lun" },
  { value: 2, label: "Martedì", short: "Mar" },
  { value: 3, label: "Mercoledì", short: "Mer" },
  { value: 4, label: "Giovedì", short: "Gio" },
  { value: 5, label: "Venerdì", short: "Ven" },
  { value: 6, label: "Sabato", short: "Sab" },
  { value: 0, label: "Domenica", short: "Dom" },
];

export function AvailabilityEditor() {
  const { data: slots = [], isLoading } = useAvailabilitySlots();

  const recurring = slots.filter((s) => s.isRecurring);
  const oneOff = slots
    .filter((s) => !s.isRecurring)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="recurring">
        <TabsList className="grid w-full grid-cols-2 md:w-auto">
          <TabsTrigger value="recurring">Ricorrente</TabsTrigger>
          <TabsTrigger value="one-off">Date specifiche</TabsTrigger>
        </TabsList>

        <TabsContent value="recurring" className="mt-4">
          <RecurringEditor loading={isLoading} slots={recurring} />
        </TabsContent>

        <TabsContent value="one-off" className="mt-4">
          <OneOffEditor loading={isLoading} slots={oneOff} />
        </TabsContent>
      </Tabs>

      <UpcomingPreview slots={slots} />
    </div>
  );
}

// ── Recurring editor ───────────────────────────────────────────────────

function RecurringEditor({
  loading,
  slots,
}: {
  loading: boolean;
  slots: AvailabilitySlotDTO[];
}) {
  const byDay = React.useMemo(() => {
    const map = new Map<number, AvailabilitySlotDTO[]>();
    for (const s of slots) {
      if (s.dayOfWeek == null) continue;
      const list = map.get(s.dayOfWeek) ?? [];
      list.push(s);
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
      map.set(s.dayOfWeek, list);
    }
    return map;
  }, [slots]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Imposta le fasce orarie settimanali: si ripetono ogni settimana.
      </p>
      {DOW.map((d) => (
        <RecurringRow key={d.value} day={d} ranges={byDay.get(d.value) ?? []} loading={loading} />
      ))}
    </div>
  );
}

function RecurringRow({
  day,
  ranges,
  loading,
}: {
  day: { value: number; label: string };
  ranges: AvailabilitySlotDTO[];
  loading?: boolean;
}) {
  const create = useCreateAvailabilitySlot();
  const del = useDeleteAvailabilitySlot();

  const [adding, setAdding] = React.useState(false);
  const [start, setStart] = React.useState("09:00");
  const [end, setEnd] = React.useState("13:00");

  const enabled = ranges.length > 0;

  async function handleAdd() {
    try {
      await create.mutateAsync({
        dayOfWeek: day.value,
        startTime: start,
        endTime: end,
      });
      toast.success("Fascia aggiunta");
      setAdding(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Rimuovere questa fascia? I clienti non potranno più prenotare in questo intervallo.")) return;
    try {
      await del.mutateAsync(id);
      toast.success("Fascia rimossa");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  return (
    <div
      className={cn(
        "surface-1 flex flex-col gap-2 rounded-xl p-3",
        !enabled && "opacity-70",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "h-2 w-2 rounded-full",
            enabled ? "bg-primary-500" : "bg-border",
          )}
        />
        <h4 className="text-sm font-medium">{day.label}</h4>
        <span className="text-[11px] text-muted-foreground">
          {enabled
            ? `${ranges.length} fasci${ranges.length === 1 ? "a" : "e"}`
            : "non attivo"}
        </span>
        <button
          type="button"
          disabled={loading}
          onClick={() => setAdding((v) => !v)}
          className="focus-ring ml-auto inline-flex h-7 items-center gap-1 rounded-md border border-border/60 bg-card px-2 text-xs font-medium transition-colors hover:bg-muted"
        >
          <Plus className="h-3 w-3" aria-hidden />
          Aggiungi fascia
        </button>
      </div>

      {ranges.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {ranges.map((r) => (
            <li
              key={r.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 px-2 py-0.5 text-xs text-primary-500"
            >
              <span className="tabular-nums">
                {r.startTime}–{r.endTime}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(r.id)}
                aria-label={`Rimuovi fascia ${r.startTime}–${r.endTime}`}
                className="focus-ring inline-flex h-4 w-4 items-center justify-center rounded-full text-primary-500/70 transition-colors hover:bg-primary-500/20 hover:text-primary-500"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className="flex flex-wrap items-end gap-2 rounded-md border border-border/60 bg-muted/30 p-2">
          <div className="grid gap-1">
            <Label htmlFor={`start-${day.value}`} className="text-[11px]">
              Inizio
            </Label>
            <Input
              id={`start-${day.value}`}
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="focus-ring h-8 w-28"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`end-${day.value}`} className="text-[11px]">
              Fine
            </Label>
            <Input
              id={`end-${day.value}`}
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="focus-ring h-8 w-28"
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={create.isPending}
          >
            {create.isPending && (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />
            )}
            Salva
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAdding(false)}
          >
            Annulla
          </Button>
        </div>
      )}
    </div>
  );
}

// ── One-off editor ─────────────────────────────────────────────────────

function OneOffEditor({
  loading,
  slots,
}: {
  loading: boolean;
  slots: AvailabilitySlotDTO[];
}) {
  const create = useCreateAvailabilitySlot();
  const del = useDeleteAvailabilitySlot();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = React.useState("");
  const [start, setStart] = React.useState("09:00");
  const [end, setEnd] = React.useState("13:00");

  async function handleAdd() {
    if (!date) {
      toast.error("Scegli una data.");
      return;
    }
    try {
      await create.mutateAsync({ date, startTime: start, endTime: end });
      toast.success("Data aggiunta");
      setDate("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Rimuovere questa eccezione?")) return;
    try {
      await del.mutateAsync(id);
      toast.success("Rimossa");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Aggiungi date singole — utile per aperture straordinarie.
      </p>
      <div className="surface-1 flex flex-wrap items-end gap-2 rounded-xl p-3">
        <div className="grid gap-1">
          <Label htmlFor="one-off-date" className="text-[11px]">
            Data
          </Label>
          <Input
            id="one-off-date"
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            className="focus-ring h-8"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="one-off-start" className="text-[11px]">
            Inizio
          </Label>
          <Input
            id="one-off-start"
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="focus-ring h-8 w-28"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="one-off-end" className="text-[11px]">
            Fine
          </Label>
          <Input
            id="one-off-end"
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="focus-ring h-8 w-28"
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={create.isPending || !date}
        >
          {create.isPending ? (
            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
          ) : (
            <Plus className="mr-1.5 h-3 w-3" />
          )}
          Aggiungi data
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessuna data specifica configurata.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {slots.map((s) => (
            <li
              key={s.id}
              className="surface-1 flex items-center gap-3 rounded-md p-2 text-sm"
            >
              <span className="font-medium capitalize">
                {s.date &&
                  format(new Date(s.date), "EEEE d MMMM yyyy", {
                    locale: it,
                  })}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {s.startTime}–{s.endTime}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(s.id)}
                disabled={del.isPending}
                aria-label={`Rimuovi eccezione del ${s.date}`}
                className="focus-ring ml-auto inline-flex h-7 items-center gap-1 rounded-md border border-border/60 bg-card px-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" aria-hidden />
                Rimuovi
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Upcoming preview ─────────────────────────────────────────────────

function UpcomingPreview({ slots }: { slots: AvailabilitySlotDTO[] }) {
  const days = Array.from({ length: 14 }, (_, i) =>
    addDays(new Date(new Date().toDateString()), i),
  );

  function windowsFor(d: Date): string[] {
    const iso = d.toISOString().slice(0, 10);
    const recurring = slots.filter(
      (s) => s.isRecurring && s.dayOfWeek === d.getDay(),
    );
    const oneOff = slots.filter(
      (s) => !s.isRecurring && s.date && isSameDay(new Date(s.date), d),
    );
    return [...oneOff, ...recurring].map((s) => `${s.startTime}–${s.endTime}`);
  }

  const hasAny = slots.length > 0;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="preview-heading">
      <h3
        id="preview-heading"
        className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
      >
        Anteprima prossimi 14 giorni
      </h3>
      {!hasAny ? (
        <p className="surface-1 rounded-xl p-4 text-sm text-muted-foreground">
          Nessuna disponibilità configurata — aggiungi almeno una fascia
          settimanale per permettere le prenotazioni.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {days.map((d) => {
            const wins = windowsFor(d);
            return (
              <li
                key={d.toISOString()}
                className={cn(
                  "surface-1 flex min-h-[84px] flex-col rounded-xl p-2 text-xs",
                  wins.length === 0 && "opacity-60",
                )}
              >
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {format(d, "EEE", { locale: it })}
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {format(d, "d MMM", { locale: it })}
                </span>
                {wins.length === 0 ? (
                  <span className="mt-1 text-[11px] italic text-muted-foreground">
                    chiuso
                  </span>
                ) : (
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {wins.map((w, i) => (
                      <li
                        key={i}
                        className="rounded bg-primary-500/10 px-1.5 py-0.5 text-[10px] tabular-nums text-primary-500"
                      >
                        {w}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
