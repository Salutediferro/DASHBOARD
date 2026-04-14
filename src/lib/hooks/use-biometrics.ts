"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { BiometricLog } from "@prisma/client";
import type { BiometricInput } from "@/lib/validators/biometric";

export type BiometricLogDTO = Omit<
  BiometricLog,
  "date" | "sleepBedtime" | "sleepWakeTime"
> & {
  date: string;
  sleepBedtime: string | null;
  sleepWakeTime: string | null;
};

export type BiometricListResponse = {
  items: BiometricLogDTO[];
  total: number;
  page: number;
  perPage: number;
};

export type BiometricSummaryResponse = {
  days: 30 | 90 | 365;
  patientId: string;
  stats: Record<
    string,
    {
      first: number | null;
      last: number | null;
      min: number | null;
      max: number | null;
      avg: number | null;
      count: number;
    }
  >;
  series: Array<{
    date: string;
    weight: number | null;
    bmi: number | null;
    systolicBP: number | null;
    diastolicBP: number | null;
    restingHR: number | null;
    spo2: number | null;
    glucoseFasting: number | null;
    sleepHours: number | null;
    steps: number | null;
  }>;
};

export type BiometricListParams = {
  patientId?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
};

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function useBiometrics(
  params: BiometricListParams = {},
): UseQueryResult<BiometricListResponse> {
  return useQuery<BiometricListResponse>({
    queryKey: ["biometrics", params],
    queryFn: async () => {
      const res = await fetch(`/api/biometrics${qs(params)}`, {
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

export function useBiometricSummary(
  days: 30 | 90 | 365,
  patientId?: string,
): UseQueryResult<BiometricSummaryResponse> {
  return useQuery<BiometricSummaryResponse>({
    queryKey: ["biometric-summary", days, patientId],
    queryFn: async () => {
      const res = await fetch(
        `/api/biometrics/summary${qs({ days, patientId })}`,
        { cache: "no-store" },
      );
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

export function useCreateBiometric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BiometricInput) => {
      const res = await fetch("/api/biometrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "Errore salvataggio",
        );
      }
      return res.json() as Promise<BiometricLogDTO>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["biometrics"] });
      qc.invalidateQueries({ queryKey: ["biometric-summary"] });
    },
  });
}

export function useDeleteBiometric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/biometrics/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore cancellazione");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["biometrics"] });
      qc.invalidateQueries({ queryKey: ["biometric-summary"] });
    },
  });
}
