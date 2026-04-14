import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeCron, currentRomeHour } from "@/lib/cron/guard";
import { createNotification } from "@/lib/services/notifications";

const HOUR = 60 * 60 * 1000;

export async function GET(req: Request) {
  const err = authorizeCron(req);
  if (err) return err;

  // Only run at 09:00 Europe/Rome (double-scheduled on UTC 07:00 and 08:00 to cover DST).
  const forced = new URL(req.url).searchParams.get("force") === "1";
  if (!forced && currentRomeHour() !== 9) {
    return NextResponse.json({ skipped: true, reason: "not 09:00 Europe/Rome" });
  }

  const now = new Date();
  const relations = await prisma.coachClient.findMany({
    where: {
      status: "ACTIVE",
      checkInFrequency: { not: "NONE" },
      nextCheckInAt: { lte: now },
    },
    include: {
      client: { select: { id: true, fullName: true } },
      coach: { select: { id: true, fullName: true } },
    },
  });

  const created: Array<{ relationId: string; stage: number }> = [];

  for (const rel of relations) {
    const due = rel.nextCheckInAt!;
    const elapsedH = (now.getTime() - due.getTime()) / HOUR;
    const stage = rel.checkInReminderStage;

    // Stage 0 → initial reminder to client.
    if (stage === 0 && elapsedH >= 0) {
      await createNotification({
        userId: rel.clientId,
        type: "CHECK_IN",
        title: "È ora del tuo check-in!",
        body: "Aggiorna le tue misurazioni e foto per restare in linea con il piano.",
        actionUrl: "/dashboard/client/check-in",
      });
      await prisma.coachClient.update({
        where: { id: rel.id },
        data: { checkInReminderStage: 1, lastCheckInAt: now },
      });
      created.push({ relationId: rel.id, stage: 1 });
      continue;
    }

    // Stage 1 → 24h later, second reminder to client.
    if (stage === 1 && elapsedH >= 24) {
      await createNotification({
        userId: rel.clientId,
        type: "CHECK_IN",
        title: "Secondo promemoria check-in",
        body: "Non dimenticare il check-in di oggi. Basta un minuto.",
        actionUrl: "/dashboard/client/check-in",
      });
      await prisma.coachClient.update({
        where: { id: rel.id },
        data: { checkInReminderStage: 2 },
      });
      created.push({ relationId: rel.id, stage: 2 });
      continue;
    }

    // Stage 2 → 48h later, escalate to coach.
    if (stage === 2 && elapsedH >= 48) {
      await createNotification({
        userId: rel.coachId,
        type: "CHECK_IN",
        title: `Check-in in ritardo: ${rel.client.fullName}`,
        body: "Il cliente non ha completato il check-in da 48h. Contattalo.",
        actionUrl: `/dashboard/coach/clients/${rel.clientId}`,
      });
      await prisma.coachClient.update({
        where: { id: rel.id },
        data: { checkInReminderStage: 3 },
      });
      created.push({ relationId: rel.id, stage: 3 });
    }
  }

  return NextResponse.json({ processed: relations.length, created });
}
