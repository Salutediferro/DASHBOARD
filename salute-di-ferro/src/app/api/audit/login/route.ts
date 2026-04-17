import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/audit/login
 *
 * Called by the client right after a successful `signInWithPassword`
 * (or after `exchangeCodeForSession` in /auth/callback). The server
 * reads the newly established session, confirms a user exists, and
 * appends a LOGIN row to AuditLog with actor + ip + user-agent.
 *
 * Why client-fired and not in /auth/callback:
 *   - The password login path goes through the Supabase SDK directly
 *     from the AuthForm, not through our server — we never see it.
 *     A client POST is the one common hook across magic-link,
 *     email-confirm, and password flows.
 *
 * Best-effort: never propagates failures to the caller (don't block a
 * legit login because of an audit hiccup). Always returns 204.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await logAudit({
        actorId: user.id,
        action: "LOGIN",
        entityType: "User",
        entityId: user.id,
        metadata: {
          method:
            (user.app_metadata?.provider as string | undefined) ??
            "password",
        },
        request: req,
      });
    }
  } catch {
    // swallow — never block a real login on audit failure
  }
  return new NextResponse(null, { status: 204 });
}
