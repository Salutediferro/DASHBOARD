"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  User,
} from "lucide-react";
import type { MedicalReportCategory } from "@prisma/client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { ReportViewer } from "@/components/medical-records/report-viewer";
import { useMedicalReports } from "@/lib/hooks/use-medical-records";
import {
  MEDICAL_REPORT_CATEGORIES,
  MEDICAL_REPORT_CATEGORY_LABELS,
} from "@/lib/validators/medical-report";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function IconFor({ mime }: { mime: string }) {
  if (mime.startsWith("image/"))
    return <ImageIcon className="text-primary h-5 w-5" />;
  return <FileText className="text-primary h-5 w-5" />;
}

export default function DoctorReportsPage() {
  const [category, setCategory] = React.useState<
    MedicalReportCategory | "ALL"
  >("ALL");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [patientFilter, setPatientFilter] = React.useState<string>("ALL");
  const [viewerId, setViewerId] = React.useState<string | null>(null);

  const { data = [], isLoading } = useMedicalReports({
    category: category === "ALL" ? undefined : category,
    from: from || undefined,
    to: to || undefined,
  });

  // Build per-patient list for the filter dropdown from the fetched data
  // so it always reflects who has actually shared reports with this doctor.
  const patients = React.useMemo(() => {
    const map = new Map<string, { id: string; fullName: string }>();
    for (const r of data) {
      if (!map.has(r.patientId)) {
        map.set(r.patientId, { id: r.patientId, fullName: r.patient.fullName });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName, "it"),
    );
  }, [data]);

  const filtered =
    patientFilter === "ALL"
      ? data
      : data.filter((r) => r.patientId === patientFilter);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Referti condivisi
        </h1>
        <p className="text-muted-foreground text-sm">
          Tutti i referti che i tuoi clienti hanno scelto di condividere con te.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3 border-b border-border pb-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="patient">Cliente</Label>
          <Select
            value={patientFilter}
            onValueChange={(v) => setPatientFilter(v ?? "ALL")}
          >
            <SelectTrigger id="patient" className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutti i clienti</SelectItem>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <FileText className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">
              {data.length === 0
                ? "Nessun cliente ha ancora condiviso referti con te."
                : "Nessun referto corrispondente ai filtri."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {filtered.length} refert{filtered.length === 1 ? "o" : "i"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {filtered.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {initials(r.patient.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <IconFor mime={r.mimeType} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-3 text-xs">
                      <Link
                        href={`/dashboard/doctor/patients/${r.patientId}`}
                        className="hover:text-foreground inline-flex items-center gap-1 font-medium"
                      >
                        <User className="h-3 w-3" />
                        {r.patient.fullName}
                      </Link>
                      <Badge variant="secondary">
                        {MEDICAL_REPORT_CATEGORY_LABELS[r.category]}
                      </Badge>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {r.issuedAt
                          ? formatDate(r.issuedAt)
                          : formatDate(r.uploadedAt)}
                      </span>
                      <span>caricato da {r.uploadedBy.fullName}</span>
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
                  <Link
                    href={`/dashboard/doctor/patients/${r.patientId}/reports`}
                    className="border-border hover:bg-muted inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-medium"
                  >
                    Tutti i suoi referti
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <ReportViewer reportId={viewerId} onClose={() => setViewerId(null)} />
    </div>
  );
}
