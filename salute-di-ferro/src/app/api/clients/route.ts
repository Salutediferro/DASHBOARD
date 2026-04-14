import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getClientsMock,
  type ClientStatus,
} from "@/lib/mock-clients";
import { createClientSchema } from "@/lib/validators/client";

async function requireCoach() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const role =
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined);
  if (role !== "COACH" && role !== "ADMIN") return null;
  return user;
}

export async function GET(req: Request) {
  const user = await requireCoach();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const status = (searchParams.get("status") ?? "ALL") as ClientStatus | "ALL";
  const plan = searchParams.get("plan") ?? "ALL";
  const page = Number(searchParams.get("page") ?? "1");
  const sortBy = (searchParams.get("sortBy") ?? "fullName") as
    | "fullName"
    | "email"
    | "lastCheckIn"
    | "adherencePercent";
  const sortDir = (searchParams.get("sortDir") ?? "asc") as "asc" | "desc";

  return NextResponse.json(
    getClientsMock({ q, status, plan, sortBy, sortDir, page, perPage: 20 }),
  );
}

export async function POST(req: Request) {
  const user = await requireCoach();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json();
  const parsed = createClientSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  // TODO: replace with createClientForCoach() from @/lib/queries/clients
  const created = {
    id: `mock-${Date.now()}`,
    fullName: `${parsed.data.firstName} ${parsed.data.lastName}`,
    email: parsed.data.email,
  };
  return NextResponse.json(created, { status: 201 });
}
