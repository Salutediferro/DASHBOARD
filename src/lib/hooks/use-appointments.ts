"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  AppointmentStatus,
  AppointmentType,
  ProfessionalRole,
} from "@prisma/client";
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "@/lib/validators/appointment";

export type AppointmentDTO = {
  id: string;
  professionalId: string;
  patientId: string;
  professionalRole: ProfessionalRole;
  startTime: string;
  endTime: string;
  type: AppointmentType;
  status: AppointmentStatus;
  notes: string | null;
  meetingUrl: string | null;
  patientName: string | null;
  professionalName: string | null;
};

export type ListParams = {
  from?: string;
  to?: string;
  patientId?: string;
};

function qs(p: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== "") sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function useAppointments(params: ListParams = {}) {
  return useQuery<AppointmentDTO[]>({
    queryKey: ["appointments", params],
    queryFn: async () => {
      const res = await fetch(`/api/appointments${qs(params)}`, {
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

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAppointmentInput) => {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "Creazione fallita",
        );
      }
      return res.json() as Promise<AppointmentDTO>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["availability-slots"] });
    },
  });
}

export function useUpdateAppointment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateAppointmentInput) => {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "Aggiornamento fallito",
        );
      }
      return res.json() as Promise<AppointmentDTO>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["availability-slots"] });
    },
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Errore cancellazione");
      return res.json();
    },
    // Mark the appointment CANCELED across every cached list so the
    // calendar, "Prossimi" card and the detail dialog flip states
    // immediately, without waiting for the DELETE round-trip.
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["appointments"] });
      const snapshots: Array<
        [readonly unknown[], AppointmentDTO[] | undefined]
      > = [];
      qc.getQueriesData<AppointmentDTO[]>({ queryKey: ["appointments"] }).forEach(
        ([key, data]) => {
          snapshots.push([key, data]);
          if (!data) return;
          qc.setQueryData<AppointmentDTO[]>(
            key,
            data.map((a) =>
              a.id === id ? { ...a, status: "CANCELED" as const } : a,
            ),
          );
        },
      );
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["appointments"], refetchType: "none" });
      qc.invalidateQueries({ queryKey: ["availability-slots"] });
    },
  });
}
