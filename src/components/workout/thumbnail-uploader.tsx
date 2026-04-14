"use client";

import * as React from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 5 * 1024 * 1024;

type Props = {
  file: File | null;
  setFile: (f: File | null) => void;
};

export function ThumbnailUploader({ file, setFile }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          if (f && f.size > MAX_BYTES) {
            alert("L'immagine supera i 5MB");
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
          Carica thumbnail (jpg/png, max 5MB)
        </Button>
      ) : (
        <div className="border-border flex items-center gap-2 rounded-md border p-2">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="preview"
              className="h-12 w-16 rounded object-cover"
            />
          )}
          <p className="min-w-0 flex-1 truncate text-xs">{file.name}</p>
          <button
            type="button"
            onClick={() => setFile(null)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Rimuovi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
