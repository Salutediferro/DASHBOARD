"use client";

import {
  Download,
  Loader2,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMedicalReportDetail } from "@/lib/hooks/use-medical-records";

type Props = {
  reportId: string | null;
  onClose: () => void;
  /** When provided, the toolbar shows a "Condividi" button that calls this. */
  onShare?: (id: string) => void;
};

function formatSize(bytes: number | null) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatMime(m: string) {
  if (m === "application/pdf") return "PDF";
  if (m === "image/png") return "PNG";
  if (m === "image/jpeg") return "JPEG";
  if (m === "image/webp") return "WEBP";
  if (m === "image/heic") return "HEIC";
  return m;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReportViewer({ reportId, onClose, onShare }: Props) {
  const { data, isLoading, error } = useMedicalReportDetail(reportId);

  function handleDownload() {
    if (!data) return;
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = data.fileName;
    a.rel = "noreferrer";
    a.click();
    toast.success("Download avviato");
  }

  return (
    <Dialog open={!!reportId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[96vh] max-h-[96vh] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col gap-0 p-0 md:w-[92vw] md:max-w-5xl"
      >
        {/* ── Toolbar ─────────────────────────── */}
        <header className="flex items-center gap-3 border-b border-border/60 bg-card/80 px-4 py-3 backdrop-blur">
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-sm font-semibold">
              {data?.title ?? (isLoading ? "Caricamento…" : "Referto")}
            </DialogTitle>
            {data && (
              <p className="truncate text-xs text-muted-foreground">
                {data.fileName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!data}
              className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-card px-2.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Scarica
            </button>
            {onShare && data && (
              <button
                type="button"
                onClick={() => onShare(data.id)}
                className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md border border-accent-500/30 bg-accent-500/10 px-2.5 text-xs font-medium text-accent-500 transition-colors hover:bg-accent-500/15"
              >
                <Users className="h-3.5 w-3.5" aria-hidden />
                Condividi
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi"
              className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* ── Body ─────────────────────────────── */}
        <div className="flex flex-1 items-center justify-center overflow-hidden bg-black/40">
          {isLoading ? (
            <Loader2
              className="h-7 w-7 animate-spin text-muted-foreground"
              aria-label="Caricamento referto"
            />
          ) : error ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center text-sm">
              <ShieldAlert className="h-6 w-6 text-destructive" aria-hidden />
              <p className="font-medium">Non è stato possibile aprire il referto.</p>
              <p className="text-xs text-muted-foreground">{String(error)}</p>
            </div>
          ) : data ? (
            data.mimeType === "application/pdf" ? (
              <iframe
                src={data.signedUrl}
                title={data.title}
                className="h-full w-full"
              />
            ) : data.mimeType.startsWith("image/") ? (
              <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.signedUrl}
                  alt={data.title}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Anteprima non disponibile per questo formato. Usa il pulsante{" "}
                <span className="text-foreground">Scarica</span> nella barra in
                alto.
              </p>
            )
          ) : null}
        </div>

        {/* ── Footer metadata ─────────────────── */}
        {data && (
          <footer className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border/60 bg-card/80 px-4 py-3 text-xs text-muted-foreground md:grid-cols-4">
            <Meta label="Formato" value={formatMime(data.mimeType)} />
            <Meta label="Dimensione" value={formatSize(data.fileSize)} />
            <Meta label="Caricato il" value={formatDateTime(data.uploadedAt)} />
            <Meta
              label="Link valido"
              value={`${Math.round(data.signedUrlExpiresIn / 60)} min`}
              hint="Il link temporaneo scade; riapri il referto se serve."
            />
          </footer>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Meta({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
        {label}
      </dt>
      <dd className="truncate text-xs text-foreground" title={hint}>
        {value}
      </dd>
    </div>
  );
}
