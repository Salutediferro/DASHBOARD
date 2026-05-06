"use client";

import * as React from "react";
import {
  Apple,
  History,
  Loader2,
  Pencil,
  Plus,
  Search,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useActivePlan,
  usePlanHistory,
  useDiary,
  useDeleteDiaryEntry,
  type DiaryEntry,
} from "@/lib/hooks/use-nutrition";
import {
  MEAL_SLOTS_ORDERED,
  mealSlotLabel,
} from "@/lib/nutrition-labels";
import { cn } from "@/lib/utils";

import { DiaryEntryDialog } from "./_components/diary-entry-dialog";
import { FindProfessionalDialog } from "./_components/find-professional-dialog";
import { PlanHistoryDialog } from "./_components/plan-history-dialog";
import { LinkedProfessionalsCard } from "./_components/linked-professionals-card";

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PatientNutritionPage() {
  const [findOpen, setFindOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading inline-flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <Apple className="text-primary-500 h-7 w-7" />
          Nutrizione
        </h1>
        <p className="text-muted-foreground text-sm">
          Il piano del tuo professionista e il tuo diario alimentare
          quotidiano.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">Piano nutrizionale</h2>
        <PlanSection onSearchClick={() => setFindOpen(true)} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">Diario</h2>
        <DiarySection />
      </section>

      <LinkedProfessionalsCard onSearchClick={() => setFindOpen(true)} />

      <FindProfessionalDialog open={findOpen} onOpenChange={setFindOpen} />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Plan section — active plan + history button
// ----------------------------------------------------------------------------

function PlanSection({ onSearchClick }: { onSearchClick: () => void }) {
  const active = useActivePlan();
  const history = usePlanHistory();
  const [historyOpen, setHistoryOpen] = React.useState(false);

  const archivedCount = (history.data ?? []).filter(
    (p) => p.archivedAt != null,
  ).length;

  if (active.isLoading) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const plan = active.data ?? null;

  return (
    <>
      {plan ? (
        <ActivePlanCard plan={plan} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Apple className="text-muted-foreground h-10 w-10" />
            <div className="max-w-md">
              <p className="text-sm font-medium">
                Nessun piano nutrizionale attivo.
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Quando un professionista preparerà un piano per te lo vedrai
                qui. Nel frattempo puoi compilare il tuo diario o cercare un
                professionista.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSearchClick}
            >
              <Search className="h-3.5 w-3.5" /> Cerca un professionista
            </Button>
          </CardContent>
        </Card>
      )}

      {archivedCount > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="h-3.5 w-3.5" />
            Piani precedenti ({archivedCount})
          </Button>
        </div>
      )}

      <PlanHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        plans={history.data ?? []}
      />
    </>
  );
}

function ActivePlanCard({
  plan,
}: {
  plan: NonNullable<ReturnType<typeof useActivePlan>["data"]>;
}) {
  const targets = [
    plan.targetCaloriesKcal != null
      ? { label: "kcal", value: plan.targetCaloriesKcal }
      : null,
    plan.targetProteinG != null
      ? { label: "P (g)", value: plan.targetProteinG }
      : null,
    plan.targetCarbsG != null
      ? { label: "C (g)", value: plan.targetCarbsG }
      : null,
    plan.targetFatG != null ? { label: "G (g)", value: plan.targetFatG } : null,
  ].filter((t): t is { label: string; value: number } => t != null);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-lg">{plan.title}</CardTitle>
          <p className="text-muted-foreground mt-0.5 inline-flex items-center gap-1.5 text-xs">
            <Stethoscope className="h-3 w-3" />
            {plan.author.fullName}
            {plan.author.specialties.length > 0 &&
              ` · ${plan.author.specialties[0]}`}
          </p>
        </div>
        <Badge variant="secondary">Attivo</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {targets.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {targets.map((t) => (
              <div
                key={t.label}
                className="bg-muted/50 rounded-lg p-3 text-center"
              >
                <p className="font-heading text-xl font-semibold tabular-nums">
                  {t.value}
                </p>
                <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                  {t.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {plan.notes && (
          <p className="whitespace-pre-wrap text-sm">{plan.notes}</p>
        )}

        {plan.meals.length > 0 && (
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider">
              Pasti consigliati
            </h4>
            {plan.meals.map((m, i) => (
              <article
                key={i}
                className="border-border rounded-lg border p-3"
              >
                <h5 className="text-sm font-semibold">
                  <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                    {mealSlotLabel(m.slot)}
                  </span>
                  <br />
                  {m.title}
                </h5>
                {m.description && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {m.description}
                  </p>
                )}
                {m.items && m.items.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1 text-xs">
                    {m.items.map((it, j) => (
                      <li key={j}>
                        <span className="font-medium">{it.name}</span>
                        {it.quantity && (
                          <span className="text-muted-foreground">
                            {" "}
                            — {it.quantity}
                          </span>
                        )}
                        {it.notes && (
                          <span className="text-muted-foreground">
                            {" "}
                            ({it.notes})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Diary section — date picker, totals, entries grouped by meal slot
// ----------------------------------------------------------------------------

function DiarySection() {
  const [date, setDate] = React.useState(todayIso());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DiaryEntry | null>(null);
  const diary = useDiary(date);
  const remove = useDeleteDiaryEntry(date);

  const entries = React.useMemo(() => diary.data ?? [], [diary.data]);

  const totals = React.useMemo(() => {
    return entries.reduce(
      (acc, e) => {
        acc.kcal += e.caloriesKcal;
        acc.protein += e.proteinG ?? 0;
        acc.carbs += e.carbsG ?? 0;
        acc.fat += e.fatG ?? 0;
        return acc;
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [entries]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    for (const slot of MEAL_SLOTS_ORDERED) map.set(slot, []);
    for (const e of entries) {
      map.get(e.mealSlot)?.push(e);
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          new Date(a.consumedAt).getTime() - new Date(b.consumedAt).getTime(),
      );
    }
    return map;
  }, [entries]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(entry: DiaryEntry) {
    setEditing(entry);
    setDialogOpen(true);
  }

  function onDelete(entry: DiaryEntry) {
    if (!confirm("Eliminare questa voce dal diario?")) return;
    remove
      .mutateAsync(entry.id)
      .then(() => toast.success("Voce eliminata"))
      .catch((err: Error) => toast.error(err.message));
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">
            {date === todayIso() ? "Oggi" : fmtDay(date)}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 w-auto"
            />
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Aggiungi voce
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <TotalCell label="kcal" value={Math.round(totals.kcal)} />
            <TotalCell
              label="P (g)"
              value={Math.round(totals.protein * 10) / 10}
            />
            <TotalCell
              label="C (g)"
              value={Math.round(totals.carbs * 10) / 10}
            />
            <TotalCell label="G (g)" value={Math.round(totals.fat * 10) / 10} />
          </div>

          {diary.isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs">
              Nessuna voce per questo giorno. Tocca <strong>Aggiungi voce</strong>
              {" "}
              per iniziare.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {MEAL_SLOTS_ORDERED.map((slot) => {
                const items = grouped.get(slot) ?? [];
                if (items.length === 0) return null;
                const slotKcal = items.reduce(
                  (acc, e) => acc + e.caloriesKcal,
                  0,
                );
                return (
                  <section key={slot} className="flex flex-col gap-2">
                    <header className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider">
                        {mealSlotLabel(slot)}
                      </h4>
                      <span className="text-muted-foreground text-[11px] tabular-nums">
                        {slotKcal} kcal
                      </span>
                    </header>
                    <ul className="flex flex-col gap-1.5">
                      {items.map((e) => (
                        <li
                          key={e.id}
                          className="border-border flex items-start gap-3 rounded-lg border p-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm">{e.description}</p>
                            <p className="text-muted-foreground mt-0.5 text-[11px]">
                              {fmtTime(e.consumedAt)} · {e.caloriesKcal} kcal
                              {e.proteinG != null && ` · ${e.proteinG}g P`}
                              {e.carbsG != null && ` · ${e.carbsG}g C`}
                              {e.fatG != null && ` · ${e.fatG}g G`}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Modifica voce"
                              onClick={() => openEdit(e)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Elimina voce"
                              onClick={() => onDelete(e)}
                              disabled={remove.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <DiaryEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={date}
        entry={editing}
      />
    </>
  );
}

function TotalCell({ label, value }: { label: string; value: number }) {
  return (
    <div
      className={cn(
        "bg-muted/50 rounded-lg p-3 text-center",
      )}
    >
      <p className="font-heading text-xl font-semibold tabular-nums">
        {value}
      </p>
      <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
}
