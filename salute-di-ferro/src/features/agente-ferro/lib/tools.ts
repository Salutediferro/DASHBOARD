/**
 * Tool calling read · Agente di Ferro · AI SDK v6
 *
 * 3 tool read-only che permettono all'Agente di rispondere con dati personalizzati
 * dell'utente loggato:
 *  - `get_user_profile` — profilo base utente (nome, sesso, età, altezza, condizioni
 *    mediche dichiarate, allergie, farmaci, infortuni, target peso).
 *  - `get_orders` — storico abbonamenti/acquisti dell'utente (Stripe).
 *  - `get_test_results` — referti di laboratorio caricati (`MedicalReport` con
 *    `category=BLOOD_TEST`). NON espone i valori clinici (che sono nel PDF privato),
 *    solo metadati: data, categoria, professionale che li ha caricati, presenza file.
 *
 * Auth + privacy:
 *  - Tutti i tool ricevono `userId` come arg context (NON lo prende dal modello).
 *  - Il modello non può leggere dati di altri utenti perché chi invoca il tool è
 *    l'API route che già conosce `userId` da Supabase auth.
 *  - In dev bypass mode (`NEXT_PUBLIC_DEV_BYPASS=1`), si usa mock data (vedi
 *    `mock-data.ts`) invece di Prisma per permettere lavoro locale senza DB.
 *
 * @see https://sdk.vercel.ai/docs · pattern v6 con `tool({ inputSchema, execute })`.
 */

import { tool } from "ai";
import { z } from "zod";
import type { PrismaClient, Prisma } from "@prisma/client";

import { getMockOrders, getMockTestResults, getMockUserProfile } from "./mock-data";

/**
 * Mappa Stripe Price ID → tier human-readable.
 * Da estendere quando Giuseppe condivide i price IDs reali (per ora i price IDs
 * sono solo nei Payment Links del SITO Worker, dashboard non ha ancora sync).
 */
const STRIPE_PRICE_TO_TIER: Record<string, string> = {
  // placeholder, da popolare con i price IDs reali da Stripe Dashboard SDF
};

function priceIdToTier(stripePriceId: string | null | undefined): string {
  if (!stripePriceId) return "membership";
  return STRIPE_PRICE_TO_TIER[stripePriceId] || "membership";
}

// ============================================================
// Helpers
// ============================================================

/**
 * Determina se siamo in dev bypass: niente DB reale, usiamo mock.
 * Equivalente alla logica già usata dal middleware Supabase root.
 */
function isDevBypass(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_BYPASS === "1"
  );
}

// ============================================================
// Tool 1 · get_user_profile
// ============================================================

const userProfileSchema = z.object({
  /** Pseudo-arg: il modello può chiedere "voglio il profilo dell'utente",
   * ma noi useremo `userIdContext` passato a buildAgenteFerroTools(). */
  reason: z
    .string()
    .optional()
    .describe(
      "Breve motivo per cui stai chiedendo il profilo. Es: 'l'utente ha chiesto la sua altezza registrata'."
    ),
});

const userProfileOutputSchema = z.object({
  fullName: z.string(),
  firstName: z.string().nullable(),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]).nullable(),
  ageYears: z.number().int().nullable(),
  heightCm: z.number().nullable(),
  targetWeightKg: z.number().nullable(),
  medicalConditions: z.string().nullable(),
  allergies: z.string().nullable(),
  medications: z.string().nullable(),
  injuries: z.string().nullable(),
  role: z.string(),
  onboardingCompleted: z.boolean(),
});

// ============================================================
// Tool 2 · get_orders
// ============================================================

const ordersSchema = z.object({
  reason: z
    .string()
    .optional()
    .describe("Breve motivo per cui stai chiedendo gli ordini."),
});

const ordersOutputSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string(),
      tier: z.string().describe("consulenza | membership-annuale | founder-pass"),
      amountEur: z.number(),
      status: z.string().describe("paid | active | canceled | expired"),
      purchasedAt: z.string().describe("ISO 8601"),
      renewsAt: z.string().nullable(),
    })
  ),
  hasActiveSubscription: z.boolean(),
});

// ============================================================
// Tool 3 · get_test_results
// ============================================================

const testResultsSchema = z.object({
  reason: z
    .string()
    .optional()
    .describe(
      "Breve motivo per cui stai chiedendo i referti. Es: 'l'utente vuole sapere quanti pannelli ha fatto quest'anno'."
    ),
  /** Filtri opzionali */
  fromDate: z
    .string()
    .optional()
    .describe("ISO 8601 lower bound. Default: nessun limite inferiore."),
  category: z
    .enum([
      "BLOOD_TEST",
      "IMAGING",
      "CARDIOLOGY",
      "ENDOCRINOLOGY",
      "GENERAL_VISIT",
      "PRESCRIPTION",
      "VACCINATION",
      "SURGERY",
      "OTHER",
    ])
    .optional()
    .describe("Default: tutte le categorie."),
});

const testResultsOutputSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      category: z.string(),
      uploadedAt: z.string().describe("ISO 8601"),
      uploadedByName: z.string().nullable(),
      fileName: z.string().nullable(),
      // VIETATO: valori clinici. Solo metadati.
    })
  ),
  totalCount: z.number().int(),
});

// ============================================================
// Factory: builds tools bound to a specific authenticated userId.
// ============================================================

/**
 * Costruisce i 3 tool dell'Agente di Ferro per uno specifico utente loggato.
 * Pattern raccomandato AI SDK v6: il `userId` è chiuso nella closure, mai
 * accessibile al modello.
 *
 * @param userIdContext id Supabase auth dell'utente corrente
 * @param prisma client Prisma (passato dalla route per evitare side-effects in test)
 */
export function buildAgenteFerroTools(
  userIdContext: string,
  prisma: PrismaClient
) {
  return {
    get_user_profile: tool({
      description:
        "Recupera il profilo personale dell'utente loggato (nome, sesso, età, altezza, condizioni mediche dichiarate, target peso). Usa SOLO quando l'utente fa domande sul SUO profilo.",
      inputSchema: userProfileSchema,
      outputSchema: userProfileOutputSchema,
      async execute() {
        if (isDevBypass()) {
          return getMockUserProfile(userIdContext);
        }

        const user = await prisma.user.findUnique({
          where: { id: userIdContext },
          select: {
            fullName: true,
            firstName: true,
            sex: true,
            birthDate: true,
            heightCm: true,
            targetWeightKg: true,
            medicalConditions: true,
            allergies: true,
            medications: true,
            injuries: true,
            role: true,
            onboardingCompleted: true,
          },
        });

        if (!user) {
          throw new Error("user_not_found");
        }

        const ageYears =
          user.birthDate != null
            ? Math.floor(
                (Date.now() - new Date(user.birthDate).getTime()) /
                  (1000 * 60 * 60 * 24 * 365.25)
              )
            : null;

        return {
          fullName: user.fullName,
          firstName: user.firstName,
          sex: (user.sex as "MALE" | "FEMALE" | "OTHER" | null) ?? null,
          ageYears,
          heightCm: user.heightCm,
          targetWeightKg: user.targetWeightKg,
          medicalConditions: user.medicalConditions,
          allergies: user.allergies,
          medications: user.medications,
          injuries: user.injuries,
          role: user.role,
          onboardingCompleted: user.onboardingCompleted,
        };
      },
    }),

    get_orders: tool({
      description:
        "Recupera lo storico ordini/abbonamenti Stripe dell'utente. Usa per domande su acquisti, stato membership attiva, rinnovi.",
      inputSchema: ordersSchema,
      outputSchema: ordersOutputSchema,
      async execute() {
        if (isDevBypass()) {
          return getMockOrders(userIdContext);
        }

        // NB: il modello `Subscription` ha `stripePriceId` + `status` ma NO `tier` field.
        // Mappa price ID → tier via `priceIdToTier` (popolare con price IDs reali appena
        // Giuseppe condivide). I one-shot Stripe payments (consulenza €27, Founder Pass €119
        // upfront) NON hanno ancora una entity dedicata in dashboard — arriveranno via
        // sync dal SITO Worker post-beta team Leone.
        const subscriptions = await prisma.subscription.findMany({
          where: { userId: userIdContext },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        const orders = subscriptions.map((s) => ({
          id: s.id,
          tier: priceIdToTier(s.stripePriceId),
          amountEur: 0, // popolato da Stripe sync futuro (richiede webhook → Subscription.amountEur o tabella StripePayment)
          status: String(s.status).toLowerCase(),
          purchasedAt: s.createdAt.toISOString(),
          renewsAt: s.currentPeriodEnd?.toISOString() ?? null,
        }));

        const hasActiveSubscription = orders.some((o) =>
          ["active", "trialing", "paid"].includes(o.status)
        );

        return { orders, hasActiveSubscription };
      },
    }),

    get_test_results: tool({
      description:
        "Recupera i metadati dei referti caricati dall'utente (NON i valori clinici, solo categoria/data/autore). Usa per domande tipo 'che pannelli ho già fatto?'. Il modello NON deve interpretare i valori, solo elencare.",
      inputSchema: testResultsSchema,
      outputSchema: testResultsOutputSchema,
      async execute(args) {
        if (isDevBypass()) {
          return getMockTestResults(userIdContext, {
            fromDate: args?.fromDate,
            category: args?.category,
          });
        }

        const fromDate = args?.fromDate ? new Date(args.fromDate) : null;
        const where: Prisma.MedicalReportWhereInput = {
          patientId: userIdContext,
        };
        if (args?.category) where.category = args.category;
        if (fromDate) where.uploadedAt = { gte: fromDate };

        const reports = await prisma.medicalReport.findMany({
          where,
          orderBy: { uploadedAt: "desc" },
          take: 50,
          select: {
            id: true,
            category: true,
            uploadedAt: true,
            fileName: true,
            uploadedBy: { select: { fullName: true } },
          },
        });

        return {
          results: reports.map((r) => ({
            id: r.id,
            category: r.category,
            uploadedAt: r.uploadedAt.toISOString(),
            uploadedByName: r.uploadedBy?.fullName ?? null,
            fileName: r.fileName ?? null,
          })),
          totalCount: reports.length,
        };
      },
    }),
  };
}
