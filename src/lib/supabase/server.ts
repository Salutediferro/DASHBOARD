import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore.
          }
        },
      },
    },
  );
}

/**
 * Resolve the authenticated user from either:
 *   1. An `Authorization: Bearer <jwt>` header (used by the mobile
 *      client, which stores the Supabase session in SecureStore and
 *      has no cookies to send), or
 *   2. The cookie-based SSR session (the default web flow).
 *
 * Opt-in helper — existing routes keep using `createClient()` + cookie
 * session. Add this only on routes that need to serve both web and
 * mobile (e.g. /api/me).
 */
export async function resolveAuthUser(req?: Request): Promise<User | null> {
  const authHeader = req?.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const client = createPlainClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data } = await client.auth.getUser(token);
      if (data.user) return data.user;
    }
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
