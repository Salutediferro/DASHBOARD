"use client";

import * as React from "react";
import { ArrowLeft, Check, History, Loader2, Pencil, Search, SearchX, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateDiaryEntry,
  useUpdateDiaryEntry,
  type DiaryEntry,
} from "@/lib/hooks/use-nutrition";
import {
  useFoodSearch,
  useRecentFoods,
  type FoodSearchResult,
  type RecentFood,
} from "@/lib/hooks/use-foods";
import {
  MEAL_SLOTS_ORDERED,
  mealSlotLabel,
  defaultMealSlotForHour,
  defaultTimeForMealSlot,
} from "@/lib/nutrition-labels";
import { cn } from "@/lib/utils";
import type { MealSlot } from "@/lib/validators/nutrition";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** YYYY-MM-DD — the day the patient is editing. */
  date: string;
  /** When set, the dialog is in "edit" mode for that entry. */
  entry?: DiaryEntry | null;
  /**
   * When opening in create mode from a specific meal-slot card, pre-pick
   * that slot and default the time to the slot's conventional time
   * (e.g. LUNCH → 13:00). Ignored in edit mode.
   */
  initialSlot?: MealSlot;
};

/**
 * Dialog state machine:
 *   - "search": new entry default — combobox + Recenti + OFF results
 *   - "selected": OFF food picked, quantity input rescales macros live
 *   - "manual": free-text + manual macros (edit mode, custom-add, or
 *               "modifica manualmente" override on a selected food)
 */
type Mode = "search" | "selected" | "manual";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function nowHm() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function combine(date: string, hm: string): string {
  return new Date(`${date}T${hm}`).toISOString();
}

function extractHm(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const numOrEmpty = (v: number | null | undefined) => (v == null ? "" : String(v));

const parseNum = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function round1(n: number | null): number | null {
  if (n == null) return null;
  return Math.round(n * 10) / 10;
}

/**
 * Compute scaled macros from a food's per-100g values × user-entered grams.
 * Kcal rounds to int, macros to 1 decimal place — matches OFF precision.
 */
function scale(food: FoodSearchResult, grams: number) {
  const f = grams / 100;
  return {
    kcal: Math.max(0, Math.round(food.kcalPer100g * f)),
    protein: round1(food.proteinPer100g != null ? food.proteinPer100g * f : null),
    carbs: round1(food.carbsPer100g != null ? food.carbsPer100g * f : null),
    fat: round1(food.fatPer100g != null ? food.fatPer100g * f : null),
  };
}

export function DiaryEntryDialog({ open, onOpenChange, date, entry, initialSlot }: Props) {
  const create = useCreateDiaryEntry(date);
  const update = useUpdateDiaryEntry(date);
  const editing = !!entry;

  const [mode, setMode] = React.useState<Mode>("search");

  const [time, setTime] = React.useState<string>("");
  const [slot, setSlot] = React.useState<MealSlot>("LUNCH");

  // Manual-mode fields (also used when an OFF pick was overridden)
  const [description, setDescription] = React.useState("");
  const [calories, setCalories] = React.useState("");
  const [protein, setProtein] = React.useState("");
  const [carbs, setCarbs] = React.useState("");
  const [fat, setFat] = React.useState("");

  // Selected-mode state — only used when mode === "selected"
  const [selectedFood, setSelectedFood] = React.useState<FoodSearchResult | null>(null);
  const [grams, setGrams] = React.useState<string>("100");

  // Reset on (re)open. Edit mode goes straight to manual.
  React.useEffect(() => {
    if (!open) return;
    if (entry) {
      setMode("manual");
      setTime(extractHm(entry.consumedAt));
      setSlot(entry.mealSlot);
      setDescription(entry.description);
      setCalories(String(entry.caloriesKcal));
      setProtein(numOrEmpty(entry.proteinG));
      setCarbs(numOrEmpty(entry.carbsG));
      setFat(numOrEmpty(entry.fatG));
      setSelectedFood(null);
      setGrams("100");
    } else {
      setMode("search");
      // If the patient opened the dialog from a specific meal card, the
      // slot/time should match that card; otherwise pick by current hour
      // and use the wall-clock time.
      const pickedSlot = initialSlot ?? defaultMealSlotForHour(new Date().getHours());
      setSlot(pickedSlot);
      setTime(initialSlot ? defaultTimeForMealSlot(initialSlot) : nowHm());
      setDescription("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setSelectedFood(null);
      setGrams("100");
    }
  }, [open, entry, initialSlot]);

  const submitting = create.isPending || update.isPending;

  function pickOffFood(food: FoodSearchResult) {
    setSelectedFood(food);
    setGrams(String(food.servingG ?? 100));
    setMode("selected");
  }

  function pickRecent(r: RecentFood) {
    // Recents go to manual mode pre-filled — we don't have per-100g
    // for old entries, so live rescaling isn't possible.
    setMode("manual");
    setDescription(r.description);
    setCalories(String(r.caloriesKcal));
    setProtein(numOrEmpty(r.proteinG));
    setCarbs(numOrEmpty(r.carbsG));
    setFat(numOrEmpty(r.fatG));
  }

  function startManualFromSearch() {
    setMode("manual");
    setDescription("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
  }

  function backToSearch() {
    setMode("search");
    setSelectedFood(null);
    setGrams("100");
  }

  function overrideMacros() {
    // Pre-fill manual fields with currently-computed scaled macros so the
    // user can tweak from there.
    if (selectedFood) {
      const gNum = parseNum(grams) ?? 100;
      const m = scale(selectedFood, gNum);
      setDescription(
        `${selectedFood.name}${selectedFood.brand ? ` · ${selectedFood.brand}` : ""} (${gNum} g)`,
      );
      setCalories(String(m.kcal));
      setProtein(numOrEmpty(m.protein));
      setCarbs(numOrEmpty(m.carbs));
      setFat(numOrEmpty(m.fat));
    }
    setMode("manual");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    let payload: {
      consumedAt: string;
      mealSlot: MealSlot;
      description: string;
      caloriesKcal: number;
      proteinG: number | null;
      carbsG: number | null;
      fatG: number | null;
    };

    if (mode === "selected" && selectedFood) {
      const gNum = parseNum(grams);
      if (gNum == null || gNum <= 0) {
        toast.error("Inserisci una quantità valida.");
        return;
      }
      const m = scale(selectedFood, gNum);
      payload = {
        consumedAt: combine(date, time || "12:00"),
        mealSlot: slot,
        description: `${selectedFood.name}${selectedFood.brand ? ` · ${selectedFood.brand}` : ""} (${gNum} g)`,
        caloriesKcal: m.kcal,
        proteinG: m.protein,
        carbsG: m.carbs,
        fatG: m.fat,
      };
    } else {
      const cals = parseNum(calories);
      if (description.trim().length === 0) {
        toast.error("Inserisci una descrizione.");
        return;
      }
      if (cals == null || cals < 0) {
        toast.error("Le kcal sono obbligatorie.");
        return;
      }
      payload = {
        consumedAt: combine(date, time || "12:00"),
        mealSlot: slot,
        description: description.trim(),
        caloriesKcal: Math.round(cals),
        proteinG: parseNum(protein),
        carbsG: parseNum(carbs),
        fatG: parseNum(fat),
      };
    }

    const action = editing
      ? update.mutateAsync({ id: entry.id, ...payload })
      : create.mutateAsync(payload);
    action
      .then(() => {
        toast.success(editing ? "Voce aggiornata" : "Voce aggiunta");
        onOpenChange(false);
      })
      .catch((err: Error) => toast.error(err.message));
  }

  // ---- Render ------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-8">
          <DialogTitle>
            {editing
              ? "Modifica voce"
              : mode === "selected"
                ? "Quantità"
                : mode === "manual"
                  ? "Voce personalizzata"
                  : "Aggiungi voce al diario"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-w-0 flex-col gap-3 overflow-x-hidden">
          <SlotAndTime slot={slot} time={time} onSlot={setSlot} onTime={setTime} />

          {mode === "search" && (
            <SearchPane
              onPickFood={pickOffFood}
              onPickRecent={pickRecent}
              onCustom={startManualFromSearch}
            />
          )}

          {mode === "selected" && selectedFood && (
            <SelectedPane
              food={selectedFood}
              grams={grams}
              onGrams={setGrams}
              onBack={backToSearch}
              onOverride={overrideMacros}
            />
          )}

          {mode === "manual" && (
            <ManualPane
              description={description}
              calories={calories}
              protein={protein}
              carbs={carbs}
              fat={fat}
              onDescription={setDescription}
              onCalories={setCalories}
              onProtein={setProtein}
              onCarbs={setCarbs}
              onFat={setFat}
              showBack={!editing}
              onBack={backToSearch}
            />
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={submitting || mode === "search"}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Salva" : "Aggiungi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------------
// Slot + time strip — shared across all modes
// ----------------------------------------------------------------------------

function SlotAndTime({
  slot,
  time,
  onSlot,
  onTime,
}: {
  slot: MealSlot;
  time: string;
  onSlot: (s: MealSlot) => void;
  onTime: (t: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="meal-slot">Pasto</Label>
        <Select value={slot} onValueChange={(v) => onSlot(v as MealSlot)}>
          <SelectTrigger id="meal-slot">
            <SelectValue>{(v) => (v ? mealSlotLabel(v as MealSlot) : "")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MEAL_SLOTS_ORDERED.map((s) => (
              <SelectItem key={s} value={s}>
                {mealSlotLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="time">Ora</Label>
        <Input id="time" type="time" value={time} onChange={(e) => onTime(e.target.value)} />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Search pane — Recenti + Open Food Facts results + custom fallback
// ----------------------------------------------------------------------------

function SearchPane({
  onPickFood,
  onPickRecent,
  onCustom,
}: {
  onPickFood: (f: FoodSearchResult) => void;
  onPickRecent: (r: RecentFood) => void;
  onCustom: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");

  // 600ms debounce keeps us well under OFF's 10 req/min/IP quota even
  // for fast typers — at one fire per pause, a steady 600ms pace is
  // 100 req/min worst case, but real users pause longer than they type.
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 600);
    return () => clearTimeout(t);
  }, [query]);

  const recent = useRecentFoods();
  const search = useFoodSearch(debounced);

  const filteredRecent = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = recent.data ?? [];
    if (!q) return all;
    return all.filter((r) => r.description.toLowerCase().includes(q));
  }, [recent.data, query]);

  const offResults = search.data ?? [];
  // 3-char minimum mirrors useFoodSearch — anything shorter would fire
  // fuzzy queries that mostly miss anyway and just burn quota.
  const showSearching = debounced.length >= 3 && search.isLoading;
  const showNoResults =
    debounced.length >= 3 &&
    !search.isLoading &&
    offResults.length === 0 &&
    filteredRecent.length === 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Cerca un alimento (es. mela, yogurt, pasta…)"
          className="pl-9!"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          autoFocus
        />
        {query && (
          <button
            type="button"
            aria-label="Pulisci"
            onClick={() => setQuery("")}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="-mx-1 flex flex-col px-1">
        {filteredRecent.length > 0 && (
          <ResultGroup title="Recenti" icon={<History className="h-3 w-3" />}>
            {filteredRecent.map((r) => (
              <button
                key={r.description}
                type="button"
                onClick={() => onPickRecent(r)}
                className="hover:bg-muted/40 focus-ring flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.description}</p>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    {r.caloriesKcal} kcal
                    {r.proteinG != null && ` · ${r.proteinG}g P`}
                    {r.carbsG != null && ` · ${r.carbsG}g C`}
                    {r.fatG != null && ` · ${r.fatG}g G`}
                    {r.freq > 1 && ` · ${r.freq}×`}
                  </p>
                </div>
              </button>
            ))}
          </ResultGroup>
        )}

        {offResults.length > 0 && (
          <ResultGroup title="Alimenti">
            {offResults.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onPickFood(f)}
                className="hover:bg-muted/40 focus-ring flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.name}</p>
                  <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                    {f.brand && <span className="font-medium">{f.brand} · </span>}
                    {f.kcalPer100g} kcal/100g
                    {f.proteinPer100g != null && ` · ${round1(f.proteinPer100g)}g P`}
                    {f.carbsPer100g != null && ` · ${round1(f.carbsPer100g)}g C`}
                    {f.fatPer100g != null && ` · ${round1(f.fatPer100g)}g G`}
                  </p>
                </div>
                {f.servingG != null && (
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {f.servingG}g/porz.
                  </Badge>
                )}
              </button>
            ))}
          </ResultGroup>
        )}

        {showSearching && (
          <div className="text-muted-foreground flex items-center gap-2 px-2 py-3 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Ricerca…
          </div>
        )}

        {showNoResults && (
          <div className="flex flex-col items-center gap-2 px-2 py-4 text-center">
            <SearchX className="text-muted-foreground/40 h-7 w-7" />
            <p className="text-muted-foreground text-xs">Nessun alimento trovato.</p>
          </div>
        )}

        {!query && filteredRecent.length === 0 && offResults.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-2 py-4 text-center">
            <Search className="text-muted-foreground/40 h-7 w-7" />
            <p className="text-muted-foreground text-xs">
              Cerca un alimento per ottenerne i macronutrienti automaticamente.
            </p>
          </div>
        )}
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={onCustom} className="self-start">
        <Pencil className="h-3.5 w-3.5" /> Inserisci personalizzato
      </Button>
    </div>
  );
}

function ResultGroup({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex w-full flex-col gap-0.5 overflow-hidden">
      <h4 className="text-muted-foreground inline-flex items-center gap-1 px-2 pt-2 text-[10px] font-semibold tracking-wider uppercase">
        {icon}
        {title}
      </h4>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// Selected pane — quantity input + live macro recompute
// ----------------------------------------------------------------------------

function SelectedPane({
  food,
  grams,
  onGrams,
  onBack,
  onOverride,
}: {
  food: FoodSearchResult;
  grams: string;
  onGrams: (v: string) => void;
  onBack: () => void;
  onOverride: () => void;
}) {
  const gNum = parseNum(grams);
  const validG = gNum != null && gNum > 0;
  const macros = validG ? scale(food, gNum) : null;
  const standardG = food.servingG;

  return (
    <div className="flex flex-col gap-3">
      <div className="border-border bg-muted/40 flex items-start justify-between gap-2 rounded-lg border p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{food.name}</p>
          {food.brand && <p className="text-muted-foreground truncate text-xs">{food.brand}</p>}
          <p className="text-muted-foreground mt-1 text-[11px]">
            {food.kcalPer100g} kcal/100g
            {food.proteinPer100g != null && ` · ${round1(food.proteinPer100g)}g P`}
            {food.carbsPer100g != null && ` · ${round1(food.carbsPer100g)}g C`}
            {food.fatPer100g != null && ` · ${round1(food.fatPer100g)}g G`}
          </p>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onBack}
          aria-label="Cambia alimento"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="grams">Quantità (g)</Label>
        <Input
          id="grams"
          type="number"
          inputMode="decimal"
          step="1"
          min={1}
          max={5000}
          value={grams}
          onChange={(e) => onGrams(e.target.value)}
        />
        {standardG != null && (
          <div className="flex flex-wrap gap-1.5">
            <PortionChip
              label={`Porzione standard (${standardG}g)`}
              active={gNum === standardG}
              onClick={() => onGrams(String(standardG))}
            />
            {[100, 150, 200].map((preset) =>
              preset === standardG ? null : (
                <PortionChip
                  key={preset}
                  label={`${preset}g`}
                  active={gNum === preset}
                  onClick={() => onGrams(String(preset))}
                />
              ),
            )}
          </div>
        )}
      </div>

      <MacroSummary
        kcal={macros?.kcal ?? 0}
        protein={macros?.protein ?? null}
        carbs={macros?.carbs ?? null}
        fat={macros?.fat ?? null}
      />

      <Button type="button" variant="ghost" size="sm" onClick={onOverride} className="self-start">
        <Pencil className="h-3.5 w-3.5" /> Modifica manualmente
      </Button>
    </div>
  );
}

function PortionChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
        active
          ? "border-primary-500/50 bg-primary-500/10 text-foreground"
          : "border-border/70 text-muted-foreground hover:bg-muted/40",
      )}
    >
      {active && <Check className="h-3 w-3" />}
      {label}
    </button>
  );
}

function MacroSummary({
  kcal,
  protein,
  carbs,
  fat,
}: {
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}) {
  const cells = [
    { label: "kcal", value: kcal },
    { label: "P (g)", value: protein ?? 0 },
    { label: "C (g)", value: carbs ?? 0 },
    { label: "G (g)", value: fat ?? 0 },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {cells.map((c) => (
        <div key={c.label} className="bg-muted/50 rounded-md p-2 text-center">
          <p className="font-heading text-base font-semibold tabular-nums">{c.value}</p>
          <p className="text-muted-foreground text-[10px] tracking-wide uppercase">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Manual pane — free-text + manual macros (edit, custom add, override)
// ----------------------------------------------------------------------------

function ManualPane({
  description,
  calories,
  protein,
  carbs,
  fat,
  onDescription,
  onCalories,
  onProtein,
  onCarbs,
  onFat,
  showBack,
  onBack,
}: {
  description: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  onDescription: (v: string) => void;
  onCalories: (v: string) => void;
  onProtein: (v: string) => void;
  onCarbs: (v: string) => void;
  onFat: (v: string) => void;
  showBack: boolean;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {showBack && (
        <Button type="button" variant="ghost" size="sm" onClick={onBack} className="self-start">
          <ArrowLeft className="h-3.5 w-3.5" /> Cerca un alimento
        </Button>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Cosa hai mangiato</Label>
        <Textarea
          id="description"
          rows={2}
          maxLength={400}
          placeholder="Es. 100g di petto di pollo, 80g di riso integrale"
          value={description}
          onChange={(e) => onDescription(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="calories">Kcal</Label>
          <Input
            id="calories"
            type="number"
            inputMode="numeric"
            min={0}
            max={20000}
            value={calories}
            onChange={(e) => onCalories(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="protein">Proteine (g)</Label>
          <Input
            id="protein"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            value={protein}
            onChange={(e) => onProtein(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="carbs">Carboidrati (g)</Label>
          <Input
            id="carbs"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            value={carbs}
            onChange={(e) => onCarbs(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fat">Grassi (g)</Label>
          <Input
            id="fat"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            value={fat}
            onChange={(e) => onFat(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
