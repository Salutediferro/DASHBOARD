import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientDetailMock } from "@/lib/mock-clients";
import { updateClientSchema } from "@/lib/validators/client";

// TODO: remove dev bypass
function isDevBypass(req: Request) {
  return (
    process.env.NODE_ENV === "development" &&
    req.headers.get("x-dev-bypass") === "1"
  );
}

async function requireCoach(req: Request) {
  if (isDevBypass(req)) return { id: "dev-bypass" };
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

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const user = await requireCoach(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const detail = getClientDetailMock(id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await requireCoach(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const json = await req.json();
  const parsed = updateClientSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  return NextResponse.json({ id, ...parsed.data });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const user = await requireCoach(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // TODO: updateClientStatus(coachId, id, "ARCHIVED")
  return NextResponse.json({ id, status: "ARCHIVED" });
}
