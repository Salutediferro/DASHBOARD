"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crop, Loader2, Minus, Plus, Upload } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentUrl?: string | null;
};

const OUTPUT_SIZE = 512;
const PREVIEW_SIZE = 240;

/**
 * Avatar cropper powered by Canvas API only — no external library.
 * Flow:
 *   1. User picks an image → loaded into memory + drawn on preview canvas.
 *   2. User can pan (drag) and zoom (+/- buttons) to center the crop.
 *   3. On save, a 512×512 square JPEG is rendered to a hidden canvas
 *      and POSTed as multipart to /api/me/avatar (existing endpoint,
 *      unchanged).
 */
export function AvatarUploadDialog({ open, onOpenChange, currentUrl }: Props) {
  const qc = useQueryClient();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const dragStart = React.useRef<{ x: number; y: number } | null>(null);

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      setImage(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [open]);

  // Draw preview whenever image/zoom/offset changes
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = PREVIEW_SIZE;
    canvas.height = PREVIEW_SIZE;
    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    // Checker/placeholder background
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    if (!image) return;

    // Compute base scale so the image covers the square ("fit cover").
    const baseScale =
      PREVIEW_SIZE / Math.min(image.naturalWidth, image.naturalHeight);
    const scale = baseScale * zoom;
    const drawW = image.naturalWidth * scale;
    const drawH = image.naturalHeight * scale;
    const cx = PREVIEW_SIZE / 2 + offset.x;
    const cy = PREVIEW_SIZE / 2 + offset.y;
    ctx.drawImage(image, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
  }, [image, zoom, offset]);

  function onPickFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Scegli un'immagine valida.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Immagine troppo grande — massimo 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!image) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || !dragStart.current) return;
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  }
  function onPointerUp() {
    setDragging(false);
    dragStart.current = null;
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!image) throw new Error("Nessuna immagine selezionata");
      // Render final 512×512 output
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas non supportato");
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      const baseScale =
        OUTPUT_SIZE / Math.min(image.naturalWidth, image.naturalHeight);
      const scale = baseScale * zoom;
      const drawW = image.naturalWidth * scale;
      const drawH = image.naturalHeight * scale;
      // Scale offset from preview space (PREVIEW_SIZE) to output space (OUTPUT_SIZE)
      const ratio = OUTPUT_SIZE / PREVIEW_SIZE;
      const cx = OUTPUT_SIZE / 2 + offset.x * ratio;
      const cy = OUTPUT_SIZE / 2 + offset.y * ratio;
      ctx.drawImage(image, cx - drawW / 2, cy - drawH / 2, drawW, drawH);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Render fallito"))),
          "image/jpeg",
          0.92,
        );
      });

      const fd = new FormData();
      fd.append("file", blob, "avatar.jpg");
      const res = await fetch("/api/me/avatar", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Errore durante l'upload",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Foto profilo aggiornata");
      qc.invalidateQueries({ queryKey: ["profile"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiorna foto profilo</DialogTitle>
          <DialogDescription>
            Trascina per centrare, usa i pulsanti per ingrandire.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              "relative inline-flex items-center justify-center overflow-hidden rounded-full border-2 border-primary-500/30 bg-muted/30",
              dragging && "cursor-grabbing",
              image && !dragging && "cursor-grab",
            )}
            style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <canvas ref={canvasRef} width={PREVIEW_SIZE} height={PREVIEW_SIZE} />
            {!image && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Crop className="h-6 w-6" aria-hidden />
                <p className="text-xs">Nessuna immagine</p>
              </div>
            )}
          </div>

          {image && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
                aria-label="Riduci zoom"
                className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="accent-primary-500"
                aria-label="Zoom"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                aria-label="Aumenta zoom"
                className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
            }}
          />
          <Button
            type="button"
            variant={image ? "outline" : "default"}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1.5 h-4 w-4" aria-hidden />
            {image ? "Cambia immagine" : "Seleziona immagine"}
          </Button>
          {currentUrl && !image && (
            <p className="text-[11px] text-muted-foreground">
              Foto attuale: conserva quella esistente se non carichi nulla.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Annulla
          </Button>
          <Button
            type="button"
            onClick={() => save.mutate()}
            disabled={!image || save.isPending}
            aria-busy={save.isPending}
          >
            {save.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            Salva foto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
