"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MailCheck, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const RESEND_COOLDOWN_S = 60;

export function CheckEmailContent() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const supabase = createClient();
  const [resending, setResending] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  // Start a cooldown immediately on mount — the register flow just
  // triggered a send, so the user can't usefully resend for ~60s.
  React.useEffect(() => {
    if (email) setCooldown(RESEND_COOLDOWN_S);
  }, [email]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  async function resend() {
    if (!email) {
      toast.error("Email mancante — torna alla registrazione.");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setResending(false);
    if (error) {
      toast.error("Reinvio fallito", { description: error.message });
      return;
    }
    toast.success("Email reinviata");
    setCooldown(RESEND_COOLDOWN_S);
  }

  return (
    <div className="flex flex-col items-start gap-6">
      <div
        aria-hidden
        className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/15 text-primary-500 ring-1 ring-primary-500/30"
      >
        <MailCheck className="h-8 w-8" />
      </div>

      <header className="flex flex-col gap-1.5">
        <h1 className="text-display text-2xl md:text-3xl">
          Controlla la tua email
        </h1>
        <p className="text-sm text-muted-foreground">
          Ti abbiamo inviato un link di conferma
          {email ? (
            <>
              {" "}
              a <span className="font-medium text-foreground">{maskEmail(email)}</span>
            </>
          ) : (
            <> al tuo indirizzo</>
          )}
          . Aprilo per attivare l&apos;account.
        </p>
      </header>

      <ul className="surface-1 flex flex-col gap-1.5 rounded-xl p-4 text-xs text-muted-foreground">
        <li>• Il link può richiedere qualche minuto per arrivare.</li>
        <li>• Controlla anche la cartella spam/promozioni.</li>
        <li>
          • Se hai sbagliato email,{" "}
          <Link
            href="/register"
            className="focus-ring rounded text-primary-500 underline-offset-4 hover:underline"
          >
            torna alla registrazione
          </Link>
          .
        </li>
      </ul>

      <div className="flex w-full flex-col gap-2">
        {email && (
          <a
            href={openInboxHref(email)}
            target="_blank"
            rel="noreferrer"
            className="focus-ring inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Apri la tua mail
          </a>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={resend}
          disabled={resending || !email || cooldown > 0}
          className="w-full"
          aria-busy={resending}
        >
          {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {cooldown > 0
            ? `Rinvia email (${cooldown}s)`
            : "Rinvia email di conferma"}
        </Button>
      </div>

      <Link
        href="/login"
        className="focus-ring rounded text-center text-sm text-muted-foreground underline-offset-4 hover:text-primary-500 hover:underline"
      >
        Torna al login
      </Link>
    </div>
  );
}

// ── helpers ─────────────────────────────────────────────────────

/**
 * Mask the local part of an email, keeping the first character and
 * the domain: `simone@example.com` → `s***@example.com`.
 */
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 1) return email; // nothing meaningful to mask
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const masked = `${local[0]}${"*".repeat(Math.max(3, local.length - 1))}`;
  return `${masked}${domain}`;
}

// Best-effort webmail deep links for the most common providers.
const WEBMAIL: Array<{ match: RegExp; url: string }> = [
  { match: /gmail\.com$/i, url: "https://mail.google.com" },
  { match: /googlemail\.com$/i, url: "https://mail.google.com" },
  { match: /outlook\.com$/i, url: "https://outlook.live.com" },
  { match: /hotmail\.com$/i, url: "https://outlook.live.com" },
  { match: /live\.com$/i, url: "https://outlook.live.com" },
  { match: /icloud\.com$/i, url: "https://www.icloud.com/mail" },
  { match: /me\.com$/i, url: "https://www.icloud.com/mail" },
  { match: /yahoo\.(com|it)$/i, url: "https://mail.yahoo.com" },
  { match: /libero\.it$/i, url: "https://mail.libero.it" },
  { match: /tiscali\.it$/i, url: "https://mail.tiscali.it" },
  { match: /virgilio\.it$/i, url: "https://mail.virgilio.it" },
];

function openInboxHref(email: string): string {
  const domain = email.split("@")[1] ?? "";
  for (const { match, url } of WEBMAIL) {
    if (match.test(domain)) return url;
  }
  // Fallback: mailto protocol opens the user's default mail client.
  return `mailto:${email}`;
}
