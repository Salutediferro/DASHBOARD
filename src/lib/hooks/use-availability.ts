"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { CreateAvailabilitySlotInput } from "@/lib/validators/availability";

export type AvailabilitySlotDTO = {
  id: string;
  dayOfWeek: number | null;
  date: string | null;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isRecurring: boolean;
};

export type FreeSlot = { start: string; end: string };

function qs(p: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== "") sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function useAvailabilitySlots(professionalId?: string) {
  return useQuery<AvailabilitySlotDTO[]>({
    queryKey: ["availability-raw", professionalId ?? "self"],
    queryFn: async () => {
      const res = await fetch(
        `/api/availability${qs({ professionalId })}`,
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

export function useFreeSlots(params: {
  professionalId: string;
  from: string;
  to: string;
  durationMin?: number;
  enabled?: boolean;
}) {
  return useQuery<FreeSlot[]>({
    queryKey: ["availability-slots", params],
    enabled: params.enabled ?? true,
    queryFn: async () => {
      const res = await fetch(
        `/api/availability${qs({
          slots: "1",
          professionalId: params.professionalId,
          from: params.from,
          to: params.to,
          durationMin: params.durationMin
            ? String(params.durationMin)
            : undefined,
        })}`,
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

export function useCreateAvailabilitySlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAvailabilitySlotInput) => {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "Errore creazione",
        );
      }
      return res.json() as Promise<AvailabilitySlotDTO>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability-raw"] });
      qc.invalidateQueries({ queryKey: ["availability-slots"] });
    },
  });
}

export function useDeleteAvailabilitySlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/availability/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Errore cancellazione");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability-raw"] });
      qc.invalidateQueries({ queryKey: ["availability-slots"] });
    },
  });
}
