import { NextResponse } from "next/server";
import { MuscleGroup, Equipment } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const MUSCLE_GROUPS = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "QUADS",
  "HAMSTRINGS",
  "GLUTES",
  "CALVES",
  "ABS",
  "FULL_BODY",
  "CARDIO",
] as const;

const EQUIPMENTS = [
  "BARBELL",
  "DUMBBELL",
  "MACHINE",
  "CABLE",
  "BODYWEIGHT",
  "BAND",
  "KETTLEBELL",
  "OTHER",
] as const;

const updateExerciseSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  nameIt: z.string().min(3).max(100).optional(),
  muscleGroup: z.enum(MUSCLE_GROUPS).optional(),
  secondaryMuscles: z.array(z.enum(MUSCLE_GROUPS)).optional(),
  equipment: z.enum(EQUIPMENTS).optional(),
  description: z.string().max(2000).optional().nullable(),
  steps: z.array(z.string()).optional(),
  tips: z.array(z.string()).optional(),
  commonMistakes: z.array(z.string()).optional(),
  variants: z.array(z.string()).optional(),
  videoUrl: z.string().url().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
});

type Ctx = { params: Promise<{ id: string }> };

function isDevBypass(req: Request) {
  return (
    process.env.NODE_ENV === "development" &&
    req.headers.get("x-dev-bypass") === "1"
  );
}

const DEV_USER = {
  id: "dev-bypass",
  app_metadata: { role: "ADMIN", organizationId: null },
  user_metadata: {},
} as const;

async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function getUserRole(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }) {
  return (
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined) ??
    null
  );
}

export async function GET(req: Request, { params }: Ctx) {
  const user = isDevBypass(req) ? DEV_USER : await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const exercise = await prisma.exercise.findUnique({ where: { id } });
  if (!exercise) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(exercise);
}

export async function PUT(req: Request, { params }: Ctx) {
  const user = isDevBypass(req) ? DEV_USER : await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = getUserRole(user);
  if (role !== "COACH" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const existing = await prisma.exercise.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = updateExerciseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;

  // Media-only updates (videoUrl/thumbnailUrl) are allowed to any COACH on any exercise,
  // including global ones. Other field changes still require ownership/admin.
  const mediaOnly =
    Object.keys(d).every((k) => k === "videoUrl" || k === "thumbnailUrl") &&
    Object.keys(d).length > 0;

  if (!mediaOnly) {
    if (existing.isGlobal && role !== "ADMIN") {
      return NextResponse.json({ error: "Cannot edit global exercise" }, { status: 403 });
    }
    const userOrgId = (user.app_metadata?.organizationId as string | undefined) ?? null;
    if (
      role !== "ADMIN" &&
      existing.organizationId &&
      userOrgId &&
      existing.organizationId !== userOrgId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const exercise = await prisma.exercise.update({
      where: { id },
      data: {
        ...(d.name !== undefined && { name: d.name }),
        ...(d.nameIt !== undefined && { nameIt: d.nameIt }),
        ...(d.muscleGroup !== undefined && { muscleGroup: d.muscleGroup as MuscleGroup }),
        ...(d.secondaryMuscles !== undefined && {
          secondaryMuscles: d.secondaryMuscles as MuscleGroup[],
        }),
        ...(d.equipment !== undefined && { equipment: d.equipment as Equipment }),
        ...(d.description !== undefined && { description: d.description }),
        ...(d.steps !== undefined && { steps: d.steps }),
        ...(d.tips !== undefined && { tips: d.tips }),
        ...(d.commonMistakes !== undefined && { commonMistakes: d.commonMistakes }),
        ...(d.variants !== undefined && { variants: d.variants }),
        ...(d.videoUrl !== undefined && { videoUrl: d.videoUrl }),
        ...(d.thumbnailUrl !== undefined && { thumbnailUrl: d.thumbnailUrl }),
      },
    });
    return NextResponse.json(exercise);
  } catch (err) {
    console.error("Exercise update failed", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const user = isDevBypass(req) ? DEV_USER : await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = getUserRole(user);
  if (role !== "COACH" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const existing = await prisma.exercise.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.isGlobal && role !== "ADMIN") {
    return NextResponse.json({ error: "Cannot delete global exercise" }, { status: 403 });
  }
  const userOrgId = (user.app_metadata?.organizationId as string | undefined) ?? null;
  if (
    role !== "ADMIN" &&
    existing.organizationId &&
    userOrgId &&
    existing.organizationId !== userOrgId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.exercise.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Exercise delete failed", err);
    return NextResponse.json(
      { error: "Delete failed — may be referenced by workouts" },
      { status: 409 },
    );
  }
}
