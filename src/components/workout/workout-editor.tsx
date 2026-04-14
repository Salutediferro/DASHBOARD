"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Eye,
  GripVertical,
  Link2,
  Link2Off,
  Plus,
  Save,
  StickyNote,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExerciseSearchModal } from "@/components/workout/exercise-search-modal";
import { AssignDialog } from "@/components/workout/assign-dialog";
import type {
  Difficulty,
  ExerciseLibraryItem,
  WorkoutDayItem,
  WorkoutExerciseItem,
  WorkoutTemplate,
  WorkoutType,
} from "@/lib/mock-workouts";

const TYPE_LABEL: Record<WorkoutType, string> = {
  STRENGTH: "Forza",
  HYPERTROPHY: "Ipertrofia",
  POWERLIFTING: "Powerlifting",
  CONDITIONING: "Condizionamento",
  CUSTOM: "Custom",
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzato",
  EXPERT: "Expert",
};

const SUPERSET_COLORS = [
  "#c9a96e",
  "#60a5fa",
  "#a78bfa",
  "#34d399",
  "#f472b6",
];

function colorForGroup(group: string | null) {
  if (!group) return null;
  const idx = Math.abs(hashCode(group)) % SUPERSET_COLORS.length;
  return SUPERSET_COLORS[idx];
}

function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

type ExerciseCardProps = {
  exercise: WorkoutExerciseItem;
  selected: boolean;
  onToggleSelect: () => void;
  onChange: (patch: Partial<WorkoutExerciseItem>) => void;
  onRemove: () => void;
};

function ExerciseCard({
  exercise,
  selected,
  onToggleSelect,
  onChange,
  onRemove,
}: ExerciseCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: exercise.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const [notesOpen, setNotesOpen] = React.useState(false);
  const groupColor = colorForGroup(exercise.supersetGroup);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-border bg-background/40 relative flex flex-col gap-3 overflow-hidden rounded-md border p-3",
        selected && "ring-primary/60 ring-2",
      )}
    >
      {groupColor && (
        <span
          className="absolute top-0 bottom-0 left-0 w-1.5"
          style={{ background: groupColor }}
          aria-hidden
        />
      )}

      <div className="flex items-start gap-3 pl-2">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground mt-1.5 cursor-grab touch-none"
          {...attributes}
          {...listeners}
          aria-label="Trascina"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="accent-primary mt-2 h-4 w-4"
          title="Seleziona per superset"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{exercise.exerciseName}</p>
            {exercise.supersetGroup && (
              <Badge
                className="text-[10px]"
                style={{
                  background: `${groupColor}20`,
                  color: groupColor ?? undefined,
                }}
              >
                Superset
              </Badge>
            )}
            {exercise.notes && (
              <StickyNote className="h-3.5 w-3.5 text-yellow-400" />
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div>
              <label className="text-muted-foreground block text-[10px] uppercase">
                Set
              </label>
              <Input
                type="number"
                min={1}
                value={exercise.sets}
                onChange={(e) => onChange({ sets: Number(e.target.value) })}
                className="h-9"
              />
            </div>
            <div>
              <label className="text-muted-foreground block text-[10px] uppercase">
                Reps
              </label>
              <Input
                value={exercise.reps}
                onChange={(e) => onChange({ reps: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <label className="text-muted-foreground block text-[10px] uppercase">
                RPE
              </label>
              <Input
                type="number"
                step="0.5"
                value={exercise.rpe ?? ""}
                onChange={(e) =>
                  onChange({
                    rpe: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="h-9"
              />
            </div>
            <div>
              <label className="text-muted-foreground block text-[10px] uppercase">
                Tempo
              </label>
              <Input
                placeholder="3-1-2-0"
                value={exercise.tempo ?? ""}
                onChange={(e) => onChange({ tempo: e.target.value || null })}
                className="h-9"
              />
            </div>
            <div>
              <label className="text-muted-foreground block text-[10px] uppercase">
                Rest (s)
              </label>
              <Input
                type="number"
                value={exercise.restSeconds ?? ""}
                onChange={(e) =>
                  onChange({
                    restSeconds: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="h-9"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setNotesOpen((o) => !o)}
            className="hover:bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded"
            title="Note"
          >
            <StickyNote className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="hover:bg-destructive/20 text-destructive flex h-8 w-8 items-center justify-center rounded"
            title="Rimuovi"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {(notesOpen || exercise.notes) && (
        <div className="ml-8 rounded-md bg-yellow-400/5 p-3 ring-1 ring-yellow-400/20">
          <label className="text-muted-foreground mb-1 block text-[10px] uppercase">
            Note esercizio
          </label>
          <Textarea
            value={exercise.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value || null })}
            placeholder="Istruzioni, cue, varianti..."
            rows={2}
            className="bg-background/60 text-base"
          />
        </div>
      )}
    </li>
  );
}

type Props = {
  template: WorkoutTemplate;
};

export function WorkoutEditor({ template: initial }: Props) {
  const router = useRouter();
  const [template, setTemplate] = React.useState<WorkoutTemplate>(initial);
  const [activeDayId, setActiveDayId] = React.useState<string>(
    initial.days[0]?.id ?? "",
  );
  const [tagDraft, setTagDraft] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeDay =
    template.days.find((d) => d.id === activeDayId) ?? template.days[0] ?? null;

  const saveMutation = useMutation({
    mutationFn: async (t: WorkoutTemplate) => {
      const res = await fetch(`/api/workouts/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(t),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      return res.json();
    },
    onSuccess: () => toast.success("Scheda salvata"),
    onError: (e: Error) => toast.error(e.message),
  });

  function patch(mut: (t: WorkoutTemplate) => WorkoutTemplate) {
    setTemplate((prev) => mut(prev));
  }

  function addDay() {
    const dayLetter = String.fromCharCode(65 + template.days.length);
    const newDay: WorkoutDayItem = {
      id: generateId("d"),
      name: `Giorno ${dayLetter}`,
      notes: null,
      exercises: [],
    };
    patch((t) => ({ ...t, days: [...t.days, newDay] }));
    setActiveDayId(newDay.id);
  }

  function renameDay(id: string, name: string) {
    patch((t) => ({
      ...t,
      days: t.days.map((d) => (d.id === id ? { ...d, name } : d)),
    }));
  }

  function removeDay(id: string) {
    patch((t) => ({ ...t, days: t.days.filter((d) => d.id !== id) }));
    if (activeDayId === id && template.days.length > 1) {
      setActiveDayId(template.days[0]!.id);
    }
  }

  function addExercise(ex: ExerciseLibraryItem) {
    if (!activeDay) return;
    const newExercise: WorkoutExerciseItem = {
      id: generateId("we"),
      exerciseId: ex.id,
      exerciseName: ex.name,
      orderIndex: activeDay.exercises.length,
      sets: 3,
      reps: "8-10",
      rpe: null,
      tempo: null,
      restSeconds: 90,
      notes: null,
      supersetGroup: null,
    };
    patch((t) => ({
      ...t,
      days: t.days.map((d) =>
        d.id === activeDay.id
          ? { ...d, exercises: [...d.exercises, newExercise] }
          : d,
      ),
    }));
  }

  function updateExercise(
    exerciseId: string,
    mut: Partial<WorkoutExerciseItem>,
  ) {
    if (!activeDay) return;
    patch((t) => ({
      ...t,
      days: t.days.map((d) =>
        d.id === activeDay.id
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                e.id === exerciseId ? { ...e, ...mut } : e,
              ),
            }
          : d,
      ),
    }));
  }

  function removeExercise(exerciseId: string) {
    if (!activeDay) return;
    patch((t) => ({
      ...t,
      days: t.days.map((d) =>
        d.id === activeDay.id
          ? { ...d, exercises: d.exercises.filter((e) => e.id !== exerciseId) }
          : d,
      ),
    }));
    setSelected((s) => {
      const n = new Set(s);
      n.delete(exerciseId);
      return n;
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!activeDay || !over || active.id === over.id) return;
    const oldIdx = activeDay.exercises.findIndex((x) => x.id === active.id);
    const newIdx = activeDay.exercises.findIndex((x) => x.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(activeDay.exercises, oldIdx, newIdx).map(
      (e, i) => ({ ...e, orderIndex: i }),
    );
    patch((t) => ({
      ...t,
      days: t.days.map((d) =>
        d.id === activeDay.id ? { ...d, exercises: reordered } : d,
      ),
    }));
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function groupAsSuperset() {
    if (selected.size < 2) {
      toast.error("Seleziona almeno 2 esercizi");
      return;
    }
    const groupId = generateId("sg");
    if (!activeDay) return;
    patch((t) => ({
      ...t,
      days: t.days.map((d) =>
        d.id === activeDay.id
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                selected.has(e.id) ? { ...e, supersetGroup: groupId } : e,
              ),
            }
          : d,
      ),
    }));
    setSelected(new Set());
    toast.success(
      `Creato ${selected.size === 2 ? "superset" : "giant set"} con ${selected.size} esercizi`,
    );
  }

  function ungroup() {
    if (selected.size === 0) return;
    if (!activeDay) return;
    patch((t) => ({
      ...t,
      days: t.days.map((d) =>
        d.id === activeDay.id
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                selected.has(e.id) ? { ...e, supersetGroup: null } : e,
              ),
            }
          : d,
      ),
    }));
    setSelected(new Set());
  }

  function addTag() {
    const value = tagDraft.trim();
    if (!value) return;
    if (template.tags.includes(value)) return;
    patch((t) => ({ ...t, tags: [...t.tags, value] }));
    setTagDraft("");
  }

  function removeTag(tag: string) {
    patch((t) => ({ ...t, tags: t.tags.filter((x) => x !== tag) }));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Input
                value={template.name}
                onChange={(e) =>
                  patch((t) => ({ ...t, name: e.target.value }))
                }
                placeholder="Nome scheda"
                className="font-heading !h-auto border-0 !px-0 !text-2xl font-semibold shadow-none focus-visible:ring-0"
              />
              <Input
                value={template.description ?? ""}
                onChange={(e) =>
                  patch((t) => ({ ...t, description: e.target.value || null }))
                }
                placeholder="Descrizione breve..."
                className="text-muted-foreground mt-1 !h-auto border-0 !px-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="hover:bg-muted inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium"
              >
                <Eye className="h-4 w-4" />
                Anteprima
              </button>
              <button
                type="button"
                onClick={() => setAssignOpen(true)}
                className="hover:bg-muted inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium"
              >
                <UserPlus className="h-4 w-4" />
                Assegna
              </button>
              <button
                type="button"
                onClick={() => saveMutation.mutate(template)}
                disabled={saveMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Salva
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Select
              value={template.type}
              onValueChange={(v) =>
                patch((t) => ({ ...t, type: v as WorkoutType }))
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={template.difficulty}
              onValueChange={(v) =>
                patch((t) => ({ ...t, difficulty: v as Difficulty }))
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DIFFICULTY_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {template.tags.map((t) => (
                <Badge
                  key={t}
                  className="bg-primary/10 text-primary gap-1 py-1 pr-1"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="hover:bg-primary/20 flex h-4 w-4 items-center justify-center rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Input
                placeholder="+ tag"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="h-9 w-32"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DAY TABS */}
      <div className="flex flex-wrap items-center gap-2">
        {template.days.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setActiveDayId(d.id)}
            className={cn(
              "border-border hover:bg-muted inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm",
              activeDayId === d.id && "bg-primary/10 text-primary border-primary/40",
            )}
          >
            {d.name}
          </button>
        ))}
        <button
          type="button"
          onClick={addDay}
          className="text-muted-foreground hover:bg-muted inline-flex h-10 items-center gap-1 rounded-md border border-dashed px-3 text-sm"
        >
          <Plus className="h-4 w-4" /> Giorno
        </button>
      </div>

      {/* ACTIVE DAY */}
      {activeDay ? (
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Input
                value={activeDay.name}
                onChange={(e) => renameDay(activeDay.id, e.target.value)}
                className="!h-auto max-w-sm border-0 !px-0 !text-lg font-semibold shadow-none focus-visible:ring-0"
              />
              <div className="flex gap-2">
                {selected.size >= 2 && (
                  <button
                    type="button"
                    onClick={groupAsSuperset}
                    className="bg-primary/10 text-primary hover:bg-primary/20 inline-flex h-9 items-center gap-1 rounded-md px-3 text-xs font-medium"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Raggruppa ({selected.size})
                  </button>
                )}
                {selected.size > 0 && (
                  <button
                    type="button"
                    onClick={ungroup}
                    className="hover:bg-muted inline-flex h-9 items-center gap-1 rounded-md border px-3 text-xs"
                  >
                    <Link2Off className="h-3.5 w-3.5" />
                    Separa
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-1 rounded-md px-3 text-xs font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Aggiungi esercizio
                </button>
                {template.days.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDay(activeDay.id)}
                    className="hover:bg-destructive/20 text-destructive inline-flex h-9 w-9 items-center justify-center rounded-md border"
                    title="Elimina giorno"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {activeDay.exercises.length === 0 ? (
              <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
                Nessun esercizio. Clicca &quot;Aggiungi esercizio&quot; per iniziare.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={activeDay.exercises.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="flex flex-col gap-2">
                    {activeDay.exercises.map((e) => (
                      <ExerciseCard
                        key={e.id}
                        exercise={e}
                        selected={selected.has(e.id)}
                        onToggleSelect={() => toggleSelect(e.id)}
                        onChange={(p) => updateExercise(e.id, p)}
                        onRemove={() => removeExercise(e.id)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="text-muted-foreground">Aggiungi il primo giorno.</p>
      )}

      <ExerciseSearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onAdd={addExercise}
      />
      <AssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        templateId={template.id}
      />

      {/* Preview dialog */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <Card
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-2xl font-semibold">
                  {template.name}
                </h2>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="hover:bg-muted flex h-9 w-9 items-center justify-center rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-muted-foreground text-sm">
                {template.description}
              </p>
              {template.days.map((d) => (
                <div key={d.id} className="border-border rounded-md border p-4">
                  <h3 className="font-semibold">{d.name}</h3>
                  <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                    {d.exercises.map((e) => (
                      <li key={e.id} className="flex items-center gap-2">
                        <span className="flex-1">{e.exerciseName}</span>
                        <span className="text-muted-foreground font-mono text-xs">
                          {e.sets} × {e.reps}
                          {e.rpe ? ` @${e.rpe}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
