import { NextResponse } from "next/server";
import { requireCoachId } from "@/lib/auth/require-client";
import { computeAdherenceForCoachClients } from "@/lib/services/adherence";

export async function GET(req: Request) {
  const coachId = await requireCoachId(req);
  if (!coachId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const windowDays = Number(url.searchParams.get("windowDays") ?? 14);
  const rows = await computeAdherenceForCoachClients(coachId, windowDays);
  return NextResponse.json({ rows });
}
