"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Calendar,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  Settings,
  Trash2,
} from "lucide-react";
import type { MedicalReportCategory } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useDeleteMedicalReport,
  useMedicalReports,
  type MedicalReportListItem,
} from "@/lib/hooks/use-medical-records";
import {
  MEDICAL_REPORT_CATEGORIES,
  MEDICAL_REPORT_CATEGORY_LABELS,
} from "@/lib/validators/medical-report";
import { ReportViewer } from "./report-viewer";
import { PermissionManager } from "./permission-manager";

type Props = {
  /** Omit for patient self-view. */
  patientId?: string;
  /** Show the permission manager drawer — patient owner only. */
  canManagePermissions?: boolean;
  /** Enable delete action — owner or uploader. */
  canDelete?: boolean;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function IconFor({ mime }: { mime: string }) {
  if (mime.startsWith("image/"))
    return <ImageIcon className="text-primary h-5 w-5" />;
  return <FileText className="text-primary h-5 w-5" />;
}

export function ReportList({
  patientId,
  canManagePermissions,
  canDelete,
}: Props) {
  const [category, setCategory] = React.useState<
    MedicalReportCategory | "ALL"
  >("ALL");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [viewerId, setViewerId] = React.useState<string | null>(null);
  const [permissionId, setPermissionId] = React.useState<string | null>(null);

  const { data = [], isLoading } = useMedicalReports({
    patientId,
    category: category === "ALL" ? undefined : category,
    from: from || undefined,
    to: to || undefined,
  });

  const del = useDeleteMedicalReport();

  async function handleDelete(r: MedicalReportListItem) {
    if (!confirm(`Eliminare definitivamente "${r.title}"?`)) return;
    try {
      await del.mutateAsync(r.id);
      toast.success("Referto eliminato");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 border-b border-border pb-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cat">Categoria</Label>
          <Select
            value={category}
            onValueChange={(v) =>
              setCategory(v as MedicalReportCategory | "ALL")
            }
          >
            <SelectTrigger id="cat" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutte le categorie</SelectItem>
              {MEDICAL_REPORT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {MEDICAL_REPORT_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from">Dal</Label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to">Al</Label>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <FileText className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">
              Nessun referto corrispondente ai filtri
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {data.length} referto{data.length > 1 ? "" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {data.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <IconFor mime={r.mimeType} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-3 text-xs">
                      <Badge variant="secondary">
                        {MEDICAL_REPORT_CATEGORY_LABELS[r.category]}
                      </Badge>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {r.issuedAt
                          ? formatDate(r.issuedAt)
                          : formatDate(r.uploadedAt)}
                      </span>
                      <span>{r.uploadedBy.fullName}</span>
                      {canManagePermissions && (
                        <span>
                          {r.permissionCount} permess
                          {r.permissionCount === 1 ? "o" : "i"}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewerId(r.id)}
                    className="border-border hover:bg-muted inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-medium"
                  >
                    <Eye className="h-3 w-3" />
                    Visualizza
                  </button>
                  {canManagePermissions && (
                    <button
                      type="button"
                      onClick={() => setPermissionId(r.id)}
                      className="border-border hover:bg-muted inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-medium"
                    >
                      <Settings className="h-3 w-3" />
                      Permessi
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(r)}
                      disabled={del.isPending}
                      className="text-destructive hover:bg-destructive/10 inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-medium disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Elimina
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <ReportViewer reportId={viewerId} onClose={() => setViewerId(null)} />

      <Dialog
        open={!!permissionId}
        onOpenChange={(open) => !open && setPermissionId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gestisci permessi</DialogTitle>
          </DialogHeader>
          {permissionId && <PermissionManager reportId={permissionId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
