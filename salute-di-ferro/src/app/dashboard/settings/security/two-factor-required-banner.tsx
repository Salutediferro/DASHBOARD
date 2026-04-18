"use client";

import { useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export function TwoFactorRequiredBanner() {
  const params = useSearchParams();
  if (params.get("reason") !== "2fa-required") return null;

  return (
    <div className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-3 rounded-md border p-4">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">Autenticazione a due fattori obbligatoria</p>
        <p className="mt-1 opacity-90">
          Per accedere all&apos;area professionale devi completare la
          configurazione del secondo fattore (TOTP). Scansiona il QR qui
          sotto con un&apos;app di autenticazione (Google Authenticator,
          Authy, 1Password) e inserisci il codice per attivare.
        </p>
      </div>
    </div>
  );
}
