"use client";

import { Download, ExternalLink, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMedicalReportDetail } from "@/lib/hooks/use-medical-records";

type Props = {
  reportId: string | null;
  onClose: () => void;
};

export function ReportViewer({ reportId, onClose }: Props) {
  const { data, isLoading, error } = useMedicalReportDetail(reportId);

  return (
    <Dialog open={!!reportId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="truncate">
            {data?.title ?? "Referto"}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex h-32 items-center justify-center">
            <p className="text-destructive text-sm">
              Errore nel caricamento: {String(error)}
            </p>
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-3">
            <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
              <span>{data.fileName}</span>
              {data.fileSize && (
                <span>{(data.fileSize / 1024 / 1024).toFixed(2)} MB</span>
              )}
              <span>{data.mimeType}</span>
              <a
                href={data.signedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary ml-auto inline-flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Apri in nuova scheda
              </a>
              <a
                href={data.signedUrl}
                download={data.fileName}
                className="text-primary inline-flex items-center gap-1 hover:underline"
              >
                <Download className="h-3 w-3" />
                Scarica
              </a>
            </div>

            <div className="border-border rounded-md border bg-black/50">
              {data.mimeType === "application/pdf" ? (
                <iframe
                  src={data.signedUrl}
                  title={data.title}
                  className="h-[70vh] w-full"
                />
              ) : data.mimeType.startsWith("image/") ? (
                <div className="flex max-h-[70vh] justify-center overflow-auto p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.signedUrl}
                    alt={data.title}
                    className="max-h-full object-contain"
                  />
                </div>
              ) : (
                <p className="p-8 text-center text-sm">
                  Anteprima non disponibile — usa il pulsante Scarica.
                </p>
              )}
            </div>

            {data.notes && (
              <div className="border-border rounded-md border p-3 text-sm">
                <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                  Note
                </p>
                <p className="whitespace-pre-wrap">{data.notes}</p>
              </div>
            )}

            <p className="text-muted-foreground text-xs">
              Link firmato valido per {Math.round(data.signedUrlExpiresIn / 60)}{" "}
              minuti.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
