import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";

import {
  adjustProgramInputSchema,
  aiProgramSchema,
} from "@/lib/validators/ai-program";
import {
  buildAdjustPrompt,
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

  const parsed = adjustProgramInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  // Adjustments can span equipment; use full catalog.
  const catalog = await fetchExerciseCatalog("FULL_GYM");

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: aiProgramSchema,
      system: buildSystemPrompt(),
      prompt: buildAdjustPrompt(parsed.data.program, parsed.data.instruction, catalog),
      schemaName: "WorkoutProgram",
    });

    const { program, dropped, emptiedDays } = sanitizeProgram(object, catalog);
    if (emptiedDays.length === program.days.length) {
      return NextResponse.json(
        { error: "AI hallucinated exercises", dropped },
        { status: 422 },
      );
    }
    return NextResponse.json({ program, dropped });
  } catch (err) {
    console.error("[ai/adjust-program] failed", err);
    return NextResponse.json(
      { error: "Modifica fallita", detail: (err as Error).message },
      { status: 500 },
    );
  }
}
