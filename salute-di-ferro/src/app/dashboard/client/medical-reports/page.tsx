"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Category = "BLOOD_TEST" | "IMAGING" | "VISIT" | "PRESCRIPTION" | "OTHER";

type MedicalReport = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number | null;
  category: Category;
  title: string;
  notes: string | null;
  issuedAt: string | null;
  visibleToCoach: boolean;
  uploadedAt: string;
  signedUrl: string | null;
};

const CATEGORY_LABEL: Record<Category, string> = {
  BLOOD_TEST: "Esami del sangue",
  IMAGING: "Imaging",
  VISIT: "Visita",
  PRESCRIPTION: "Prescrizione",
  OTHER: "Altro",
};

const CATEGORY_COLOR: Record<Category, string> = {
  BLOOD_TEST: "bg-red-500/20 text-red-400",
  IMAGING: "bg-blue-500/20 text-blue-400",
  VISIT: "bg-purple-500/20 text-purple-400",
  PRESCRIPTION: "bg-amber-500/20 text-amber-400",
  OTHER: "bg-zinc-500/20 text-zinc-300",
};

function formatSize(b: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function ClientMedicalReportsPage() {
  const qc = useQueryClient();
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<Category>("OTHER");
  const [issuedAt, setIssuedAt] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [visibleToCoach, setVisibleToCoach] = React.useState(false);

  const { data: reports = [], isLoading } = useQuery<MedicalReport[]>({
    queryKey: ["medical-reports"],
    queryFn: async () => {
      const res = await fetch("/api/medical-reports", { cache: "no-store" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Seleziona un file");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title || file.name);
      fd.append("category", category);
      if (issuedAt) fd.append("issuedAt", issuedAt);
      if (notes) fd.append("notes", notes);
      fd.append("visibleToCoach", String(visibleToCoach));
      const res = await fetch("/api/medical-reports", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Upload fallito");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Referto caricato");
      qc.invalidateQueries({ queryKey: ["medical-reports"] });
      setUploadOpen(false);
      setFile(null);
      setTitle("");
      setCategory("OTHER");
      setIssuedAt("");
      setNotes("");
      setVisibleToCoach(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/medical-reports/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Errore eliminazione");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Referto eliminato");
      qc.invalidateQueries({ queryKey: ["medical-reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const res = await fetch(`/api/medical-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleToCoach: visible }),
      });
      if (!res.ok) throw new Error("Errore aggiornamento");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medical-reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-6 pb-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Cartella referti
          </h1>
          <p className="text-muted-foreground text-sm">
            Esami, prescrizioni e documenti medici — archiviati in modo sicuro
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Carica referto
        </button>
      </header>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </CardContent>
        </Card>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <FileText className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">
              Nessun referto caricato
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-md">
                  {r.mimeType.startsWith("image/") ? (
                    <ImageIcon className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{r.title}</p>
                    <Badge className={CATEGORY_COLOR[r.category]}>
                      {CATEGORY_LABEL[r.category]}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {r.fileName} · {formatSize(r.fileSize)}
                    {r.issuedAt &&
                      ` · ${format(new Date(r.issuedAt), "d MMM yyyy", { locale: it })}`}
                  </p>
                  {r.notes && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {r.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title={
                      r.visibleToCoach
                        ? "Visibile al coach"
                        : "Nascosto al coach"
                    }
                    onClick={() =>
                      toggleVisibilityMutation.mutate({
                        id: r.id,
                        visible: !r.visibleToCoach,
                      })
                    }
                    className="hover:bg-muted inline-flex h-9 w-9 items-center justify-center rounded-md"
                  >
                    {r.visibleToCoach ? (
                      <Eye className="h-4 w-4 text-green-500" />
                    ) : (
                      <EyeOff className="text-muted-foreground h-4 w-4" />
                    )}
                  </button>
                  {r.signedUrl && (
                    <a
                      href={r.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:bg-muted inline-flex h-9 w-9 items-center justify-center rounded-md"
                      title="Scarica"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Eliminare "${r.title}"?`)) {
                        deleteMutation.mutate(r.id);
                      }
                    }}
                    className="hover:bg-destructive/10 text-destructive inline-flex h-9 w-9 items-center justify-center rounded-md"
                    title="Elimina"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Carica un referto</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase">File</label>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
                }}
                className="text-sm"
              />
              <p className="text-muted-foreground text-[10px]">
                PDF o immagini · max 15 MB
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase">Titolo</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-input bg-background h-10 rounded-md border px-3 text-sm"
                placeholder="Es. Esami del sangue — Marzo 2026"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase">
                  Categoria
                </label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as Category)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABEL[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase">
                  Data referto
                </label>
                <input
                  type="date"
                  value={issuedAt}
                  onChange={(e) => setIssuedAt(e.target.value)}
                  className="border-input bg-background h-10 rounded-md border px-3 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase">Note</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                placeholder="Opzionale"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={visibleToCoach}
                onChange={(e) => setVisibleToCoach(e.target.checked)}
                className="h-4 w-4"
              />
              Condividi con il mio coach
            </label>

            <button
              type="button"
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending || !file}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-12 items-center justify-center gap-2 rounded-md text-sm font-semibold disabled:opacity-50"
            >
              {uploadMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Carica
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
