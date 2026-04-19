"use client";

import * as React from "react";
import {
  Activity,
  FileText,
  FlaskConical,
  Heart,
  Image as ImageIcon,
  Loader2,
  Pill,
  ScanLine,
  Scissors,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { MedicalReportCategory } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUploadMedicalReport } from "@/lib/hooks/use-medical-records";
import {
  MEDICAL_REPORT_CATEGORIES,
  MEDICAL_REPORT_CATEGORY_LABELS,
} from "@/lib/validators/medical-report";
import { cn } from "@/lib/utils";

const MAX_SIZE = 20 * 1024 * 1024;
const MAX_SIZE_LABEL = "20 MB";
const ALLOWED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
] as const;
const ALLOWED_LABEL = "PDF · PNG · JPEG · WEBP · HEIC";

const CATEGORY_ICON: Record<MedicalReportCategory, LucideIcon> = {
  BLOOD_TEST: FlaskConical,
  IMAGING: ScanLine,
  CARDIOLOGY: Heart,
  ENDOCRINOLOGY: Activity,
  GENERAL_VISIT: Stethoscope,
  PRESCRIPTION: Pill,
  VACCINATION: Syringe,
  SURGERY: Scissors,
  OTHER: FileText,
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function iconForFile(mime: string): React.ReactElement {
  const props = { className: "h-5 w-5" } as const;
  if (mime.startsWith("image/")) return <ImageIcon {...props} />;
  return <FileText {...props} />;
}

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
  const today = new Date().toISOString().slice(0, 10);
  const [issuedAt, setIssuedAt] = React.useState<string>(today);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const upload = useUploadMedicalReport();

  function pickFile(f: File) {
    if (f.size > MAX_SIZE) {
      toast.error(`Referto troppo grande — limite ${MAX_SIZE_LABEL}.`);
      return;
    }
    if (!ALLOWED_MIME.includes(f.type as (typeof ALLOWED_MIME)[number])) {
      toast.error("Formato non supportato.");
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  function clearFile() {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
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
      toast.error("Aggiungi prima un referto da caricare.");
      return;
    }
    if (!title.trim()) {
      toast.error("Inserisci un titolo per il referto.");
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
      toast.success("Referto caricato — ora puoi decidere chi può vederlo.");
      setFile(null);
      setTitle("");
      setCategory("OTHER");
      setNotes("");
      setIssuedAt(today);
      if (inputRef.current) inputRef.current.value = "";
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  const fileIcon = file ? iconForFile(file.type) : null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* ── Dropzone ─────────────────────────── */}
      <label
        htmlFor="report-file-input"
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragging) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "focus-within:ring-2 focus-within:ring-ring/50",
          "relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-5 text-center transition-colors",
          dragging
            ? "border-primary-500/60 bg-primary-500/5"
            : "border-border/60 bg-muted/20 hover:bg-muted/30",
          file && "cursor-default",
        )}
        aria-label="Area di caricamento referto"
      >
        {file && fileIcon ? (
          <div className="flex w-full items-center gap-3">
            <span
              aria-hidden
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-primary-500"
            >
              {fileIcon}
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatSize(file.size)} · {formatMime(file.type)}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                clearFile();
              }}
              aria-label="Rimuovi referto selezionato"
              className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <Upload
              className={cn(
                "h-7 w-7 transition-colors",
                dragging ? "text-primary-500" : "text-muted-foreground",
              )}
              aria-hidden
            />
            <p className="text-sm">
              Trascina qui il referto oppure{" "}
              <span className="font-medium text-primary-500 underline underline-offset-2">
                sfoglia dal dispositivo
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {ALLOWED_LABEL} — max {MAX_SIZE_LABEL}
            </p>
          </>
        )}
        <input
          ref={inputRef}
          id="report-file-input"
          type="file"
          accept={ALLOWED_MIME.join(",")}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickFile(f);
          }}
        />
      </label>

      {/* ── Upload progress (indeterminate) ─── */}
      {upload.isPending && (
        <div
          role="progressbar"
          aria-label="Caricamento in corso"
          className="h-1 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full w-1/3 animate-[upload-stripe_1.6s_ease-in-out_infinite] rounded-full bg-primary-500" />
          <style>{`@keyframes upload-stripe { 0% { transform: translateX(-100%); } 60% { transform: translateX(220%); } 100% { transform: translateX(220%); } }`}</style>
        </div>
      )}

      {/* ── Title ─────────────────────────────── */}
      <div className="grid gap-1.5">
        <Label htmlFor="report-title">Titolo del referto</Label>
        <Input
          id="report-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Es. Emocromo completo · Visita cardiologica · Ecografia addome"
          className="focus-ring"
          required
        />
      </div>

      {/* ── Category + date ──────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Categoria</Label>
          <CategoryGrid value={category} onChange={setCategory} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="issuedAt">Data del referto</Label>
          <Input
            id="issuedAt"
            type="date"
            value={issuedAt}
            onChange={(e) => setIssuedAt(e.target.value)}
            max={today}
            className="focus-ring"
          />
          <p className="text-[11px] text-muted-foreground">
            Default: oggi. Modifica se il referto ha una data diversa.
          </p>
        </div>
      </div>

      {/* ── Notes ─────────────────────────────── */}
      <div className="grid gap-1.5">
        <Label htmlFor="report-notes">Note (opzionale)</Label>
        <Textarea
          id="report-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Osservazioni utili al professionista: es. digiuno prima del prelievo, sintomi precedenti…"
          className="focus-ring resize-none"
        />
      </div>

      {/* ── Reassurance + submit ──────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
        <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary-500" aria-hidden />
          Il referto viene cifrato e resta visibile solo a te finché non lo
          condividi.
        </p>
        <Button
          type="submit"
          disabled={upload.isPending || !file}
          aria-busy={upload.isPending}
        >
          {upload.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="mr-2 h-4 w-4" aria-hidden />
          )}
          Carica referto
        </Button>
      </div>
    </form>
  );
}

function CategoryGrid({
  value,
  onChange,
}: {
  value: MedicalReportCategory;
  onChange: (c: MedicalReportCategory) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Categoria del referto"
      className="grid grid-cols-3 gap-1.5"
    >
      {MEDICAL_REPORT_CATEGORIES.map((c) => {
        const Icon = CATEGORY_ICON[c];
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(c)}
            className={cn(
              "focus-ring flex flex-col items-center justify-center gap-1 rounded-md border px-2 py-2 text-[11px] font-medium transition-colors",
              active
                ? "border-primary-500/40 bg-primary-500/15 text-primary-500"
                : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="leading-tight">
              {MEDICAL_REPORT_CATEGORY_LABELS[c]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function formatMime(m: string) {
  if (m === "application/pdf") return "PDF";
  if (m === "image/png") return "PNG";
  if (m === "image/jpeg") return "JPEG";
  if (m === "image/webp") return "WEBP";
  if (m === "image/heic") return "HEIC";
  return m;
}
