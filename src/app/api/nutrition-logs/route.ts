import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClientId } from "@/lib/auth/require-client";
import { createLogRequestSchema } from "@/lib/validators/nutrition-log";

export async function GET(req: Request) {
  const clientId = await requireClientId(req);
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

  const where: {
    clientId: string;
    loggedAt?: { gte?: Date; lte?: Date };
  } = { clientId };
  if (from || to) {
    where.loggedAt = {};
    if (from) where.loggedAt.gte = new Date(from);
    if (to) where.loggedAt.lte = new Date(to);
  }

  const logs = await prisma.nutritionLog.findMany({
    where,
    orderBy: { loggedAt: "desc" },
    take: limit,
    include: { foods: true },
  });
  return NextResponse.json({ logs });
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
  const parsed = createLogRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;

  const totals = d.foods.reduce(
    (a, f) => ({
      cal: a.cal + f.calories,
      p: a.p + f.protein,
      c: a.c + f.carbs,
      f: a.f + f.fats,
    }),
    { cal: 0, p: 0, c: 0, f: 0 },
  );

  try {
    const log = await prisma.nutritionLog.create({
      data: {
        clientId,
        photoUrl: d.photoUrl,
        loggedAt: d.loggedAt ? new Date(d.loggedAt) : new Date(),
        notes: d.notes ?? null,
        totalCalories: totals.cal,
        totalProtein: totals.p,
        totalCarbs: totals.c,
        totalFats: totals.f,
        foods: {
          create: d.foods.map((f) => ({
            name: f.name,
            estimatedGrams: f.estimatedGrams,
            calories: f.calories,
            protein: f.protein,
            carbs: f.carbs,
            fats: f.fats,
            confidence: f.confidence,
          })),
        },
      },
      include: { foods: true },
    });
    return NextResponse.json({ success: true, log });
  } catch (err) {
    console.error("[nutrition-logs POST] failed", err);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
