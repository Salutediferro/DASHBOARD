import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachId } from "@/lib/auth/require-client";

const patchSchema = z.object({
  status: z.enum(["ACCEPTED", "IGNORED"]).optional(),
  suggestedWeight: z.number().min(0).max(1000).optional(),
  suggestedReps: z.number().int().min(1).max(100).optional(),
  suggestedSets: z.number().int().min(1).max(20).optional().nullable(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const coachId = await requireCoachId(req);
  if (!coachId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.progressionSuggestion.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.coachId !== coachId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.progressionSuggestion.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(updated);
}
