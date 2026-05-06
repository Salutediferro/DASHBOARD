import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { substituteSchema } from "@/lib/validators/nutrition";
import { macrosForMealFood } from "@/lib/queries/nutrition";

// Returns up to 5 foods from the same category whose macros (calories +
// protein) most closely match the original at the requested quantity.
// Score = 0.6 * |Δkcal/kcal| + 0.4 * |Δprotein/protein| — same weighting
// as the pre-removal implementation. Fats/carbs aren't part of the
// score because the picker is mostly used to swap a protein source.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { organizationId: true },
  });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = substituteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const { foodId, quantity, unit } = parsed.data;

  const original = await prisma.food.findUnique({ where: { id: foodId } });
  if (!original) {
    return NextResponse.json({ error: "Food not found" }, { status: 404 });
  }

  // Same-category alternatives the caller can see.
  const candidates = await prisma.food.findMany({
    where: {
      id: { not: foodId },
      category: original.category,
      OR: [
        { isGlobal: true },
        { organizationId: me.organizationId },
      ],
    },
    take: 60,
  });

  const targetMacros = macrosForMealFood(original, quantity, unit);
  const ranked = candidates
    .map((alt) => {
      const m = macrosForMealFood(alt, quantity, unit);
      const kcalDiff =
        Math.abs(m.calories - targetMacros.calories) /
        Math.max(targetMacros.calories, 1);
      const pDiff =
        Math.abs(m.protein - targetMacros.protein) /
        Math.max(targetMacros.protein, 0.5);
      return {
        score: kcalDiff * 0.6 + pDiff * 0.4,
        alt,
        macros: m,
      };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  return NextResponse.json({
    original: {
      id: original.id,
      name: original.name,
      category: original.category,
      quantity,
      unit,
      ...targetMacros,
    },
    substitutes: ranked.map(({ alt, macros }) => ({
      id: alt.id,
      name: alt.name,
      category: alt.category,
      quantity,
      unit,
      ...macros,
    })),
  });
}
