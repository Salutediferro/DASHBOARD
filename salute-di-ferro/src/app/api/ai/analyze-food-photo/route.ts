import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";

import { requireClientId } from "@/lib/auth/require-client";
import {
  analyzeRequestSchema,
  analyzeResponseSchema,
  type AnalyzeResponse,
} from "@/lib/validators/nutrition-log";

const SYSTEM_PROMPT = `Sei un nutrizionista esperto in analisi visiva di pasti.
Identifichi ogni alimento visibile in una foto e stimi quantità e macronutrienti con criterio clinico.
Rispondi sempre in italiano. Usa confidence HIGH solo quando l'alimento è inequivocabile.`;

const USER_PROMPT = `Analizza questa foto di un pasto. Identifica ogni alimento visibile.
Per ogni alimento stima:
- Nome dell'alimento in italiano (specifico: es. "Petto di pollo alla griglia", non "pollo")
- Quantità approssimativa in grammi (estimatedGrams)
- Calorie totali per la quantità stimata
- Proteine, carboidrati, grassi in grammi per la quantità stimata
- confidence: HIGH se sei certo, MEDIUM se ragionevolmente sicuro, LOW se incerto

Calcola anche totalCalories, totalProtein, totalCarbs, totalFats sommando i singoli alimenti.
Se l'immagine non contiene cibo riconoscibile restituisci un array foods vuoto e totali a 0.`;

function mockAnalyze(): AnalyzeResponse {
  return {
    foods: [
      {
        name: "Petto di pollo alla griglia",
        estimatedGrams: 150,
        calories: 248,
        protein: 46.5,
        carbs: 0,
        fats: 5.4,
        confidence: "HIGH",
      },
      {
        name: "Riso basmati lesso",
        estimatedGrams: 180,
        calories: 234,
        protein: 4.9,
        carbs: 51,
        fats: 0.5,
        confidence: "MEDIUM",
      },
      {
        name: "Verdure grigliate miste",
        estimatedGrams: 120,
        calories: 48,
        protein: 2,
        carbs: 8,
        fats: 1.2,
        confidence: "MEDIUM",
      },
    ],
    totalCalories: 530,
    totalProtein: 53.4,
    totalCarbs: 59,
    totalFats: 7.1,
  };
}

export async function POST(req: Request) {
  const clientId = await requireClientId(req);
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const { photoUrl } = parsed.data;

  const key = process.env.OPENAI_API_KEY;
  if (!key || key === "placeholder") {
    return NextResponse.json({ ...mockAnalyze(), mock: true });
  }

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: analyzeResponseSchema,
      schemaName: "FoodAnalysis",
      schemaDescription: "Analisi di una foto di pasto con alimenti e macro stimati.",
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT },
            { type: "image", image: new URL(photoUrl) },
          ],
        },
      ],
    });
    return NextResponse.json(object);
  } catch (err) {
    console.error("[ai/analyze-food-photo] failed", err);
    return NextResponse.json(
      { error: "Analisi fallita", detail: (err as Error).message },
      { status: 500 },
    );
  }
}
