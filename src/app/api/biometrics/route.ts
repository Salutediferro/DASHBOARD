import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listBiometrics, upsertEntry } from "@/lib/mock-biometrics";
import { biometricSchema } from "@/lib/validators/biometric";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  return NextResponse.json(listBiometrics({ from, to }));
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = biometricSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  return NextResponse.json(upsertEntry(parsed.data));
}
