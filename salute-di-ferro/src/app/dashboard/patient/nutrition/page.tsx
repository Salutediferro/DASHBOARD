"use client";

import * as React from "react";
import {
  Apple,
  Copy,
  History,
  Loader2,
  Plus,
  Search,
  Stethoscope,
  X,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  mealSlotShortLabel,
  MealSlotIcon,
  defaultTimeForMealSlot,
} from "@/lib/nutrition-labels";
import { cn } from "@/lib/utils";
import type { MealSlot } from "@/lib/validators/nutrition";

import { AppointmentForm } from "@/components/calendar/appointment-form";
import type { ProfessionalSearchResult } from "@/lib/hooks/use-professionals";

import { CopyMealsDialog } from "./_components/copy-meals-dialog";
import { DiaryEntryDialog } from "./_components/diary-entry-dialog";
import { FindProfessionalDialog } from "./_components/find-professional-dialog";
import { PlanHistoryDialog } from "./_components/plan-history-dialog";
import { LinkedProfessionalsCard } from "./_components/linked-professionals-card";

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtNumeric(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function PatientNutritionPage() {
  const [findOpen, setFindOpen] = React.useState(false);
  // The search dialog now hands the picked pro back here so we can open
  // the booking wizard. Becoming "team" happens server-side as a result
  // of the booking — no eager grant.
  const [bookingFor, setBookingFor] = React.useState<ProfessionalSearchResult | null>(
    null,
  );

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

      <Tabs defaultValue="plan" className="flex flex-col gap-4">
        <TabsList>
          <TabsTrigger value="plan">Piano nutrizionale</TabsTrigger>
          <TabsTrigger value="diary">Diario</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="flex flex-col gap-4 pt-2">
          <PlanSection onSearchClick={() => setFindOpen(true)} />
          <LinkedProfessionalsCard onSearchClick={() => setFindOpen(true)} />
        </TabsContent>

        <TabsContent value="diary" className="flex flex-col gap-4 pt-2">
          <DiarySection />
        </TabsContent>
      </Tabs>

      <FindProfessionalDialog
        open={findOpen}
        onOpenChange={setFindOpen}
        onRequestAppointment={(p) => setBookingFor(p)}
      />
      <AppointmentForm
        open={bookingFor != null}
        onOpenChange={(v) => {
          if (!v) setBookingFor(null);
        }}
        mode="PATIENT"
        initialProfessional={
          bookingFor
            ? {
                id: bookingFor.id,
                fullName: bookingFor.fullName,
                // /api/professionals/search currently returns DOCTORs only.
                role: "DOCTOR",
                avatarUrl: bookingFor.avatarUrl,
                specialties: bookingFor.specialties,
              }
            : undefined
        }
      />
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
// Diary section — header, totals, slot pills, one card per meal slot
// ----------------------------------------------------------------------------

type MacroTone = "red" | "emerald" | "amber" | "sky";

const STAT_TONE: Record<MacroTone, string> = {
  red: "text-red-500",
  emerald: "text-emerald-600",
  amber: "text-amber-500",
  sky: "text-sky-500",
};

const PILL_TONE: Record<MacroTone, string> = {
  red: "bg-red-50 text-red-700 ring-red-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
};

function totalsOf(entries: DiaryEntry[]) {
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
}

function DiarySection() {
  const [date, setDate] = React.useState(todayIso());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DiaryEntry | null>(null);
  const [initialSlot, setInitialSlot] = React.useState<MealSlot | undefined>(
    undefined,
  );
  const [copyOpen, setCopyOpen] = React.useState(false);
  const diary = useDiary(date);
  const remove = useDeleteDiaryEntry(date);

  const entries = React.useMemo(() => diary.data ?? [], [diary.data]);
  const totals = React.useMemo(() => totalsOf(entries), [entries]);

  const grouped = React.useMemo(() => {
    const map = new Map<MealSlot, DiaryEntry[]>();
    for (const slot of MEAL_SLOTS_ORDERED) map.set(slot, []);
    for (const e of entries) map.get(e.mealSlot)?.push(e);
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          new Date(a.consumedAt).getTime() - new Date(b.consumedAt).getTime(),
      );
    }
    return map;
  }, [entries]);

  // Always show the 5 main slots; only show EVENING_SNACK when the
  // patient actually used it that day, since most don't.
  const visibleSlots = React.useMemo(
    () =>
      MEAL_SLOTS_ORDERED.filter(
        (s) => s !== "EVENING_SNACK" || (grouped.get(s)?.length ?? 0) > 0,
      ),
    [grouped],
  );

  function openCreate(slot?: MealSlot) {
    setEditing(null);
    setInitialSlot(slot);
    setDialogOpen(true);
  }

  function openEdit(entry: DiaryEntry) {
    setEditing(entry);
    setInitialSlot(undefined);
    setDialogOpen(true);
  }

  function onDelete(entry: DiaryEntry) {
    if (!confirm("Eliminare questa voce dal diario?")) return;
    remove
      .mutateAsync(entry.id)
      .then(() => toast.success("Voce eliminata"))
      .catch((err: Error) => toast.error(err.message));
  }

  function scrollToSlot(slot: MealSlot) {
    document
      .getElementById(`meal-card-${slot}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Cosa ho mangiato
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Diario alimentare · {fmtNumeric(date)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 w-auto"
            aria-label="Cambia giorno"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCopyOpen(true)}
          >
            <Copy className="h-3.5 w-3.5" /> Copia da…
          </Button>
          <Button type="button" size="sm" onClick={() => openCreate()}>
            <Plus className="h-3.5 w-3.5" /> Aggiungi
          </Button>
        </div>
      </header>

      {/* Daily totals */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard tone="red" value={Math.round(totals.kcal)} unit="" label="kcal" />
        <StatCard tone="emerald" value={Math.round(totals.protein)} unit="g" label="proteine" />
        <StatCard tone="amber" value={Math.round(totals.carbs)} unit="g" label="carbo" />
        <StatCard tone="sky" value={Math.round(totals.fat)} unit="g" label="grassi" />
      </div>

      {/* Slot pills — quick-jump nav */}
      <nav
        aria-label="Pasti"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {visibleSlots.map((slot) => (
          <SlotPill key={slot} slot={slot} onClick={() => scrollToSlot(slot)} />
        ))}
      </nav>

      {/* Loading */}
      {diary.isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
      )}

      {/* Meal cards */}
      {!diary.isLoading && (
        <div className="flex flex-col gap-3">
          {visibleSlots.map((slot) => (
            <MealCard
              key={slot}
              slot={slot}
              entries={grouped.get(slot) ?? []}
              onAdd={() => openCreate(slot)}
              onEdit={openEdit}
              onDelete={onDelete}
              removing={remove.isPending}
            />
          ))}
        </div>
      )}

      <DiaryEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={date}
        entry={editing}
        initialSlot={initialSlot}
      />
      <CopyMealsDialog
        open={copyOpen}
        onOpenChange={setCopyOpen}
        targetDate={date}
      />
    </div>
  );
}

function StatCard({
  tone,
  value,
  unit,
  label,
}: {
  tone: MacroTone;
  value: number;
  unit?: string;
  label: string;
}) {
  return (
    <div className="bg-card border-border flex flex-col items-center justify-center rounded-xl border p-3">
      <p
        className={cn(
          "font-heading text-2xl font-semibold tabular-nums",
          STAT_TONE[tone],
        )}
      >
        {value}
        {unit}
      </p>
      <p className="text-muted-foreground mt-0.5 text-xs">{label}</p>
    </div>
  );
}

function SlotPill({ slot, onClick }: { slot: MealSlot; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-card border-border focus-ring flex shrink-0 flex-col items-start gap-0.5 rounded-xl border px-3 py-2 transition-colors hover:bg-muted/40"
    >
      <span className="inline-flex items-center gap-1.5 text-sm font-medium">
        <MealSlotIcon slot={slot} className="text-muted-foreground h-3.5 w-3.5" />
        {mealSlotShortLabel(slot)}
      </span>
      <span className="text-muted-foreground text-xs tabular-nums">
        {defaultTimeForMealSlot(slot)}
      </span>
    </button>
  );
}

function MacroPill({ tone, children }: { tone: MacroTone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        PILL_TONE[tone],
      )}
    >
      {children}
    </span>
  );
}

function MealCard({
  slot,
  entries,
  onAdd,
  onEdit,
  onDelete,
  removing,
}: {
  slot: MealSlot;
  entries: DiaryEntry[];
  onAdd: () => void;
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (entry: DiaryEntry) => void;
  removing: boolean;
}) {
  const t = totalsOf(entries);
  const hasEntries = entries.length > 0;
  return (
    <Card id={`meal-card-${slot}`} className="scroll-mt-4">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="min-w-0 flex-1">
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <MealSlotIcon slot={slot} className="text-muted-foreground h-4 w-4" />
            {mealSlotShortLabel(slot)}
            <span className="text-muted-foreground text-sm font-normal tabular-nums">
              {defaultTimeForMealSlot(slot)}
            </span>
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-xs">
            {Math.round(t.kcal)} kcal totali
          </p>
          {hasEntries && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <MacroPill tone="emerald">P {Math.round(t.protein)}g</MacroPill>
              <MacroPill tone="amber">C {Math.round(t.carbs)}g</MacroPill>
              <MacroPill tone="sky">F {Math.round(t.fat)}g</MacroPill>
            </div>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" /> Aggiungi
        </Button>
      </CardHeader>
      <CardContent>
        {hasEntries ? (
          <ul className="flex flex-col gap-1.5">
            {entries.map((e) => (
              <EntryRow
                key={e.id}
                slot={slot}
                entry={e}
                onEdit={() => onEdit(e)}
                onDelete={() => onDelete(e)}
                disabled={removing}
              />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-xs italic">
            Nessuna voce.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Pull a trailing "(150 g)" out of the description so we can render
 *  grams + macros on a separate clean line. The parenthetical is only
 *  ever appended by the OFF-pick path in DiaryEntryDialog; manual
 *  entries don't have it and just render the description as-is. */
function splitDescription(description: string): { name: string; grams: string | null } {
  const match = description.match(/\s*\((\d+(?:[.,]\d+)?)\s*g\)\s*$/i);
  if (!match) return { name: description, grams: null };
  return {
    name: description.slice(0, match.index).trim(),
    grams: match[1].replace(",", "."),
  };
}

function EntryRow({
  slot,
  entry,
  onEdit,
  onDelete,
  disabled,
}: {
  slot: MealSlot;
  entry: DiaryEntry;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const { name, grams } = splitDescription(entry.description);
  const macros = [
    grams ? `${grams}g` : null,
    entry.proteinG != null ? `P${Math.round(entry.proteinG)}g` : null,
    entry.carbsG != null ? `C${Math.round(entry.carbsG)}g` : null,
    entry.fatG != null ? `F${Math.round(entry.fatG)}g` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="bg-muted/30 hover:bg-muted/50 flex items-center gap-2 rounded-lg p-2 transition-colors">
      <button
        type="button"
        onClick={onEdit}
        className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-md text-left"
      >
        <span className="bg-card border-border flex h-8 w-8 shrink-0 items-center justify-center rounded-full border">
          <MealSlotIcon slot={slot} className="text-muted-foreground h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{name}</span>
          {macros && (
            <span className="text-muted-foreground mt-0.5 block truncate text-[11px]">
              {macros}
            </span>
          )}
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {entry.caloriesKcal} kcal
        </span>
      </button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Elimina voce"
        onClick={onDelete}
        disabled={disabled}
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}
