import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";

import {
  aiProgramSchema,
  generateProgramInputSchema,
} from "@/lib/validators/ai-program";
import {
  buildGeneratePrompt,
  buildSystemPrompt,
  fetchExerciseCatalog,
  requireCoachOrDev,
  sanitizeProgram,
} from "@/lib/ai/program-generator";

export async function POST(req: Request) {
  const user = await requireCoachOrDev(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = generateProgramInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;

  const catalog = await fetchExerciseCatalog(input.equipment);
  if (catalog.length === 0) {
    return NextResponse.json(
      { error: "Catalogo esercizi vuoto per questa attrezzatura" },
      { status: 422 },
    );
  }

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: aiProgramSchema,
      system: buildSystemPrompt(),
      prompt: buildGeneratePrompt(input, catalog),
      schemaName: "WorkoutProgram",
      schemaDescription: "Programma di allenamento settimanale strutturato.",
    });

    const { program, dropped, emptiedDays } = sanitizeProgram(object, catalog);
    if (emptiedDays.length === program.days.length) {
      return NextResponse.json(
        { error: "AI hallucinated exercises", dropped },
        { status: 422 },
      );
    }
    if (dropped.length > 0) {
      console.warn("[ai/generate-program] dropped hallucinated ids", dropped);
    }
    return NextResponse.json({ program, dropped });
  } catch (err) {
    console.error("[ai/generate-program] failed", err);
    return NextResponse.json(
      { error: "Generazione fallita", detail: (err as Error).message },
      { status: 500 },
    );
  }
}
