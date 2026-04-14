import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { appendMessage, getConversation } from "@/lib/mock-ai";
import {
  countOpenEscalations,
  getEscalation,
  listEscalations,
  resolveEscalation,
  type EscalationStatus,
} from "@/lib/mock-escalations";
import { escalationPatchSchema } from "@/lib/validators/support";

// TODO: remove dev bypass
function isDevBypass(req: Request) {
  return (
    process.env.NODE_ENV === "development" &&
    req.headers.get("x-dev-bypass") === "1"
  );
}

const DEV_COACH = {
  id: "dev-coach",
  email: "coach@salutediferro.test",
  app_metadata: { role: "COACH" },
  user_metadata: { fullName: "Dev Coach" },
} as const;

async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function getUserRole(user: {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}) {
  return (
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined) ??
    null
  );
}

export async function GET(req: Request) {
  const user = isDevBypass(req) ? DEV_COACH : await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = getUserRole(user);
  if (role !== "COACH" && role !== "ADMIN" && !isDevBypass(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  if (searchParams.get("count") === "1") {
    return NextResponse.json({ open: countOpenEscalations() });
  }

  const statusParam = searchParams.get("status");
  const status =
    statusParam === "OPEN" || statusParam === "RESOLVED"
      ? (statusParam as EscalationStatus)
      : undefined;

  return NextResponse.json({ escalations: listEscalations({ status }) });
}

export async function PATCH(req: Request) {
  const user = isDevBypass(req) ? DEV_COACH : await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = getUserRole(user);
  if (role !== "COACH" && role !== "ADMIN" && !isDevBypass(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = escalationPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { id, action, message } = parsed.data;
  const esc = getEscalation(id);
  if (!esc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "REPLY") {
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message required for REPLY" },
        { status: 400 },
      );
    }
    if (esc.conversationId && getConversation(esc.conversationId)) {
      appendMessage(esc.conversationId, {
        role: "assistant",
        content: `\u{1F4AC} Risposta dal coach: ${message.trim()}`,
      });
    }
    resolveEscalation(id);
  } else if (action === "RESOLVE") {
    resolveEscalation(id);
  }

  return NextResponse.json({ success: true, escalation: getEscalation(id) });
}
