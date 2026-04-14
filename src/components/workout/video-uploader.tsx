"use client";

import * as React from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 100 * 1024 * 1024;

type Props = {
  file: File | null;
  setFile: (f: File | null) => void;
  uploading?: boolean;
  progress?: number | null;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoUploader({ file, setFile, uploading, progress }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          if (f && f.size > MAX_BYTES) {
            alert("Il video supera i 100MB");
            return;
          }
          setFile(f);
        }}
      />
      {!file ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-1 h-4 w-4" />
          Carica video (mp4/webm, max 100MB)
        </Button>
      ) : (
        <div className="border-border flex items-center gap-2 rounded-md border p-2 text-xs">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
          {!uploading && (
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Rimuovi"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      {uploading && (
        <div className="bg-muted h-1.5 overflow-hidden rounded">
          {progress !== null && progress !== undefined ? (
            <div
              className="bg-primary h-full transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          ) : (
            <div className="bg-primary/60 h-full w-1/3 animate-pulse" />
          )}
        </div>
      )}
    </div>
  );
}
