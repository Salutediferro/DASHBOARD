import { NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { prisma } from "@/lib/prisma";
import { authorizeCron, currentRomeHour } from "@/lib/cron/guard";
import { createNotification } from "@/lib/services/notifications";

const DAY = 24 * 60 * 60 * 1000;
const THROTTLE = 3 * DAY;

async function craftMessage(name: string, days: number): Promise<string> {
  const fallback = `Ehi ${name}, ti abbiamo lasciato riposare ma ora il bilanciere ti aspetta. Anche una sessione breve di oggi riaccende il motore.`;
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === "placeholder") return fallback;
  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system:
        "Sei un coach empatico. Messaggi brevi, motivazionali, in italiano. Mai giudicante, max 2 frasi.",
      prompt: `${name} non si allena da ${days} giorni. Obiettivo: mantenersi in forma. Genera un breve messaggio motivazionale personalizzato in italiano (max 2 frasi). Tono: incoraggiante ma non pressante.`,
      maxRetries: 1,
    });
    return text.trim();
  } catch {
    return fallback;
  }
}

export async function GET(req: Request) {
  const err = authorizeCron(req);
  if (err) return err;

  const forced = new URL(req.url).searchParams.get("force") === "1";
  if (!forced && currentRomeHour() !== 9) {
    return NextResponse.json({ skipped: true, reason: "not 09:00 Europe/Rome" });
  }

  const relations = await prisma.coachClient.findMany({
    where: { status: "ACTIVE" },
    include: { client: { select: { id: true, fullName: true } } },
  });

  const now = Date.now();
  const sent: string[] = [];

  for (const rel of relations) {
    const last = rel.lastInactivityNudgeAt?.getTime() ?? 0;
    if (now - last < THROTTLE) continue;

    const lastLog = await prisma.workoutLog.findFirst({
      where: { clientId: rel.clientId, completed: true },
      orderBy: { date: "desc" },
      select: { date: true },
    });
    const lastDate = lastLog?.date.getTime() ?? 0;
    const days = Math.floor((now - lastDate) / DAY);
    if (days < 3) continue;

    const message = await craftMessage(rel.client.fullName, days);
    await createNotification({
      userId: rel.clientId,
      type: "AI",
      title: "Un messaggio per te",
      body: message,
      actionUrl: "/dashboard/client/workouts",
    });
    await prisma.coachClient.update({
      where: { id: rel.id },
      data: { lastInactivityNudgeAt: new Date() },
    });
    sent.push(rel.clientId);
  }

  return NextResponse.json({ processed: relations.length, sent });
}
