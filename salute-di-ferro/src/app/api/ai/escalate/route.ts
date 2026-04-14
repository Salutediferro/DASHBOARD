import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createEscalation } from "@/lib/mock-escalations";
import { escalateInputSchema } from "@/lib/validators/support";

// TODO: remove dev bypass
function isDevBypass(req: Request) {
  return (
    process.env.NODE_ENV === "development" &&
    req.headers.get("x-dev-bypass") === "1"
  );
}

const DEV_USER = {
  id: "dev-bypass",
  email: "dev@salutediferro.test",
  app_metadata: { role: "CLIENT" },
  user_metadata: { fullName: "Dev Cliente" },
} as const;

async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function POST(req: Request) {
  const user = isDevBypass(req) ? DEV_USER : await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = escalateInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const clientId = data.clientId ?? user.id;
  const clientName =
    (user.user_metadata?.fullName as string | undefined) ??
    (user.email as string | undefined) ??
    "Cliente";

  const escalation = createEscalation({
    clientId,
    clientName,
    conversationId: data.conversationId ?? null,
    summary: data.conversationSummary,
    category: data.category,
  });

  return NextResponse.json({ success: true, escalation }, { status: 201 });
}
