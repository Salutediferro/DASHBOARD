"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Apple,
  History,
  Loader2,
  Lock,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useUser } from "@/lib/hooks/use-user";
import {
  useActivePlan,
  useArchivePlan,
  useCreatePlan,
  useDiary,
  usePlanHistory,
  useUpdatePlan,
  type NutritionPlan,
  type NutritionPlanMeal,
} from "@/lib/hooks/use-nutrition";
import {
  MEAL_SLOTS_ORDERED,
  mealSlotLabel,
} from "@/lib/nutrition-labels";
import type { MealSlot } from "@/lib/validators/nutrition";

import { PlanHistoryDialog } from "../../../patient/nutrition/_components/plan-history-dialog";

type PatientHeader = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  email: string;
};

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DoctorPatientNutritionPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = String(params.patientId);
  const { profile } = useUser();
  const me = profile?.id ?? null;

  const patientQuery = useQuery<PatientHeader>({
    queryKey: ["client", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${patientId}`);
      if (!res.ok) throw new Error("Errore caricamento paziente");
      return res.json();
    },
  });
  const active = useActivePlan(patientId);
  const history = usePlanHistory(patientId);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [creatingReplacement, setCreatingReplacement] = React.useState(false);

  if (patientQuery.isLoading || active.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (patientQuery.isError || !patientQuery.data) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
            <AlertCircle className="text-destructive h-8 w-8" />
            <p className="text-sm">Impossibile caricare il paziente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const patient = patientQuery.data;
  const plan = active.data ?? null;
  const isAuthor = plan != null && me != null && plan.authorId === me;
  const archivedCount = (history.data ?? []).filter(
    (p) => p.archivedAt != null,
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      <header className="flex items-start gap-4">
        <Avatar className="h-14 w-14">
          {patient.avatarUrl && (
            <AvatarImage src={patient.avatarUrl} alt={patient.fullName} />
          )}
          <AvatarFallback>{initials(patient.fullName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {patient.fullName}
          </h1>
          <p className="text-muted-foreground text-xs">{patient.email}</p>
        </div>
        {archivedCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="h-3.5 w-3.5" /> Storico ({archivedCount})
          </Button>
        )}
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">Piano nutrizionale</h2>
        {plan && !isAuthor && !creatingReplacement ? (
          <ReadOnlyPlanCard
            plan={plan}
            onReplace={() => setCreatingReplacement(true)}
          />
        ) : plan && isAuthor && !creatingReplacement ? (
          <PlanEditorForm
            patientId={patientId}
            existing={plan}
            onArchived={() => router.refresh()}
          />
        ) : (
          <PlanEditorForm
            patientId={patientId}
            existing={null}
            replacingExisting={plan != null}
            onCancelReplacement={() => setCreatingReplacement(false)}
            onCreated={() => setCreatingReplacement(false)}
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">Diario del paziente</h2>
        <DoctorDiaryView patientId={patientId} />
      </section>

      <PlanHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        plans={history.data ?? []}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/doctor/nutrition"
      className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-xs"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Tutti i piani
    </Link>
  );
}

// ----------------------------------------------------------------------------
// Read-only plan card (when current doctor isn't the author)
// ----------------------------------------------------------------------------

function ReadOnlyPlanCard({
  plan,
  onReplace,
}: {
  plan: NutritionPlan;
  onReplace: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{plan.title}</CardTitle>
          <p className="text-muted-foreground mt-0.5 inline-flex items-center gap-1.5 text-xs">
            <Lock className="h-3 w-3" /> Autore: {plan.author.fullName}
          </p>
        </div>
        <Badge variant="secondary">Attivo</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground text-xs">
          Solo l&apos;autore del piano può modificarlo. Puoi creare un nuovo
          piano: il piano corrente verrà archiviato automaticamente.
        </p>
        {plan.notes && (
          <p className="whitespace-pre-wrap text-sm">{plan.notes}</p>
        )}
        {plan.meals.length > 0 && (
          <ul className="flex flex-col gap-1 text-xs">
            {plan.meals.map((m, i) => (
              <li key={i}>
                <span className="font-medium">
                  {mealSlotLabel(m.slot)}: {m.title}
                </span>
                {m.description && (
                  <span className="text-muted-foreground"> — {m.description}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <div>
          <Button type="button" size="sm" onClick={onReplace}>
            <Plus className="h-3.5 w-3.5" /> Crea nuovo piano
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Plan editor — handles both create and update
// ----------------------------------------------------------------------------

type EditorState = {
  title: string;
  notes: string;
  targetCalories: string;
  targetProtein: string;
  targetCarbs: string;
  targetFat: string;
  meals: NutritionPlanMeal[];
};

function emptyState(): EditorState {
  return {
    title: "",
    notes: "",
    targetCalories: "",
    targetProtein: "",
    targetCarbs: "",
    targetFat: "",
    meals: [],
  };
}

function fromPlan(plan: NutritionPlan): EditorState {
  return {
    title: plan.title,
    notes: plan.notes ?? "",
    targetCalories: plan.targetCaloriesKcal?.toString() ?? "",
    targetProtein: plan.targetProteinG?.toString() ?? "",
    targetCarbs: plan.targetCarbsG?.toString() ?? "",
    targetFat: plan.targetFatG?.toString() ?? "",
    meals: plan.meals.map((m) => ({
      slot: m.slot,
      title: m.title,
      description: m.description ?? "",
      items: m.items ?? [],
    })),
  };
}

function parseNum(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function PlanEditorForm({
  patientId,
  existing,
  replacingExisting,
  onCreated,
  onCancelReplacement,
  onArchived,
}: {
  patientId: string;
  existing: NutritionPlan | null;
  replacingExisting?: boolean;
  onCreated?: () => void;
  onCancelReplacement?: () => void;
  onArchived?: () => void;
}) {
  const create = useCreatePlan();
  const update = useUpdatePlan();
  const archive = useArchivePlan();

  const [state, setState] = React.useState<EditorState>(() =>
    existing ? fromPlan(existing) : emptyState(),
  );

  // Re-hydrate when switching between create / edit modes for the same screen.
  React.useEffect(() => {
    setState(existing ? fromPlan(existing) : emptyState());
  }, [existing]);

  const submitting = create.isPending || update.isPending;

  function patch<K extends keyof EditorState>(k: K, v: EditorState[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  function addMeal(slot: MealSlot) {
    setState((s) => ({
      ...s,
      meals: [
        ...s.meals,
        { slot, title: "", description: "", items: [] },
      ],
    }));
  }

  function updateMeal(i: number, patchM: Partial<NutritionPlanMeal>) {
    setState((s) => ({
      ...s,
      meals: s.meals.map((m, idx) => (idx === i ? { ...m, ...patchM } : m)),
    }));
  }

  function removeMeal(i: number) {
    setState((s) => ({ ...s, meals: s.meals.filter((_, idx) => idx !== i) }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.title.trim().length === 0) {
      toast.error("Il titolo è obbligatorio.");
      return;
    }
    const cleanedMeals: NutritionPlanMeal[] = state.meals
      .filter((m) => m.title.trim().length > 0)
      .map((m) => ({
        slot: m.slot,
        title: m.title.trim(),
        description: m.description?.trim() ? m.description.trim() : null,
        items: m.items ?? [],
      }));

    const payload = {
      title: state.title.trim(),
      notes: state.notes.trim() ? state.notes.trim() : null,
      targetCaloriesKcal: parseNum(state.targetCalories),
      targetProteinG: parseNum(state.targetProtein),
      targetCarbsG: parseNum(state.targetCarbs),
      targetFatG: parseNum(state.targetFat),
      meals: cleanedMeals,
    };

    if (existing) {
      update
        .mutateAsync({ id: existing.id, ...payload })
        .then(() => toast.success("Piano aggiornato"))
        .catch((err: Error) => toast.error(err.message));
    } else {
      create
        .mutateAsync({ patientId, ...payload })
        .then(() => {
          toast.success(
            replacingExisting
              ? "Nuovo piano creato — il precedente è stato archiviato"
              : "Piano creato",
          );
          onCreated?.();
        })
        .catch((err: Error) => toast.error(err.message));
    }
  }

  function handleArchive() {
    if (!existing) return;
    if (!confirm("Archiviare il piano attuale? Sarà visibile solo nello storico."))
      return;
    archive
      .mutateAsync(existing.id)
      .then(() => {
        toast.success("Piano archiviato");
        onArchived?.();
      })
      .catch((err: Error) => toast.error(err.message));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">
          {existing
            ? "Modifica piano attivo"
            : replacingExisting
              ? "Crea nuovo piano (sostituirà l'attivo)"
              : "Crea piano"}
        </CardTitle>
        <div className="flex items-center gap-2">
          {replacingExisting && onCancelReplacement && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onCancelReplacement}
            >
              Annulla
            </Button>
          )}
          {existing && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleArchive}
              disabled={archive.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" /> Archivia
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plan-title">Titolo</Label>
            <Input
              id="plan-title"
              maxLength={160}
              placeholder="Es. Mantenimento — primavera 2026"
              value={state.title}
              onChange={(e) => patch("title", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NumberField
              label="kcal/die"
              value={state.targetCalories}
              onChange={(v) => patch("targetCalories", v)}
            />
            <NumberField
              label="Proteine (g)"
              value={state.targetProtein}
              onChange={(v) => patch("targetProtein", v)}
              step="0.1"
            />
            <NumberField
              label="Carboidrati (g)"
              value={state.targetCarbs}
              onChange={(v) => patch("targetCarbs", v)}
              step="0.1"
            />
            <NumberField
              label="Grassi (g)"
              value={state.targetFat}
              onChange={(v) => patch("targetFat", v)}
              step="0.1"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plan-notes">Note</Label>
            <Textarea
              id="plan-notes"
              rows={4}
              maxLength={8000}
              placeholder="Indicazioni libere: idratazione, alimenti da preferire / evitare, integratori, ecc."
              value={state.notes}
              onChange={(e) => patch("notes", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider">
                Pasti consigliati
              </h4>
              <AddMealMenu onAdd={addMeal} />
            </div>
            {state.meals.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
                Nessun pasto. Usa <strong>Aggiungi pasto</strong> per iniziare,
                o lascia vuoto se il piano è solo macro + note.
              </p>
            ) : (
              state.meals.map((m, i) => (
                <article
                  key={i}
                  className="border-border rounded-lg border p-3"
                >
                  <header className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                      {mealSlotLabel(m.slot)}
                    </span>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removeMeal(i)}
                      aria-label="Rimuovi pasto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </header>
                  <div className="flex flex-col gap-2">
                    <Input
                      placeholder="Titolo (es. Pranzo proteico)"
                      maxLength={120}
                      value={m.title}
                      onChange={(e) =>
                        updateMeal(i, { title: e.target.value })
                      }
                    />
                    <Textarea
                      rows={2}
                      maxLength={2000}
                      placeholder="Descrizione (es. 100g petto di pollo, 80g riso integrale, verdure)"
                      value={m.description ?? ""}
                      onChange={(e) =>
                        updateMeal(i, { description: e.target.value })
                      }
                    />
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {existing ? "Salva modifiche" : "Crea piano"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[10px] uppercase tracking-wider">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step={step ?? "1"}
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function AddMealMenu({ onAdd }: { onAdd: (slot: MealSlot) => void }) {
  const [pending, setPending] = React.useState<MealSlot>("BREAKFAST");
  return (
    <div className="flex items-center gap-2">
      <Select
        value={pending}
        onValueChange={(v) => setPending((v as MealSlot) ?? "BREAKFAST")}
      >
        <SelectTrigger className="h-8 w-auto text-xs">
          <SelectValue>
            {(v) => (v ? mealSlotLabel(v as MealSlot) : "")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {MEAL_SLOTS_ORDERED.map((s) => (
            <SelectItem key={s} value={s}>
              {mealSlotLabel(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onAdd(pending)}
      >
        <Plus className="h-3.5 w-3.5" /> Aggiungi pasto
      </Button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Read-only diary view (for the doctor)
// ----------------------------------------------------------------------------

function DoctorDiaryView({ patientId }: { patientId: string }) {
  const [date, setDate] = React.useState(todayIso());
  const diary = useDiary(date, patientId);
  const entries = diary.data ?? [];

  const totals = entries.reduce(
    (acc, e) => {
      acc.kcal += e.caloriesKcal;
      acc.protein += e.proteinG ?? 0;
      acc.carbs += e.carbsG ?? 0;
      acc.fat += e.fatG ?? 0;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="inline-flex items-center gap-1.5 text-base">
          <Apple className="h-4 w-4" />
          Diario alimentare
        </CardTitle>
        <Input
          type="date"
          value={date}
          max={todayIso()}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 w-auto"
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Total label="kcal" value={Math.round(totals.kcal)} />
          <Total label="P (g)" value={Math.round(totals.protein * 10) / 10} />
          <Total label="C (g)" value={Math.round(totals.carbs * 10) / 10} />
          <Total label="G (g)" value={Math.round(totals.fat * 10) / 10} />
        </div>
        {diary.isLoading ? (
          <Loader2 className="text-muted-foreground mx-auto h-5 w-5 animate-spin" />
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs">
            Nessuna voce registrata in questa giornata.
          </p>
        ) : (
          MEAL_SLOTS_ORDERED.map((slot) => {
            const items = entries.filter((e) => e.mealSlot === slot);
            if (items.length === 0) return null;
            return (
              <section key={slot} className="flex flex-col gap-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider">
                  {mealSlotLabel(slot)}
                </h4>
                <ul className="flex flex-col gap-1.5">
                  {items.map((e) => (
                    <li
                      key={e.id}
                      className="border-border rounded-lg border p-2.5 text-xs"
                    >
                      <p className="text-foreground">{e.description}</p>
                      <p className="text-muted-foreground mt-0.5">
                        {fmtTime(e.consumedAt)} · {e.caloriesKcal} kcal
                        {e.proteinG != null && ` · ${e.proteinG}g P`}
                        {e.carbsG != null && ` · ${e.carbsG}g C`}
                        {e.fatG != null && ` · ${e.fatG}g G`}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center">
      <p className="font-heading text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
}
