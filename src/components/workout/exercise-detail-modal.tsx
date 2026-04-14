"use client";

import * as React from "react";
import { toast } from "sonner";
import { Dumbbell, Upload } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExerciseLibraryItem } from "@/lib/mock-workouts";
import {
  EQUIPMENT_LABELS,
  MUSCLE_BADGE_CLASSES,
  MUSCLE_LABELS,
} from "@/lib/validators/exercise";
import { useDeleteExercise, useUpdateExercise } from "@/lib/hooks/use-exercises";

type ExerciseFull = ExerciseLibraryItem & {
  isGlobal?: boolean;
  organizationId?: string | null;
};

type Props = {
  exercise: ExerciseFull | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (ex: ExerciseFull) => void;
};

export function ExerciseDetailModal({ exercise, open, onOpenChange, onEdit }: Props) {
  const del = useDeleteExercise();
  const update = useUpdateExercise();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  if (!exercise) return null;
  const canEdit = !exercise.isGlobal;

  const handleUploadVideo = async (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video troppo grande (max 100MB)");
      return;
    }
    setUploading(true);
    try {
      const supabase = createSupabaseClient();
      const ext = file.name.split(".").pop() || "mp4";
      const path = `exercises/${exercise.id}/video-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("exercise-videos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        toast.error(
          upErr.message.includes("not found")
            ? "Bucket 'exercise-videos' non configurato"
            : `Upload fallito: ${upErr.message}`,
        );
        return;
      }
      const { data: pub } = supabase.storage
        .from("exercise-videos")
        .getPublicUrl(path);
      await update.mutateAsync({ id: exercise.id, data: { videoUrl: pub.publicUrl } });
      toast.success("Video caricato");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!confirm("Eliminare questo esercizio?")) return;
    try {
      await del.mutateAsync(exercise.id);
      toast.success("Esercizio eliminato");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{exercise.nameIt}</DialogTitle>
          <DialogDescription>{exercise.name}</DialogDescription>
          <div className="flex flex-wrap gap-1 pt-1">
            <span
              className={cn(
                "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium",
                MUSCLE_BADGE_CLASSES[exercise.muscleGroup],
              )}
            >
              {MUSCLE_LABELS[exercise.muscleGroup]}
            </span>
            {exercise.secondaryMuscles?.map((m) => (
              <span
                key={m}
                className={cn(
                  "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px]",
                  MUSCLE_BADGE_CLASSES[m],
                )}
              >
                {MUSCLE_LABELS[m]}
              </span>
            ))}
            <span className="border-border text-muted-foreground inline-flex items-center rounded border px-1.5 py-0.5 text-[10px]">
              {EQUIPMENT_LABELS[exercise.equipment]}
            </span>
          </div>
        </DialogHeader>

        <div className="bg-muted relative flex aspect-video items-center justify-center overflow-hidden rounded-md">
          {exercise.videoUrl ? (
            <video
              key={exercise.videoUrl}
              controls
              poster={exercise.thumbnailUrl ?? undefined}
              className="h-full w-full"
            >
              <source src={exercise.videoUrl} />
            </video>
          ) : (
            <div className="text-muted-foreground flex flex-col items-center gap-2 text-xs">
              <Dumbbell className="h-10 w-10" />
              Video non disponibile
            </div>
          )}
        </div>
        <div className="flex justify-end pt-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUploadVideo(f);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1 h-3 w-3" />
            {uploading
              ? "Caricamento..."
              : exercise.videoUrl
                ? "Sostituisci video"
                : "Carica video"}
          </Button>
        </div>

        <Tabs defaultValue="desc">
          <TabsList>
            <TabsTrigger value="desc">Descrizione</TabsTrigger>
            <TabsTrigger value="steps">Istruzioni</TabsTrigger>
            <TabsTrigger value="tips">Tips</TabsTrigger>
            <TabsTrigger value="mistakes">Errori</TabsTrigger>
            <TabsTrigger value="variants">Varianti</TabsTrigger>
          </TabsList>
          <TabsContent value="desc" className="text-sm">
            {exercise.description || (
              <p className="text-muted-foreground">Nessuna descrizione</p>
            )}
          </TabsContent>
          <TabsContent value="steps" className="text-sm">
            {exercise.steps && exercise.steps.length > 0 ? (
              <ol className="list-inside list-decimal space-y-1">
                {exercise.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground">Nessuna istruzione</p>
            )}
          </TabsContent>
          <TabsContent value="tips" className="text-sm">
            {exercise.tips && exercise.tips.length > 0 ? (
              <ul className="list-inside list-disc space-y-1">
                {exercise.tips.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Nessun tip</p>
            )}
          </TabsContent>
          <TabsContent value="mistakes" className="text-sm">
            {exercise.commonMistakes && exercise.commonMistakes.length > 0 ? (
              <ul className="list-inside list-disc space-y-1">
                {exercise.commonMistakes.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Nessun errore comune</p>
            )}
          </TabsContent>
          <TabsContent value="variants" className="text-sm">
            {exercise.variants && exercise.variants.length > 0 ? (
              <ul className="list-inside list-disc space-y-1">
                {exercise.variants.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Nessuna variante</p>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            onClick={() => toast.info("Seleziona una scheda dall'editor")}
          >
            Aggiungi a Programma
          </Button>
          {canEdit && onEdit && (
            <Button variant="outline" onClick={() => onEdit(exercise)}>
              Modifica
            </Button>
          )}
          {canEdit && (
            <Button variant="destructive" onClick={handleDelete} disabled={del.isPending}>
              Elimina
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
