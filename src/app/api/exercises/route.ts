import { NextResponse } from "next/server";
import { Prisma, MuscleGroup, Equipment } from "@prisma/client";
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

const createExerciseSchema = z.object({
  name: z.string().min(3).max(100),
  nameIt: z.string().min(3).max(100),
  muscleGroup: z.enum(MUSCLE_GROUPS),
  secondaryMuscles: z.array(z.enum(MUSCLE_GROUPS)).optional().default([]),
  equipment: z.enum(EQUIPMENTS),
  description: z.string().max(2000).optional(),
  steps: z.array(z.string()).optional().default([]),
  tips: z.array(z.string()).optional().default([]),
  commonMistakes: z.array(z.string()).optional().default([]),
  variants: z.array(z.string()).optional().default([]),
  videoUrl: z.string().url().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  visibility: z.enum(["PRIVATE", "ORGANIZATION", "GLOBAL"]).optional().default("PRIVATE"),
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

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

export async function GET(req: Request) {
  const user = isDevBypass(req) ? DEV_USER : await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || undefined;
  const muscleGroupParam = searchParams.get("muscleGroup");
  const equipmentParam = searchParams.get("equipment");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20") || 20));

  const where: Prisma.ExerciseWhereInput = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { nameIt: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (muscleGroupParam && muscleGroupParam !== "ALL" && MUSCLE_GROUPS.includes(muscleGroupParam as (typeof MUSCLE_GROUPS)[number])) {
    where.muscleGroup = muscleGroupParam as MuscleGroup;
  }
  if (equipmentParam && equipmentParam !== "ALL" && EQUIPMENTS.includes(equipmentParam as (typeof EQUIPMENTS)[number])) {
    where.equipment = equipmentParam as Equipment;
  }

  const [total, exercises] = await Promise.all([
    prisma.exercise.count({ where }),
    prisma.exercise.findMany({
      where,
      orderBy: [{ muscleGroup: "asc" }, { nameIt: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    exercises,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: Request) {
  const user = isDevBypass(req) ? DEV_USER : await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = getUserRole(user);
  if (role !== "COACH" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createExerciseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  const organizationId = (user.app_metadata?.organizationId as string | undefined) ?? null;
  const isGlobal = data.visibility === "GLOBAL" && role === "ADMIN";
  const resolvedOrganizationId =
    data.visibility === "ORGANIZATION" || data.visibility === "PRIVATE" ? organizationId : null;

  const baseSlug = slugify(data.name || data.nameIt);
  let slug = baseSlug;
  let attempt = 1;
  while (await prisma.exercise.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
    if (attempt > 50) {
      return NextResponse.json({ error: "Slug collision" }, { status: 409 });
    }
  }

  try {
    const exercise = await prisma.exercise.create({
      data: {
        name: data.name,
        nameIt: data.nameIt,
        slug,
        muscleGroup: data.muscleGroup as MuscleGroup,
        secondaryMuscles: data.secondaryMuscles as MuscleGroup[],
        equipment: data.equipment as Equipment,
        description: data.description,
        steps: data.steps,
        tips: data.tips,
        commonMistakes: data.commonMistakes,
        variants: data.variants,
        videoUrl: data.videoUrl ?? null,
        thumbnailUrl: data.thumbnailUrl ?? null,
        organizationId: resolvedOrganizationId,
        isGlobal,
      },
    });
    return NextResponse.json({ success: true, exercise }, { status: 201 });
  } catch (err) {
    console.error("Exercise create failed", err);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
