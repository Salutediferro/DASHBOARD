import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { listIntakes } from "@/lib/services/therapy";
import { therapyErrorResponse } from "../route";
import type { TherapyIntake } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/therapy/intake/[id]&patientId=…
 *
 * List all [id] intake rows for a patient.
 */
export async function GET(req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const explicit = url.searchParams.get("patientId");
  const { id: med } = await params;
  const patientId = explicit && explicit !== me.id ? explicit : me.id;

  try {
    const items = await prisma.therapyIntake.findMany({
      where: {
        patientId,
        itemId: med,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ items: items as TherapyIntake[] });
  } catch (e) {
    return therapyErrorResponse(e);
  }
}
