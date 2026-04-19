import { NextResponse } from "next/server";
import type { Prisma, Sex } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

type OnboardingBody = {
  role?: string;
  data?: {
    birthDate?: string | null;
    sex?: "M" | "F" | "" | null;
    heightCm?: number | null;
    weightKg?: number | null;
    allergies?: string | null;
    medicalConditions?: string | null;
    emergencyContact?: string | null;
  };
};

function trimToNull(v: string | null | undefined): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function sexToEnum(v: string | null | undefined): Sex | null {
  if (v === "M") return "MALE";
  if (v === "F") return "FEMALE";
  return null;
}

function sanitizeHeight(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  if (v < 80 || v > 250) return null;
  return Math.round(v);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as OnboardingBody;
  const data = body.data ?? {};

  const patch: Prisma.UserUpdateInput = { onboardingCompleted: true };

  const birth = trimToNull(data.birthDate ?? null);
  if (birth && /^\d{4}-\d{2}-\d{2}$/.test(birth)) {
    patch.birthDate = new Date(birth);
  }
  const sex = sexToEnum(data.sex);
  if (sex) patch.sex = sex;
  const height = sanitizeHeight(data.heightCm ?? null);
  if (height != null) patch.heightCm = height;

  const allergies = trimToNull(data.allergies ?? null);
  if (allergies != null) patch.allergies = allergies.slice(0, 2000);
  const conditions = trimToNull(data.medicalConditions ?? null);
  if (conditions != null) patch.medicalConditions = conditions.slice(0, 2000);
  const emergency = trimToNull(data.emergencyContact ?? null);
  if (emergency != null) patch.emergencyContact = emergency.slice(0, 200);

  try {
    await prisma.user.update({ where: { id: user.id }, data: patch });
  } catch {
    // User row may not exist yet for unlinked/test accounts — don't crash.
  }

  return NextResponse.json({ ok: true });
}
