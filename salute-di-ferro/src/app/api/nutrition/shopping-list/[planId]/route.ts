import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getPlanForCaller } from "@/lib/queries/nutrition";

type Ctx = { params: Promise<{ planId: string }> };

// Aggregates a plan's daily meal-foods into a weekly shopping list:
// `quantity_per_day * 7 * weeks`, grouped by category. Only GRAMS / ML
// quantities are summed in grams; PIECE / SCOOP / TABLESPOON entries
// are passed through with their native unit.
export async function GET(req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;
  const plan = await getPlanForCaller(me, planId);
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const weeks = Math.max(1, Math.min(Number(searchParams.get("weeks") ?? "1"), 12));

  type Aggregated = {
    foodId: string;
    name: string;
    category: string | null;
    grams: number;
    other: { unit: string; quantity: number }[];
  };
  const byFood = new Map<string, Aggregated>();

  for (const meal of plan.meals) {
    for (const mf of meal.foods) {
      const slot = byFood.get(mf.foodId) ?? {
        foodId: mf.foodId,
        name: mf.food.name,
        category: mf.food.category,
        grams: 0,
        other: [],
      };
      const factor = 7 * weeks;
      if (mf.unit === "GRAMS" || mf.unit === "ML") {
        slot.grams += mf.quantity * factor;
      } else {
        slot.other.push({ unit: mf.unit, quantity: mf.quantity * factor });
      }
      byFood.set(mf.foodId, slot);
    }
  }

  const groups = new Map<string, Aggregated[]>();
  for (const item of byFood.values()) {
    const key = item.category ?? "ALTRO";
    const arr = groups.get(key) ?? [];
    arr.push(item);
    groups.set(key, arr);
  }

  const list = Array.from(groups.entries())
    .map(([category, items]) => ({
      category,
      items: items
        .map((it) => ({
          foodId: it.foodId,
          name: it.name,
          totalGrams: Math.round(it.grams),
          other: it.other,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));

  return NextResponse.json({ groups: list, weeks, plan: { id: plan.id, name: plan.name } });
}
