"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Activity,
  Calendar,
  Download,
  Eye,
  FileText,
  FlaskConical,
  Heart,
  MoreHorizontal,
  Pill,
  ScanLine,
  Scissors,
  Search,
  Stethoscope,
  Syringe,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { MedicalReportCategory } from "@prisma/client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  useDeleteMedicalReport,
  useMedicalReports,
  useMedicalReportDetail,
  type MedicalReportListItem,
} from "@/lib/hooks/use-medical-records";
import {
  MEDICAL_REPORT_CATEGORIES,
  MEDICAL_REPORT_CATEGORY_LABELS,
} from "@/lib/validators/medical-report";
import EmptyState from "@/components/brand/empty-state";
import { cn } from "@/lib/utils";
import { ReportViewer } from "./report-viewer";
import { PermissionManager } from "./permission-manager";

type Props = {
  /** Omit for patient self-view. */
  patientId?: string;
  /** Show the permission manager drawer — patient owner only. */
  canManagePermissions?: boolean;
  /** Enable delete action — owner or uploader. */
  canDelete?: boolean;
  /** When true, upload CTA is hidden because the parent renders it. */
  hideUploadCta?: boolean;
  /** ID of the current viewer (used to hide "uploaded by me" in meta line). */
  currentUserId?: string;
};

// ── Category → icon map ─────────────────────────────────────────────────────
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ReportList({
  patientId,
  canManagePermissions,
  canDelete,
  currentUserId,
}: Props) {
  const [category, setCategory] = React.useState<
    MedicalReportCategory | "ALL"
  >("ALL");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [viewerId, setViewerId] = React.useState<string | null>(null);
  const [permissionId, setPermissionId] = React.useState<string | null>(null);

  const { data: reports = [], isLoading } = useMedicalReports({
    patientId,
    category: category === "ALL" ? undefined : category,
    from: from || undefined,
    to: to || undefined,
  });

  const del = useDeleteMedicalReport();

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q) ||
        r.uploadedBy.fullName.toLowerCase().includes(q),
    );
  }, [reports, search]);

  async function handleDelete(r: MedicalReportListItem) {
    if (
      !confirm(
        `Eliminare definitivamente il referto "${r.title}"? L'operazione non è reversibile.`,
      )
    )
      return;
    try {
      await del.mutateAsync(r.id);
      toast.success("Referto eliminato");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Filters row ─────────────────────────────────────────── */}
      <FiltersBar
        category={category}
        onCategoryChange={setCategory}
        from={from}
        onFromChange={setFrom}
        to={to}
        onToChange={setTo}
        search={search}
        onSearchChange={setSearch}
      />

      {/* ── Grid / states ───────────────────────────────────────── */}
      {isLoading ? (
        <GridSkeleton />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Ancora nessun referto"
          description="Carica il tuo primo referto: solo tu potrai vederlo finché non decidi di condividerlo con un professionista."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nessun referto trovato"
          description="Nessun risultato con i filtri attivi. Prova a rimuoverne qualcuno."
        />
      ) : (
        <ul
          className={cn(
            "grid gap-4",
            "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {filtered.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              onView={() => setViewerId(r.id)}
              onShare={
                canManagePermissions
                  ? () => setPermissionId(r.id)
                  : undefined
              }
              onDelete={canDelete ? () => handleDelete(r) : undefined}
              showUploader={r.uploadedById !== (currentUserId ?? patientId ?? null)}
            />
          ))}
        </ul>
      )}

      {/* Viewer + Permission side-sheet (self-contained) */}
      <ReportViewer
        reportId={viewerId}
        onClose={() => setViewerId(null)}
        onShare={
          canManagePermissions
            ? (id) => {
                setViewerId(null);
                setPermissionId(id);
              }
            : undefined
        }
      />
      <PermissionManager
        reportId={permissionId}
        onClose={() => setPermissionId(null)}
      />
    </div>
  );
}

// ── Filters bar ──────────────────────────────────────────────────────────────

function FiltersBar({
  category,
  onCategoryChange,
  from,
  onFromChange,
  to,
  onToChange,
  search,
  onSearchChange,
}: {
  category: MedicalReportCategory | "ALL";
  onCategoryChange: (c: MedicalReportCategory | "ALL") => void;
  from: string;
  onFromChange: (v: string) => void;
  to: string;
  onToChange: (v: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Category pills */}
      <div
        role="radiogroup"
        aria-label="Filtra per categoria"
        className="flex flex-wrap gap-1.5"
      >
        <CategoryPill
          active={category === "ALL"}
          onClick={() => onCategoryChange("ALL")}
          label="Tutti"
        />
        {MEDICAL_REPORT_CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICON[c];
          return (
            <CategoryPill
              key={c}
              active={category === c}
              onClick={() => onCategoryChange(c)}
              label={MEDICAL_REPORT_CATEGORY_LABELS[c]}
              icon={Icon}
            />
          );
        })}
      </div>

      {/* Search + date range */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cerca per titolo, note, professionista…"
            className="focus-ring pl-9"
            aria-label="Cerca referti"
          />
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2 py-1">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <Input
            type="date"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            aria-label="Data inizio"
            className="focus-ring h-7 w-36 border-0 bg-transparent p-0 text-xs"
          />
          <span className="text-muted-foreground" aria-hidden>
            →
          </span>
          <Input
            type="date"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            aria-label="Data fine"
            className="focus-ring h-7 w-36 border-0 bg-transparent p-0 text-xs"
          />
        </div>
      </div>
    </div>
  );
}

function CategoryPill({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary-500/40 bg-primary-500/15 text-primary-500"
          : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {label}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────

function ReportCard({
  report,
  onView,
  onShare,
  onDelete,
  showUploader,
}: {
  report: MedicalReportListItem;
  onView: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  showUploader: boolean;
}) {
  const Icon = CATEGORY_ICON[report.category];
  const shareLabel =
    report.permissionCount === 0
      ? "Solo tu"
      : `Condiviso con ${report.permissionCount}`;
  return (
    <li className="surface-2 flex flex-col gap-3 rounded-xl p-4 transition-shadow hover:shadow-lg">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-primary-500"
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onView}
            className="focus-ring text-left"
            aria-label={`Visualizza ${report.title}`}
          >
            <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
              {report.title}
            </h3>
          </button>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            {MEDICAL_REPORT_CATEGORY_LABELS[report.category]}
          </p>
        </div>
        <CardMenu
          onView={onView}
          signedUrlHref={null /* download via viewer to keep URLs lazy */}
          reportId={report.id}
          onShare={onShare}
          onDelete={onDelete}
        />
      </div>

      <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <div className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" aria-hidden />
          <dt className="sr-only">Data referto</dt>
          <dd>
            {report.issuedAt
              ? formatDate(report.issuedAt)
              : formatDate(report.uploadedAt)}
          </dd>
        </div>
        {showUploader && (
          <div className="inline-flex items-center gap-1">
            <dt className="sr-only">Caricato da</dt>
            <dd className="truncate">
              caricato da {report.uploadedBy.fullName}
            </dd>
          </div>
        )}
      </dl>

      <button
        type="button"
        onClick={onShare}
        disabled={!onShare}
        className={cn(
          "focus-ring inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
          report.permissionCount > 0
            ? "border-accent-500/30 bg-accent-500/10 text-accent-500 hover:bg-accent-500/15"
            : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted",
          !onShare && "cursor-default opacity-70",
        )}
        aria-label={onShare ? `Gestisci condivisione: ${shareLabel}` : shareLabel}
      >
        <Users className="h-3 w-3" aria-hidden />
        {shareLabel}
      </button>
    </li>
  );
}

function CardMenu({
  onView,
  reportId,
  onShare,
  onDelete,
}: {
  onView: () => void;
  signedUrlHref: string | null;
  reportId: string;
  onShare?: () => void;
  onDelete?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Altre azioni referto"
        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onView}>
          <Eye className="mr-2 h-4 w-4" aria-hidden />
          Visualizza
        </DropdownMenuItem>
        <DownloadMenuItem reportId={reportId} />
        {onShare && (
          <DropdownMenuItem onClick={onShare}>
            <Users className="mr-2 h-4 w-4" aria-hidden />
            Condividi
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" aria-hidden />
              Elimina
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Lazy-resolve the signed URL only when the user opens the menu → clicks Download,
// matching the existing API contract (signed URL = detail endpoint).
function DownloadMenuItem({ reportId }: { reportId: string }) {
  const [shouldFetch, setShouldFetch] = React.useState(false);
  const detail = useMedicalReportDetail(shouldFetch ? reportId : null);

  React.useEffect(() => {
    if (!shouldFetch) return;
    if (detail.data) {
      const a = document.createElement("a");
      a.href = detail.data.signedUrl;
      a.download = detail.data.fileName;
      a.rel = "noreferrer";
      a.click();
      setShouldFetch(false);
      toast.success("Download avviato");
    } else if (detail.error) {
      toast.error("Impossibile scaricare il referto");
      setShouldFetch(false);
    }
  }, [shouldFetch, detail.data, detail.error]);

  return (
    <DropdownMenuItem
      disabled={shouldFetch && !detail.data && !detail.error}
      onClick={(e) => {
        e.preventDefault();
        setShouldFetch(true);
      }}
    >
      <Download className="mr-2 h-4 w-4" aria-hidden />
      Scarica
    </DropdownMenuItem>
  );
}

// ── Loading grid skeleton ─────────────────────────────────────────────────

function GridSkeleton() {
  return (
    <ul
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-busy="true"
      aria-label="Caricamento referti"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="surface-2 flex flex-col gap-3 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 shrink-0 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-4/5 rounded bg-muted" />
              <div className="h-3 w-1/3 rounded bg-muted/60" />
            </div>
          </div>
          <div className="h-3 w-2/3 rounded bg-muted/60" />
          <div className="h-6 w-32 rounded-full bg-muted/60" />
        </li>
      ))}
    </ul>
  );
}
