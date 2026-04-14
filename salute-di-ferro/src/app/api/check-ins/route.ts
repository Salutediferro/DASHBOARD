import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckIn, listCheckIns } from "@/lib/mock-checkins";
import { createCheckInSchema } from "@/lib/validators/checkin";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const status = (searchParams.get("status") ?? "ALL") as
    | "ALL"
    | "PENDING"
    | "REVIEWED";
  const clientId = searchParams.get("clientId") ?? undefined;

  return NextResponse.json(listCheckIns({ q, status, clientId }));
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createCheckInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  // TODO: resolve clientId from the authenticated user (Prisma lookup)
  const created = createCheckIn({
    clientId: user.id,
    clientName:
      (user.user_metadata?.fullName as string | undefined) ??
      user.email ??
      "Cliente",
    ...parsed.data,
  });
  return NextResponse.json(created, { status: 201 });
}
