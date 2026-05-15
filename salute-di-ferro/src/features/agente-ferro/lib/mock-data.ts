/**
 * Mock data per dev bypass · Agente di Ferro
 *
 * Quando `NEXT_PUBLIC_DEV_BYPASS=1` + `NODE_ENV=development` la dashboard usa
 * un utente impersonato senza DB reale (vedi `middleware.ts` root). Per testare
 * l'Agente di Ferro localmente senza Supabase + Postgres setup, i tool restituiscono
 * questi mock invece di chiamare Prisma.
 *
 * In produzione/staging questi mock NON vengono mai usati (gate via env).
 */

import type { z } from "zod";

// Schema corrispondente all'output di `tools.ts`. Qui non ri-importo i types per
// evitare cicli — torno oggetti compatibili.

export function getMockUserProfile(userId: string) {
  return {
    fullName: "Marco Rossi (mock)",
    firstName: "Marco",
    sex: "MALE" as const,
    ageYears: 38,
    heightCm: 178,
    targetWeightKg: 80,
    medicalConditions: null,
    allergies: null,
    medications: null,
    injuries: "Tendinopatia rotulea ginocchio dx (2024)",
    role: "PATIENT",
    onboardingCompleted: true,
  };
}

export function getMockOrders(userId: string) {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 180);
  const yearAhead = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365);

  return {
    orders: [
      {
        id: "mock-order-founder-1",
        tier: "founder-pass",
        amountEur: 119,
        status: "active",
        purchasedAt: sixMonthsAgo.toISOString(),
        renewsAt: yearAhead.toISOString(),
      },
      {
        id: "mock-order-consulenza-1",
        tier: "consulenza",
        amountEur: 27,
        status: "paid",
        purchasedAt: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 200
        ).toISOString(),
        renewsAt: null,
      },
    ],
    hasActiveSubscription: true,
  };
}

export function getMockTestResults(
  userId: string,
  filter?: { fromDate?: string; category?: string }
) {
  const now = new Date();
  const all = [
    {
      id: "mock-report-1",
      category: "BLOOD_TEST",
      uploadedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      uploadedByName: "Coach Andrea Bianchi",
      fileName: "ferro-core-2026-04.pdf",
    },
    {
      id: "mock-report-2",
      category: "ENDOCRINOLOGY",
      uploadedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 90).toISOString(),
      uploadedByName: "Dr.ssa Sara Verdi",
      fileName: "androgeno-2026-02.pdf",
    },
    {
      id: "mock-report-3",
      category: "BLOOD_TEST",
      uploadedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 365).toISOString(),
      uploadedByName: "Coach Andrea Bianchi",
      fileName: "ferro-core-2025-05.pdf",
    },
  ];

  let results = all;
  if (filter?.fromDate) {
    const min = new Date(filter.fromDate).getTime();
    results = results.filter((r) => new Date(r.uploadedAt).getTime() >= min);
  }
  if (filter?.category) {
    results = results.filter((r) => r.category === filter.category);
  }

  return {
    results,
    totalCount: results.length,
  };
}
