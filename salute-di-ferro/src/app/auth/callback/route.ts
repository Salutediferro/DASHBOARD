import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

/**
 * Supabase redirects here after any email-based auth action — signup
 * confirmation, magic link, password recovery. We exchange the one-shot
 * `code` param for a session and then bounce to `next` (dashboard by
 * default).
 *
 * Audit: if the exchange produced a usable session, append a LOGIN row
 * with method='email-link'. Password logins go through AuthForm which
 * calls /api/audit/login directly — the two paths converge at the
 * same audit action.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await logAudit({
            actorId: user.id,
            action: "LOGIN",
            entityType: "User",
            entityId: user.id,
            metadata: { method: "email-link" },
            request,
          });
        }
      } catch {
        // Never block the redirect on an audit hiccup.
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=callback", url.origin));
}
