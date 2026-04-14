import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assignSchema } from "@/lib/validators/workout";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  // TODO: copy template into client's active schedule + persist
  return NextResponse.json({
    templateId: id,
    ...parsed.data,
    assigned: true,
  });
}
