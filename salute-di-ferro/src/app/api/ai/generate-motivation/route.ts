import { NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/require-client";

const inputSchema = z.object({
  name: z.string().min(1),
  daysInactive: z.number().int().min(0).max(365),
  goal: z.string().max(300).optional().nullable(),
});

const MOCK_MESSAGES = [
  (name: string) =>
    `Ehi ${name}, il bilanciere ti sta aspettando. Anche una sessione breve oggi ti riporta in carreggiata — senza pressioni.`,
  (name: string) =>
    `${name}, i tuoi muscoli ricordano tutto. Una seduta leggera oggi e riaccendi il motore, un passo alla volta.`,
  (name: string) =>
    `${name}, ogni campione ha avuto settimane no. Ricomincia oggi con un gesto semplice: la costanza batte la perfezione.`,
];

function mock(name: string) {
  return MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)](name);
}

export async function POST(req: Request) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const { name, daysInactive, goal } = parsed.data;

  const key = process.env.OPENAI_API_KEY;
  if (!key || key === "placeholder") {
    return NextResponse.json({ message: mock(name), mock: true });
  }

  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system:
        "Sei un coach empatico. Scrivi messaggi brevi, motivazionali, in italiano. Mai giudicante, mai pressante, mai più di 2 frasi.",
      prompt: `${name} non si allena da ${daysInactive} giorni. Obiettivo: ${goal ?? "mantenersi in forma"}. Genera un breve messaggio motivazionale personalizzato in italiano (max 2 frasi). Tono: incoraggiante ma non pressante.`,
      maxRetries: 1,
    });
    return NextResponse.json({ message: text.trim() });
  } catch (err) {
    console.error("[ai/generate-motivation] failed", err);
    return NextResponse.json({ message: mock(name), mock: true, error: (err as Error).message });
  }
}
