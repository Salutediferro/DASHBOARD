"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type GoogleIdentity = {
  identity_id: string;
  provider: string;
  email?: string | null;
  identity_data?: { email?: string | null } | null;
};

/**
 * "Account Google collegato" card on the security settings page.
 *
 * Lets a user who originally signed up with email + password attach a
 * Google identity to their existing account, so they can sign in with
 * either method from then on. Backed by Supabase's identity-linking
 * API (`linkIdentity` / `unlinkIdentity`) — no Prisma rows involved
 * because identities live entirely on `auth.users`.
 *
 * **Requires** Supabase Auth → Settings → "Manual Linking" toggled on,
 * otherwise `linkIdentity` errors with `manual_linking_disabled`. We
 * surface that error verbatim so the operator can flip the switch.
 *
 * UI states:
 *   1. Loading identities → skeleton.
 *   2. No Google linked yet → "Collega Google" button.
 *   3. Google linked → "Connesso come <email>" + "Scollega".
 *
 * After linking, Supabase redirects back here with `?linked=ok`. The
 * card reads that param on mount and pops a toast.
 */
export function GoogleIdentityCard() {
  const supabase = React.useMemo(() => createClient(), []);
  const [identities, setIdentities] = React.useState<GoogleIdentity[] | null>(
    null,
  );
  const [busy, setBusy] = React.useState(false);

  const reload = React.useCallback(async () => {
    const { data, error } = await supabase.auth.getUserIdentities();
    if (error) {
      setIdentities([]);
      return;
    }
    setIdentities(
      (data?.identities ?? []).map((i) => ({
        identity_id: i.identity_id,
        provider: i.provider,
        email: i.identity_data?.email ?? null,
        identity_data: i.identity_data ?? null,
      })),
    );
  }, [supabase]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  // Pop a toast on `?linked=ok|error` from the OAuth bounce-back and
  // strip the param so a refresh doesn't re-fire it.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const linked = params.get("linked");
    if (!linked) return;
    if (linked === "ok") {
      toast.success("Account Google collegato");
      void reload();
    } else {
      toast.error("Collegamento Google non riuscito. Riprova.");
    }
    params.delete("linked");
    const next = `${window.location.pathname}${
      params.size ? `?${params.toString()}` : ""
    }`;
    window.history.replaceState(null, "", next);
  }, [reload]);

  const google = identities?.find((i) => i.provider === "google") ?? null;
  const passwordIdentity =
    identities?.find((i) => i.provider === "email") ?? null;

  async function link() {
    setBusy(true);
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard/settings/security?linked=ok`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setBusy(false);
      // Most likely cause: Manual Linking is off in the Supabase
      // dashboard. Surface the raw message so the operator knows where
      // to look.
      toast.error(error.message || "Avvio collegamento Google fallito.");
      return;
    }
    // Success: Supabase has already navigated away.
  }

  async function unlink() {
    if (!google) return;
    // Don't let the user delete their last identity — that would lock
    // them out of the account entirely. The password identity counts
    // as a fallback, but if it's missing (e.g. account was created via
    // Google originally), we refuse.
    if (!passwordIdentity) {
      toast.error(
        "Non puoi scollegare Google: è il tuo unico metodo di accesso. Imposta una password prima da 'Password dimenticata?'.",
      );
      return;
    }
    if (
      !confirm(
        "Scollegare Google da questo account? Potrai accedere solo con email e password.",
      )
    ) {
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.unlinkIdentity({
      identity_id: google.identity_id,
      // Supabase types want the full identity row; the SDK only reads
      // identity_id and provider, so this minimal shape is enough.
      provider: google.provider,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    setBusy(false);
    if (error) {
      toast.error(error.message || "Scollegamento fallito.");
      return;
    }
    toast.success("Account Google scollegato");
    void reload();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          Account Google
        </CardTitle>
        <CardDescription>
          Collega un account Google al tuo profilo per poter accedere con un
          clic, senza dover ricordare la password.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {identities === null ? (
          <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        ) : google ? (
          <>
            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-emerald-500"
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">
                Connesso come{" "}
                <span className="font-medium text-foreground">
                  {google.email ?? "Google"}
                </span>
              </span>
            </div>
            <div className="flex justify-end">
              <Button
                variant="destructive"
                size="sm"
                onClick={unlink}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 h-4 w-4" />
                )}
                Scollega Google
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Nessun account Google collegato.
            </p>
            <Button onClick={link} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <GoogleGlyph />
              )}
              <span className="ml-1.5">Collega Google</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
