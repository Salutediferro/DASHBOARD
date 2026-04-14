import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  fullName: z.string().min(2),
  role: z.enum(["DOCTOR", "COACH", "PATIENT"]),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { fullName, role } = parsed.data;

  const org = await prisma.organization.findFirst({
    where: { slug: "salute-di-ferro" },
  });
  if (!org) {
    return NextResponse.json(
      { error: "Default organization missing" },
      { status: 500 },
    );
  }

  const dbUser = await prisma.user.upsert({
    where: { id: user.id },
    update: { fullName, role },
    create: {
      id: user.id,
      email: user.email,
      fullName,
      role,
      organizationId: org.id,
    },
    select: { id: true, role: true },
  });

  return NextResponse.json(dbUser);
}
