import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { intakeSchema } from "@/lib/validators/therapy";
import {
  TherapyError,
  listIntakes,
  upsertIntake,
} from "@/lib/services/therapy";

/**
 * GET /api/therapy/intake?from=YYYY-MM-DD&to=YYYY-MM-DD&patientId=…
 *
 * List daily intake rows for a patient in the window [from, to].
 * Defaults: from=today, to=today (single-day fetch for the "oggi" card).
 */
export async function GET(req: Request) {
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
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const patientId = explicit && explicit !== me.id ? explicit : me.id;

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (fromParam && !dateRe.test(fromParam)) {
    return NextResponse.json({ error: "Invalid from" }, { status: 400 });
  }
  if (toParam && !dateRe.test(toParam)) {
    return NextResponse.json({ error: "Invalid to" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const from = new Date(`${fromParam ?? today}T00:00:00.000Z`);
  const to = new Date(`${toParam ?? today}T00:00:00.000Z`);

  try {
    const items = await listIntakes(me, patientId, from, to);
    return NextResponse.json({ items });
  } catch (e) {
    return therapyErrorResponse(e);
  }
}

/**
 * POST /api/therapy/intake
 *
 * Upsert a daily intake row. Only the owning patient can mark intake.
 * Body: { itemId, date: "YYYY-MM-DD", taken: boolean }.
 */
export async function POST(req: Request) {
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

  const body = await req.json();
  const parsed = intakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const saved = await upsertIntake(me, parsed.data);
    return NextResponse.json(saved, { status: 200 });
  } catch (e) {
    return therapyErrorResponse(e);
  }
}

function therapyErrorResponse(e: unknown) {
  if (e instanceof TherapyError) {
    if (e.code === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (e.code === "not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }
  throw e;
}
