"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  variant: "login" | "register";
  /** Where the user should land after a successful flow. Defaults to
   *  /dashboard so middleware can route by role. */
  redirectTo?: string;
  /** Required on register: the two GDPR consent checkboxes' state. The
   *  button is rendered disabled until both are true; clicking still
   *  re-checks server-side. */
  consentsAccepted?: boolean;
  /** Optional invite token from the /register?invite=… URL — carried
   *  through OAuth so the callback can auto-create the CareRelationship. */
  inviteToken?: string | null;
  className?: string;
};

/**
 * "Continua con Google" button.
 *
 * Login: hits supabase.auth.signInWithOAuth directly. If the user
 * doesn't have an account yet, the callback bounces them back to
 * /register with an error toast.
 *
 * Register: first calls /api/auth/google-signup/prepare to set a
 * signed httpOnly cookie carrying the consent + invite payload, then
 * starts the OAuth flow. The /auth/callback handler reads the cookie
 * to create the public.User row with the consent audit trail.
 */
export function GoogleAuthButton({
  variant,
  redirectTo,
  consentsAccepted,
  inviteToken,
  className,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const supabase = createClient();

  const isRegister = variant === "register";
  // On /register the button is gated on (a) consents being ticked AND
  // (b) the user arriving via a valid invite link. Without an invite
  // there's no path to a new account — gray out the button so we don't
  // bounce them through Google for a guaranteed 400.
  const disabled =
    loading || (isRegister && (!consentsAccepted || !inviteToken));

  async function onClick() {
    if (disabled) return;
    setLoading(true);
    try {
      if (isRegister) {
        if (!inviteToken) {
          toast.error(
            "Per registrarti con Google serve un invito valido. Usa il link ricevuto dopo il pagamento.",
          );
          setLoading(false);
          return;
        }
        const prep = await fetch("/api/auth/google-signup/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            acceptTerms: true,
            acceptHealthDataProcessing: true,
            inviteToken,
          }),
        });
        if (!prep.ok) {
          const body = await prep.json().catch(() => ({}));
          toast.error(
            typeof body.error === "string"
              ? body.error
              : "Impossibile avviare la registrazione con Google.",
          );
          setLoading(false);
          return;
        }
      }

      const origin = window.location.origin;
      const params = new URLSearchParams();
      params.set("next", redirectTo ?? "/dashboard");
      const callback = `${origin}/auth/callback?${params.toString()}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callback,
          // `select_account` so users with multiple Google accounts can
          // pick — without this Google silently reuses the most-recent
          // session, which is confusing when testing.
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        toast.error(error.message || "Avvio Google fallito.");
        setLoading(false);
        return;
      }
      // On success, Supabase navigates away — keep the spinner up.
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore inatteso.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        "focus-ring inline-flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <GoogleGlyph />
      )}
      <span>
        {isRegister ? "Registrati con Google" : "Continua con Google"}
      </span>
    </button>
  );
}

/** Multi-colour Google "G" mark. Inline SVG so the button works
 *  offline / in email previews / wherever <img> would be sketchy. */
function GoogleGlyph() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.094 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
