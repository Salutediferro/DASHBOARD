import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { FOOD_CATEGORIES } from "@/lib/validators/nutrition";

export async function GET(req: Request) {
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

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("search") ?? searchParams.get("q") ?? "").trim();
  const category = searchParams.get("category");
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 200);

  const foods = await prisma.food.findMany({
    where: {
      AND: [
        // Visible: global foods, or org-scoped to caller's org.
        {
          OR: [
            { isGlobal: true },
            { organizationId: me.organizationId },
          ],
        },
        q ? { name: { contains: q, mode: "insensitive" } } : {},
        category && category !== "ALL" && (FOOD_CATEGORIES as readonly string[]).includes(category)
          ? { category }
          : {},
      ],
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    take: limit,
  });

  return NextResponse.json({ foods });
}
