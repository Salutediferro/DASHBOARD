"use client";

import * as React from "react";
import { toast } from "sonner";
import { Camera, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  FOOD_CONFIDENCE_CLASSES,
  FOOD_CONFIDENCE_LABELS,
  type AnalyzedFood,
} from "@/lib/validators/nutrition-log";
import {
  useAnalyzeFoodPhoto,
  useCreateNutritionLog,
} from "@/lib/hooks/use-nutrition-logs";

type Phase = "idle" | "preview" | "analyzing" | "results";

function emptyFood(): AnalyzedFood {
  return {
    name: "",
    estimatedGrams: 100,
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    confidence: "MEDIUM",
  };
}

export function FoodPhotoCapture() {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [foods, setFoods] = React.useState<AnalyzedFood[]>([]);
  const [modalOpen, setModalOpen] = React.useState(false);

  const analyze = useAnalyzeFoodPhoto();
  const save = useCreateNutritionLog();

  const totals = React.useMemo(
    () =>
      foods.reduce(
        (a, f) => ({
          cal: a.cal + f.calories,
          p: a.p + f.protein,
          c: a.c + f.carbs,
          fat: a.fat + f.fats,
        }),
        { cal: 0, p: 0, c: 0, fat: 0 },
      ),
    [foods],
  );

  const reset = React.useCallback(() => {
    setPhase("idle");
    setLocalPreview(null);
    setPhotoUrl(null);
    setFoods([]);
    setModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Seleziona un'immagine");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Immagine troppo grande (max 10MB)");
      return;
    }
    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    setPhase("preview");
    setModalOpen(true);

    setUploading(true);
    try {
      const supabase = createSupabaseClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `meals/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("meal-photos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        toast.error(
          upErr.message.includes("not found")
            ? "Bucket 'meal-photos' non configurato su Supabase"
            : `Upload fallito: ${upErr.message}`,
        );
        reset();
        return;
      }
      const { data: pub } = supabase.storage.from("meal-photos").getPublicUrl(path);
      setPhotoUrl(pub.publicUrl);
    } catch (e) {
      toast.error((e as Error).message);
      reset();
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!photoUrl) return;
    setPhase("analyzing");
    try {
      const result = await analyze.mutateAsync(photoUrl);
      setFoods(result.foods);
      setPhase("results");
      if (result.mock) {
        toast.info("Analisi mock (OPENAI_API_KEY non configurata)");
      } else if (result.foods.length === 0) {
        toast.warning("Nessun alimento riconosciuto");
      }
    } catch (e) {
      toast.error((e as Error).message);
      setPhase("preview");
    }
  };

  const handleSave = async () => {
    if (!photoUrl || foods.length === 0) return;
    try {
      await save.mutateAsync({ photoUrl, foods });
      toast.success("Pasto salvato");
      reset();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const updateFood = (idx: number, patch: Partial<AnalyzedFood>) => {
    setFoods((xs) => xs.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };
  const removeFood = (idx: number) => {
    setFoods((xs) => xs.filter((_, i) => i !== idx));
  };
  const addFood = () => setFoods((xs) => [...xs, emptyFood()]);

  return (
    <>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
          <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
            <Camera className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">Scatta foto del pasto</p>
            <p className="text-muted-foreground text-xs">
              L'AI riconosce gli alimenti e stima calorie e macro
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            size="lg"
            className="gap-2"
          >
            <Camera className="h-4 w-4" />
            Apri fotocamera
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={modalOpen}
        onOpenChange={(o) => {
          if (!o) reset();
          else setModalOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {phase === "results" ? "Alimenti riconosciuti" : "Foto del pasto"}
            </DialogTitle>
            <DialogDescription>
              {phase === "preview" && "Verifica la foto, poi avvia l'analisi AI."}
              {phase === "analyzing" && "L'AI sta scansionando il piatto..."}
              {phase === "results" && "Modifica quantità, rimuovi o aggiungi alimenti."}
            </DialogDescription>
          </DialogHeader>

          {localPreview && (
            <div className="relative aspect-video overflow-hidden rounded-md bg-black">
              {}
              <img
                src={localPreview}
                alt="Pasto"
                className={cn(
                  "h-full w-full object-cover",
                  phase === "analyzing" && "opacity-60",
                )}
              />
              {phase === "analyzing" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-background/80 flex flex-col items-center gap-2 rounded-md px-4 py-3 backdrop-blur">
                    <div className="relative">
                      <Sparkles className="text-primary h-6 w-6 animate-pulse" />
                      <div className="border-primary absolute inset-0 animate-ping rounded-full border-2 opacity-30" />
                    </div>
                    <p className="text-xs font-medium">Analisi in corso…</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {phase === "preview" && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={handleAnalyze} disabled={uploading || !photoUrl} className="gap-2">
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Upload in corso…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analizza
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={reset}>
                Annulla
              </Button>
            </div>
          )}

          {phase === "results" && (
            <div className="flex flex-col gap-3">
              {foods.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Nessun alimento. Aggiungine uno manualmente.
                </p>
              )}

              {foods.map((f, i) => (
                <Card key={i}>
                  <CardContent className="flex flex-col gap-2 p-3">
                    <div className="flex items-start gap-2">
                      <Input
                        value={f.name}
                        onChange={(e) => updateFood(i, { name: e.target.value })}
                        placeholder="Nome alimento"
                        className="flex-1"
                      />
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-medium",
                          FOOD_CONFIDENCE_CLASSES[f.confidence],
                        )}
                      >
                        {FOOD_CONFIDENCE_LABELS[f.confidence]}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFood(i)}
                        className="hover:bg-muted text-muted-foreground flex h-9 w-9 items-center justify-center rounded-md"
                        aria-label="Rimuovi"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      <NumField
                        label="g"
                        value={f.estimatedGrams}
                        onChange={(v) => updateFood(i, { estimatedGrams: v })}
                      />
                      <NumField
                        label="kcal"
                        value={f.calories}
                        onChange={(v) => updateFood(i, { calories: v })}
                      />
                      <NumField
                        label="P"
                        value={f.protein}
                        onChange={(v) => updateFood(i, { protein: v })}
                      />
                      <NumField
                        label="C"
                        value={f.carbs}
                        onChange={(v) => updateFood(i, { carbs: v })}
                      />
                      <NumField
                        label="F"
                        value={f.fats}
                        onChange={(v) => updateFood(i, { fats: v })}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button variant="outline" onClick={addFood} className="gap-2">
                <Plus className="h-4 w-4" />
                Aggiungi alimento
              </Button>

              <Card className="bg-muted/40">
                <CardContent className="grid grid-cols-4 gap-2 p-3 text-center text-xs">
                  <Totals label="kcal" value={totals.cal} />
                  <Totals label="P" value={totals.p} />
                  <Totals label="C" value={totals.c} />
                  <Totals label="F" value={totals.fat} />
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleSave}
                  disabled={save.isPending || foods.length === 0}
                  className="gap-2"
                >
                  {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Conferma e logga pasto
                </Button>
                <Button variant="outline" onClick={reset}>
                  <X className="mr-1 h-4 w-4" />
                  Scarta
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-[10px] uppercase">{label}</span>
      <Input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-8 px-2 text-sm tabular-nums"
      />
    </label>
  );
}

function Totals({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-muted-foreground text-[10px] uppercase">{label}</p>
      <p className="text-sm font-bold tabular-nums">{Math.round(value)}</p>
    </div>
  );
}
