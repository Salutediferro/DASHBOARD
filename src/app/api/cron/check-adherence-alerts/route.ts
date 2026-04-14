import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeCron, currentRomeHour } from "@/lib/cron/guard";
import { computeAdherence } from "@/lib/services/adherence";
import { createNotification } from "@/lib/services/notifications";

const WEEK = 7 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const err = authorizeCron(req);
  if (err) return err;

  const forced = new URL(req.url).searchParams.get("force") === "1";
  if (!forced && currentRomeHour() !== 9) {
    return NextResponse.json({ skipped: true, reason: "not 09:00 Europe/Rome" });
  }

  const relations = await prisma.coachClient.findMany({
    where: { status: "ACTIVE" },
    include: {
      client: { select: { id: true, fullName: true } },
    },
  });

  const now = Date.now();
  const alerts: string[] = [];

  for (const rel of relations) {
    const { overall } = await computeAdherence(rel.clientId);
    if (overall >= 0.5) continue;

    // throttle: one alert per client per week
    const last = rel.lastLowAdherenceAlertAt?.getTime() ?? 0;
    if (now - last < WEEK) continue;

    await createNotification({
      userId: rel.coachId,
      type: "AI",
      title: `Aderenza bassa: ${rel.client.fullName}`,
      body: `Score complessivo ${Math.round(overall * 100)}%. Valuta un intervento.`,
      actionUrl: `/dashboard/coach/clients/${rel.clientId}`,
    });
    await prisma.coachClient.update({
      where: { id: rel.id },
      data: { lastLowAdherenceAlertAt: new Date() },
    });
    alerts.push(rel.clientId);
  }

  return NextResponse.json({ processed: relations.length, alerts });
}
