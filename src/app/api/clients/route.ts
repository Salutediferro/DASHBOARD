import { NextResponse } from "next/server";
import type { CareRelationshipStatus, ProfessionalRole } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { listPatientsForProfessional } from "@/lib/queries/clients";

async function requireProfessional() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!me) return null;
  if (me.role !== "DOCTOR" && me.role !== "COACH" && me.role !== "ADMIN") {
    return null;
  }
  return me;
}

export async function GET(req: Request) {
  const me = await requireProfessional();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const statusParam = searchParams.get("status");
  const status: CareRelationshipStatus | "ALL" =
    statusParam === "ACTIVE" ||
    statusParam === "PAUSED" ||
    statusParam === "ARCHIVED"
      ? statusParam
      : "ALL";
  const roleParam = searchParams.get("role");
  const professionalRole: ProfessionalRole | undefined =
    roleParam === "DOCTOR" || roleParam === "COACH" ? roleParam : undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const sortBy = (searchParams.get("sortBy") ?? "fullName") as
    | "fullName"
    | "createdAt";
  const sortDir = (searchParams.get("sortDir") ?? "asc") as "asc" | "desc";

  return NextResponse.json(
    await listPatientsForProfessional({
      professionalId: me.id,
      professionalRole,
      q,
      status,
      page,
      perPage: 20,
      sortBy,
      sortDir,
    }),
  );
}
