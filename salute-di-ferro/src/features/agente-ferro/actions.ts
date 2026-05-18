"use server";

/**
 * Server Actions per la pagina proattiva Agente di Ferro.
 *
 *  - markTherapyTaken  → registra intake terapia (TherapyIntake)
 *  - dismissAction     → archivia una briefing action (no-op finché lo schema
 *                        non ha un campo `BriefingAction` persistente: in dev
 *                        bypass torna ok, in prod ritorna `{ok:false}` se non
 *                        c'è ancora il record relativo)
 *  - completeCheckIn   → segna un CheckIn come completato
 *
 * Sicurezza · IDOR fix 2026-05-15:
 *  - `userId` NON viene mai accettato dal client. È derivato server-side
 *    via Supabase auth (dev-bypass supportato).
 *  - Su ogni Prisma mutation è applicato un cross-check di ownership
 *    (`patientId: userId` nel `where`) per evitare che un utente A possa
 *    modificare risorse di B nemmeno se conosce un itemId/checkInId.
 *
 * Tutte le action invalidano i cache tag rilevanti del briefing dell'utente.
 */

import { revalidateTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type ActionResult = {
  ok: boolean;
  error?: string;
};

function isDevBypass(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_BYPASS === "1"
  );
}

/**
 * Recupera l'userId autenticato lato server. NON accetta input dal client.
 * In dev-bypass usa il mock user id coerente con `page.tsx` / handler.ts.
 * Lancia eccezione `unauthorized` se non c'è sessione.
 */
async function getAuthUserId(): Promise<string> {
  if (isDevBypass()) {
    return process.env.DEV_MOCK_USER_ID || "mock-mature-attention";
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("unauthorized");
  }
  return user.id;
}

function revalidateBriefing(userId: string): void {
  // Background revalidation (SWR). Per read-your-own-writes "immediato"
  // serve `updateTag` ma è API legata a `cacheComponents: true` (vedi TODO
  // in briefing.ts). Finché il flag non è on, queste chiamate sono no-op
  // sicure: il briefing non è ancora cached.
  revalidateTag(`briefing:${userId}`);
  revalidateTag(`greeting:${userId}`);
  revalidateTag(`therapy:${userId}`);
}

/**
 * Marca una terapia come assunta "ora". Crea una `TherapyIntake` con
 * `takenAt = now`.
 *
 * Ownership: l'`itemId` viene scritto in upsert vincolato a `patientId`
 * derivato server-side. Se l'item appartiene ad un altro paziente il
 * `create` fallirà sul cross-check `patientId`.
 */
export async function markTherapyTaken(
  itemId: string,
): Promise<ActionResult> {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return { ok: false, error: "unauthorized" };
  }

  if (isDevBypass()) {
    revalidateBriefing(userId);
    return { ok: true };
  }

  try {
    // Ownership cross-check: verifichiamo che l'item appartenga davvero
    // all'utente prima di scrivere. Senza questa lettura, l'upsert con
    // `itemId_date` unique potrebbe accettare un itemId di un altro
    // patient e creare un intake collegato all'userId sbagliato.
    const item = await prisma.therapyItem.findFirst({
      where: { id: itemId, patientId: userId },
      select: { id: true },
    });
    if (!item) {
      return { ok: false, error: "forbidden" };
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    await prisma.therapyIntake.upsert({
      where: {
        itemId_date: {
          itemId,
          date: today,
        },
      },
      update: {
        taken: true,
        takenAt: new Date(),
      },
      create: {
        itemId,
        patientId: userId,
        date: today,
        taken: true,
        takenAt: new Date(),
      },
    });
    revalidateBriefing(userId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "intake_failed",
    };
  }
}

/**
 * "Nasconde" una briefing action dalla lista. Per ora rivalida soltanto
 * (no-op DB) — il data layer userà la struttura `topActions` derivata,
 * quindi il dismiss reale avverrà aggiornando lo stato sorgente (es.
 * snooze terapia, completamento check-in, etc.). Lasciamo qui l'hook
 * stabile per la UI optimistic.
 */
export async function dismissAction(
  actionId: string,
): Promise<ActionResult> {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return { ok: false, error: "unauthorized" };
  }

  if (isDevBypass()) {
    revalidateBriefing(userId);
    return { ok: true };
  }

  // No-op finché non c'è una tabella `BriefingActionDismissal`.
  // L'UI fa ottimismo lato client; il refresh tag basta a riallineare.
  void actionId;
  revalidateBriefing(userId);
  return { ok: true };
}

/**
 * Segna un check-in come completato (timestamp `completedAt`).
 *
 * Ownership: usa `updateMany` con cross-check `patientId: userId` per
 * evitare IDOR. Se nessuna riga matcha, ritorna `forbidden`.
 */
export async function completeCheckIn(
  checkInId: string,
): Promise<ActionResult> {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return { ok: false, error: "unauthorized" };
  }

  if (isDevBypass()) {
    revalidateBriefing(userId);
    return { ok: true };
  }

  try {
    const res = await prisma.checkIn.updateMany({
      where: { id: checkInId, patientId: userId },
      data: { status: "REVIEWED" },
    });
    if (res.count === 0) {
      return { ok: false, error: "forbidden" };
    }
    revalidateBriefing(userId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "checkin_failed",
    };
  }
}
