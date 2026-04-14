import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";

import {
  aiDaySchema,
  regenerateDayInputSchema,
} from "@/lib/validators/ai-program";
import {
  buildRegenerateDayPrompt,
  buildSystemPrompt,
  fetchExerciseCatalog,
  requireCoachOrDev,
  sanitizeDay,
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

  const parsed = regenerateDayInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const { program, dayIndex, ...input } = parsed.data;
  if (dayIndex >= program.days.length) {
    return NextResponse.json({ error: "dayIndex out of range" }, { status: 400 });
  }

  const catalog = await fetchExerciseCatalog(input.equipment);
  if (catalog.length === 0) {
    return NextResponse.json({ error: "Catalogo vuoto" }, { status: 422 });
  }

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: aiDaySchema,
      system: buildSystemPrompt(),
      prompt: buildRegenerateDayPrompt(input, program, dayIndex, catalog),
      schemaName: "WorkoutDay",
    });

    const { day, dropped } = sanitizeDay(object, catalog);
    if (day.exercises.length === 0) {
      return NextResponse.json(
        { error: "AI hallucinated exercises", dropped },
        { status: 422 },
      );
    }
    return NextResponse.json({ day, dropped });
  } catch (err) {
    console.error("[ai/regenerate-day] failed", err);
    return NextResponse.json(
      { error: "Rigenerazione fallita", detail: (err as Error).message },
      { status: 500 },
    );
  }
}
