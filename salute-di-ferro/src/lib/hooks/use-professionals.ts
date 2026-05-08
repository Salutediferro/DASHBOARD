"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ProfessionalSearchResult = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  specialties: string[];
  /** True when the patient already has an ACTIVE CareRelationship with this pro. */
  linked: boolean;
  /** Self-set by the professional; gates new-patient bookings server-side. */
  acceptingPatients: boolean;
};

export type LinkedProfessional = {
  relationshipId: string;
  professionalRole: "DOCTOR" | "COACH";
  professional: {
    id: string;
    fullName: string;
    email: string;
    role: "DOCTOR" | "COACH" | "PATIENT" | "ADMIN";
    avatarUrl: string | null;
    bio: string | null;
    specialties: string[];
    acceptingPatients: boolean;
  };
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Errore");
  return res.json();
}

async function sendJson<T>(
  url: string,
  method: "POST" | "DELETE",
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      typeof errBody.error === "string" ? errBody.error : "Errore",
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useProfessionalSearch(
  query: string,
  specialty: string,
  opts: { enabled?: boolean } = {},
) {
  const trimmed = query.trim();
  // Default: only fire when there's something to filter on (used by the
  // small dialog picker). Pass `{ enabled: true }` for the directory
  // view that wants to show every professional in the org by default.
  const enabled = opts.enabled ?? (trimmed.length > 0 || specialty.length > 0);
  return useQuery({
    queryKey: ["professionals", "search", trimmed, specialty],
    queryFn: () => {
      const u = new URL("/api/professionals/search", window.location.origin);
      if (trimmed) u.searchParams.set("q", trimmed);
      if (specialty) u.searchParams.set("specialty", specialty);
      return getJson<ProfessionalSearchResult[]>(u.pathname + u.search);
    },
    enabled,
  });
}

export function useLinkedProfessionals() {
  return useQuery({
    queryKey: ["professionals", "linked"],
    queryFn: () => getJson<LinkedProfessional[]>("/api/me/professionals"),
  });
}

export function useGrantProfessional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (professionalId: string) =>
      sendJson<LinkedProfessional>("/api/me/professionals", "POST", {
        professionalId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["professionals"] });
    },
  });
}

export function useRevokeProfessional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (relationshipId: string) =>
      sendJson<{ ok: true }>(
        `/api/me/professionals/${relationshipId}`,
        "DELETE",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["professionals"] });
    },
  });
}
