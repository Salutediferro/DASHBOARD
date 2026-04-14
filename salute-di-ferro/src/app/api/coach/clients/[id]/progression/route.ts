import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachId } from "@/lib/auth/require-client";
import {
  upsertProgressionSuggestions,
  fetchOneRepMaxHistory,
} from "@/lib/services/progression";

type Ctx = { params: Promise<{ id: string }> };

const KEY_LIFTS = ["back-squat", "bench-press", "deadlift", "military-press"];

export async function GET(req: Request, { params }: Ctx) {
  const coachId = await requireCoachId(req);
  if (!coachId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId } = await params;

  const suggestions = await prisma.progressionSuggestion.findMany({
    where: { clientId, status: "PENDING" },
    include: { exercise: { select: { id: true, nameIt: true, name: true, muscleGroup: true } } },
    orderBy: { createdAt: "desc" },
  });

  const oneRm = await Promise.all(
    KEY_LIFTS.map(async (slug) => ({
      slug,
      history: await fetchOneRepMaxHistory(clientId, slug),
    })),
  );

  return NextResponse.json({ suggestions, oneRm });
}

export async function POST(req: Request, { params }: Ctx) {
  const coachId = await requireCoachId(req);
  if (!coachId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId } = await params;
  const count = await upsertProgressionSuggestions(clientId, coachId);
  return NextResponse.json({ success: true, count });
}
