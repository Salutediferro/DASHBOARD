"use client";

import * as React from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { MedicalReportCategory } from "@prisma/client";

import { Button } from "@/components/ui/button";
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUploadMedicalReport } from "@/lib/hooks/use-medical-records";
import {
  MEDICAL_REPORT_CATEGORIES,
  MEDICAL_REPORT_CATEGORY_LABELS,
} from "@/lib/validators/medical-report";
import { cn } from "@/lib/utils";

const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
];

type Props = {
  /** Patient id for doctor uploads. Omit for a patient uploading for themselves. */
  patientId?: string;
  onSuccess?: () => void;
};

export function ReportUpload({ patientId, onSuccess }: Props) {
  const [file, setFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState("");
  const [category, setCategory] =
    React.useState<MedicalReportCategory>("OTHER");
  const [notes, setNotes] = React.useState("");
  const [issuedAt, setIssuedAt] = React.useState("");
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const upload = useUploadMedicalReport();

  function pickFile(f: File) {
    if (f.size > MAX_SIZE) {
      toast.error("File troppo grande (max 20MB)");
      return;
    }
    if (!ALLOWED_MIME.includes(f.type)) {
      toast.error("Formato non supportato");
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Seleziona un file");
      return;
    }
    if (!title.trim()) {
      toast.error("Il titolo è obbligatorio");
      return;
    }

    try {
      await upload.mutateAsync({
        file,
        title: title.trim(),
        category,
        notes: notes.trim() || null,
        issuedAt: issuedAt || null,
        patientId,
      });
      toast.success("Referto caricato");
      setFile(null);
      setTitle("");
      setCategory("OTHER");
      setNotes("");
      setIssuedAt("");
      if (inputRef.current) inputRef.current.value = "";
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Carica referto</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "border-border flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
              dragging && "bg-primary/5 border-primary",
            )}
          >
            {file ? (
              <div className="flex w-full items-center justify-between">
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="text-muted-foreground h-8 w-8" />
                <p className="text-muted-foreground text-sm">
                  Trascina un file qui oppure
                </p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  seleziona dal dispositivo
                </button>
                <p className="text-muted-foreground text-xs">
                  PDF, PNG, JPEG, WEBP, HEIC — max 20MB
                </p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_MIME.join(",")}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickFile(f);
              }}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Titolo</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Emocromo completo"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select
                value={category}
                onValueChange={(v) =>
                  setCategory(v as MedicalReportCategory)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEDICAL_REPORT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {MEDICAL_REPORT_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="issuedAt">Data emissione</Label>
              <Input
                id="issuedAt"
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Osservazioni opzionali"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={upload.isPending || !file}>
              {upload.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Carica referto
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
