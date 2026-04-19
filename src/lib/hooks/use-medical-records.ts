"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { MedicalReportCategory } from "@prisma/client";

export type MedicalReportListItem = {
  id: string;
  patientId: string;
  patient: { id: string; fullName: string; email: string };
  uploadedById: string;
  uploadedBy: { id: string; fullName: string; role: string };
  fileName: string;
  mimeType: string;
  fileSize: number | null;
  category: MedicalReportCategory;
  title: string;
  notes: string | null;
  issuedAt: string | null;
  uploadedAt: string;
  permissionCount: number;
};

export type MedicalReportDetail = Omit<
  MedicalReportListItem,
  "permissionCount" | "uploadedBy"
> & {
  signedUrl: string;
  signedUrlExpiresIn: number;
};

export type ReportPermissionRow = {
  id: string;
  granteeId: string;
  grantee: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  active: boolean;
};

export type ListParams = {
  patientId?: string;
  category?: MedicalReportCategory;
  from?: string;
  to?: string;
};

function qs(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function useMedicalReports(
  params: ListParams = {},
): UseQueryResult<MedicalReportListItem[]> {
  return useQuery<MedicalReportListItem[]>({
    queryKey: ["medical-reports", params],
    queryFn: async () => {
      const res = await fetch(`/api/medical-reports${qs(params)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "Errore fetch",
        );
      }
      return res.json();
    },
  });
}

export function useMedicalReportDetail(reportId: string | null) {
  return useQuery<MedicalReportDetail>({
    queryKey: ["medical-report", reportId],
    enabled: !!reportId,
    queryFn: async () => {
      const res = await fetch(`/api/medical-reports/${reportId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "Errore fetch",
        );
      }
      return res.json();
    },
  });
}

export function useUploadMedicalReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      file: File;
      title: string;
      category: MedicalReportCategory;
      notes?: string | null;
      issuedAt?: string | null;
      patientId?: string;
    }) => {
      const fd = new FormData();
      fd.append("file", input.file);
      fd.append("title", input.title);
      fd.append("category", input.category);
      if (input.notes) fd.append("notes", input.notes);
      if (input.issuedAt) fd.append("issuedAt", input.issuedAt);
      if (input.patientId) fd.append("patientId", input.patientId);
      const res = await fetch("/api/medical-reports", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "Upload fallito",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medical-reports"] });
    },
  });
}

export function useDeleteMedicalReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/medical-reports/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Errore cancellazione");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medical-reports"] });
    },
  });
}

export function useReportPermissions(reportId: string | null) {
  return useQuery<ReportPermissionRow[]>({
    queryKey: ["report-permissions", reportId],
    enabled: !!reportId,
    queryFn: async () => {
      const res = await fetch(`/api/medical-reports/${reportId}/permissions`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "Errore fetch",
        );
      }
      return res.json();
    },
  });
}

export function useGrantReportPermission(reportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { granteeId: string; expiresAt?: string | null }) => {
      const res = await fetch(`/api/medical-reports/${reportId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "Errore concessione",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report-permissions", reportId] });
      qc.invalidateQueries({ queryKey: ["medical-reports"] });
    },
  });
}

export function useRevokeReportPermission(reportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (granteeId: string) => {
      const res = await fetch(
        `/api/medical-reports/${reportId}/permissions/${granteeId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Errore revoca");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report-permissions", reportId] });
      qc.invalidateQueries({ queryKey: ["medical-reports"] });
    },
  });
}
