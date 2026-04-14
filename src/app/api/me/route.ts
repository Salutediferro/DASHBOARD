import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { profilePatchSchema } from "@/lib/validators/profile";

const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  firstName: true,
  lastName: true,
  sex: true,
  birthDate: true,
  heightCm: true,
  phone: true,
  avatarUrl: true,
  role: true,
  onboardingCompleted: true,
  primaryGoal: true,
  fitnessLevel: true,
  weeklyActivityHours: true,
  medicalConditions: true,
  allergies: true,
  medications: true,
  injuries: true,
} as const;

type DbUser = {
  id: string;
  email: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  sex: "MALE" | "FEMALE" | "OTHER" | null;
  birthDate: Date | null;
  heightCm: number | null;
  phone: string | null;
  avatarUrl: string | null;
  role: "ADMIN" | "COACH" | "CLIENT";
  onboardingCompleted: boolean;
  primaryGoal: string | null;
  fitnessLevel: string | null;
  weeklyActivityHours: number | null;
  medicalConditions: string | null;
  allergies: string | null;
  medications: string | null;
  injuries: string | null;
};

function serializeUser(u: DbUser) {
  return {
    ...u,
    birthDate: u.birthDate ? u.birthDate.toISOString().slice(0, 10) : null,
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json(null, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: USER_SELECT,
  });

  if (!dbUser) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(serializeUser(dbUser));
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = profilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  const updates: Record<string, unknown> = {};
  if (data.firstName !== undefined) updates.firstName = data.firstName;
  if (data.lastName !== undefined) updates.lastName = data.lastName;
  if (data.sex !== undefined) updates.sex = data.sex;
  if (data.birthDate !== undefined) {
    updates.birthDate = data.birthDate ? new Date(data.birthDate) : null;
  }
  if (data.heightCm !== undefined) updates.heightCm = data.heightCm;
  if (data.phone !== undefined) updates.phone = data.phone;

  if (data.primaryGoal !== undefined) updates.primaryGoal = data.primaryGoal;
  if (data.fitnessLevel !== undefined) updates.fitnessLevel = data.fitnessLevel;
  if (data.weeklyActivityHours !== undefined)
    updates.weeklyActivityHours = data.weeklyActivityHours;

  if (data.medicalConditions !== undefined)
    updates.medicalConditions = data.medicalConditions;
  if (data.allergies !== undefined) updates.allergies = data.allergies;
  if (data.medications !== undefined) updates.medications = data.medications;
  if (data.injuries !== undefined) updates.injuries = data.injuries;

  // Keep fullName in sync when first/last name changes
  if (data.firstName !== undefined || data.lastName !== undefined) {
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true },
    });
    const fn = data.firstName !== undefined ? data.firstName : current?.firstName;
    const ln = data.lastName !== undefined ? data.lastName : current?.lastName;
    const composed = [fn, ln].filter(Boolean).join(" ").trim();
    if (composed.length > 0) updates.fullName = composed;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updates,
    select: USER_SELECT,
  });

  return NextResponse.json(serializeUser(updated));
}
