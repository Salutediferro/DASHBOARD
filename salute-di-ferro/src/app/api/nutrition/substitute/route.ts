import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findSubstitutes, getFoodById } from "@/lib/data/foods";
import { substituteSchema } from "@/lib/validators/nutrition";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = substituteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { foodId, quantityG } = parsed.data;
  const original = getFoodById(foodId);
  if (!original) {
    return NextResponse.json({ error: "Food not found" }, { status: 404 });
  }

  const substitutes = findSubstitutes(foodId, quantityG).map((f) => {
    const k = quantityG / 100;
    return {
      id: f.id,
      name: f.name,
      category: f.category,
      quantityG,
      calories: Math.round(f.caloriesPer100g * k),
      protein: Math.round(f.proteinPer100g * k * 10) / 10,
      carbs: Math.round(f.carbsPer100g * k * 10) / 10,
      fats: Math.round(f.fatsPer100g * k * 10) / 10,
    };
  });

  return NextResponse.json({ original: { id: foodId, quantityG }, substitutes });
}
