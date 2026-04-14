"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { VideoUploader } from "@/components/workout/video-uploader";
import { ThumbnailUploader } from "@/components/workout/thumbnail-uploader";
import { createClient } from "@/lib/supabase/client";
import { useCreateExercise, useUpdateExercise } from "@/lib/hooks/use-exercises";
import {
  createExerciseSchema,
  EQUIPMENTS,
  EQUIPMENT_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  VISIBILITIES,
  type CreateExerciseInput,
} from "@/lib/validators/exercise";
// Schema is used to validate payload manually before submit.
void createExerciseSchema;
import type { Equipment, MuscleGroup } from "@/lib/mock-workouts";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const VISIBILITY_LABEL: Record<(typeof VISIBILITIES)[number], string> = {
  PRIVATE: "Privato",
  ORGANIZATION: "Organizzazione",
  GLOBAL: "Globale (solo admin)",
};

type FormValues = {
  name: string;
  nameIt: string;
  muscleGroup: (typeof MUSCLE_GROUPS)[number];
  equipment: (typeof EQUIPMENTS)[number];
  description: string;
  visibility: (typeof VISIBILITIES)[number];
};

export function CreateExerciseForm({ open, onOpenChange }: Props) {
  const createMutation = useCreateExercise();
  const updateMutation = useUpdateExercise();
  const [videoFile, setVideoFile] = React.useState<File | null>(null);
  const [thumbFile, setThumbFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [videoProgress, setVideoProgress] = React.useState<number | null>(null);

  const [secondaryMuscles, setSecondaryMuscles] = React.useState<MuscleGroup[]>([]);
  const [steps, setSteps] = React.useState<string[]>([]);
  const [tips, setTips] = React.useState<string[]>([]);
  const [mistakes, setMistakes] = React.useState<string[]>([]);
  const [variants, setVariants] = React.useState<string[]>([]);

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      nameIt: "",
      muscleGroup: "CHEST",
      equipment: "BARBELL",
      description: "",
      visibility: "PRIVATE",
    },
  });

  const { control, register, handleSubmit, reset, formState } = form;

  const onSubmit = async (values: FormValues) => {
    try {
      setUploading(true);
      const payload: CreateExerciseInput = {
        name: values.name,
        nameIt: values.nameIt,
        muscleGroup: values.muscleGroup,
        equipment: values.equipment,
        description: values.description || undefined,
        secondaryMuscles,
        steps,
        tips,
        commonMistakes: mistakes,
        variants,
        visibility: values.visibility,
      };
      const created = await createMutation.mutateAsync(payload);
      const exerciseId = created.exercise.id;

      let videoUrl: string | null = null;
      let thumbnailUrl: string | null = null;

      if (videoFile || thumbFile) {
        const supabase = createClient();
        try {
          if (videoFile) {
            setVideoProgress(null);
            const ext = videoFile.name.endsWith(".webm") ? "webm" : "mp4";
            const path = `exercises/${exerciseId}/video.${ext}`;
            const { data, error } = await supabase.storage
              .from("exercise-videos")
              .upload(path, videoFile, { upsert: true });
            if (error) throw error;
            const { data: pub } = supabase.storage
              .from("exercise-videos")
              .getPublicUrl(data.path);
            videoUrl = pub.publicUrl;
          }
          if (thumbFile) {
            const path = `exercises/${exerciseId}/thumbnail.jpg`;
            const { data, error } = await supabase.storage
              .from("exercise-videos")
              .upload(path, thumbFile, { upsert: true });
            if (error) throw error;
            const { data: pub } = supabase.storage
              .from("exercise-videos")
              .getPublicUrl(data.path);
            thumbnailUrl = pub.publicUrl;
          }
          if (videoUrl || thumbnailUrl) {
            await updateMutation.mutateAsync({
              id: exerciseId,
              data: {
                ...(videoUrl && { videoUrl }),
                ...(thumbnailUrl && { thumbnailUrl }),
              },
            });
          }
        } catch (err) {
          console.error(err);
          toast.error("Bucket 'exercise-videos' non configurato");
        }
      }

      toast.success("Esercizio creato");
      reset();
      setSecondaryMuscles([]);
      setSteps([]);
      setTips([]);
      setMistakes([]);
      setVariants([]);
      setVideoFile(null);
      setThumbFile(null);
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      setVideoProgress(null);
    }
  };

  const renderArray = (
    label: string,
    items: string[],
    setItems: (v: string[]) => void,
  ) => (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {items.map((value, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              setItems(next);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setItems(items.filter((_, j) => j !== i))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setItems([...items, ""])}
      >
        <Plus className="mr-1 h-3 w-3" /> Aggiungi
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuovo esercizio</DialogTitle>
          <DialogDescription>
            Aggiungi un esercizio alla libreria
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Nome (EN)</Label>
              <Input {...register("name")} />
              {formState.errors.name && (
                <p className="text-destructive text-xs">
                  {formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Nome (IT)</Label>
              <Input {...register("nameIt")} />
              {formState.errors.nameIt && (
                <p className="text-destructive text-xs">
                  {formState.errors.nameIt.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Gruppo muscolare</Label>
              <Controller
                control={control}
                name="muscleGroup"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MUSCLE_GROUPS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {MUSCLE_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Attrezzatura</Label>
              <Controller
                control={control}
                name="equipment"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPMENTS.map((e) => (
                        <SelectItem key={e} value={e}>
                          {EQUIPMENT_LABELS[e]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Muscoli secondari</Label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button variant="outline" className="justify-start">
                    {secondaryMuscles.length === 0
                      ? "Nessuno"
                      : `${secondaryMuscles.length} selezionati`}
                  </Button>
                }
              />
              <PopoverContent className="max-h-72 w-64 overflow-y-auto">
                <div className="flex flex-col gap-1">
                  {MUSCLE_GROUPS.map((m) => {
                    const checked = secondaryMuscles.includes(m as MuscleGroup);
                    return (
                      <label
                        key={m}
                        className={cn(
                          "hover:bg-accent flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm",
                          checked && "bg-accent/60",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked
                              ? secondaryMuscles.filter((x) => x !== m)
                              : [...secondaryMuscles, m as MuscleGroup];
                            setSecondaryMuscles(next);
                          }}
                          className="accent-primary h-4 w-4"
                        />
                        {MUSCLE_LABELS[m]}
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Descrizione</Label>
            <Textarea rows={3} {...register("description")} />
          </div>

          {renderArray("Istruzioni", steps, setSteps)}
          {renderArray("Tips", tips, setTips)}
          {renderArray("Errori comuni", mistakes, setMistakes)}
          {renderArray("Varianti", variants, setVariants)}

          <div className="flex flex-col gap-1.5">
            <Label>Visibilità</Label>
            <Controller
              control={control}
              name="visibility"
              render={({ field }) => (
                <div className="flex flex-wrap gap-3">
                  {VISIBILITIES.map((v) => (
                    <label
                      key={v}
                      className="flex cursor-pointer items-center gap-1.5 text-sm"
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={v}
                        checked={field.value === v}
                        onChange={() => field.onChange(v)}
                        className="accent-primary"
                      />
                      {VISIBILITY_LABEL[v]}
                    </label>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Video</Label>
              <VideoUploader
                file={videoFile}
                setFile={setVideoFile}
                uploading={uploading && !!videoFile}
                progress={videoProgress}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Thumbnail</Label>
              <ThumbnailUploader file={thumbFile} setFile={setThumbFile} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={createMutation.isPending || uploading}>
              {createMutation.isPending || uploading ? "Salvataggio..." : "Crea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
