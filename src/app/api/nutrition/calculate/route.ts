import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateSchema } from "@/lib/validators/nutrition";

const ACTIVITY_MULTIPLIER = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = calculateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const { weightKg, heightCm, age, sex, activityLevel, goal } = parsed.data;

  // Mifflin-St Jeor
  const bmr =
    sex === "M"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIER[activityLevel]);

  const goalOffset =
    goal === "CUTTING" ? -400 : goal === "BULKING" ? 300 : 0;
  const targetCalories = tdee + goalOffset;

  // Macro split: protein 2g/kg, fats 25% kcal, rest carbs
  const proteinG = Math.round(weightKg * 2);
  const fatsG = Math.round((targetCalories * 0.25) / 9);
  const carbsG = Math.round(
    (targetCalories - proteinG * 4 - fatsG * 9) / 4,
  );

  return NextResponse.json({
    bmr: Math.round(bmr),
    tdee,
    targetCalories,
    range: { min: targetCalories - 100, max: targetCalories + 100 },
    macros: { proteinG, carbsG, fatsG },
  });
}
