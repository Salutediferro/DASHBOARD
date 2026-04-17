"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Loader2,
  ShieldCheck,
  ShieldOff,
  Smartphone,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type FactorRow = {
  id: string;
  friendlyName: string | null;
  status: "verified" | "unverified";
  createdAt: string;
};

/**
 * TOTP 2FA management for the current user.
 *
 * Flow
 * ----
 *   1. List factors via supabase.auth.mfa.listFactors().
 *   2. "Attiva 2FA" → mfa.enroll({ factorType: 'totp' }) → QR + secret.
 *   3. User scans the QR, enters the 6-digit code.
 *   4. mfa.challenge({ factorId }) + mfa.verify(...) marks the factor
 *      verified. From the next login the user will be challenged.
 *   5. Any verified factor can be removed via mfa.unenroll({ factorId }).
 *
 * Supabase does not expose recovery codes through the public SDK; we
 * leave that as a known limitation (lockout fallback is a password
 * reset via email, which proves control of the email).
 */
export function SecuritySettings() {
  const supabase = React.useMemo(() => createClient(), []);
  const [factors, setFactors] = React.useState<FactorRow[] | null>(null);
  const [enrolling, setEnrolling] = React.useState<null | {
    factorId: string;
    qr: string;
    secret: string;
  }>(null);
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const reload = React.useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(
      (data?.totp ?? []).map((f) => ({
        id: f.id,
        friendlyName: f.friendly_name ?? null,
        status: f.status,
        createdAt: f.created_at,
      })),
    );
  }, [supabase]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function startEnroll() {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `TOTP-${new Date().toISOString().slice(0, 10)}`,
    });
    setBusy(false);
    if (error || !data) {
      toast.error("Impossibile iniziare l'attivazione 2FA", {
        description: error?.message,
      });
      return;
    }
    setEnrolling({
      factorId: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  async function confirmEnroll() {
    if (!enrolling) return;
    setBusy(true);
    const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({
      factorId: enrolling.factorId,
    });
    if (chalErr || !chal) {
      setBusy(false);
      toast.error("Errore challenge 2FA", { description: chalErr?.message });
      return;
    }
    const { error: verErr } = await supabase.auth.mfa.verify({
      factorId: enrolling.factorId,
      challengeId: chal.id,
      code: code.trim(),
    });
    setBusy(false);
    if (verErr) {
      toast.error("Codice non valido", { description: verErr.message });
      return;
    }
    toast.success("2FA attivata");
    setEnrolling(null);
    setCode("");
    await reload();
  }

  async function cancelEnroll() {
    if (!enrolling) return;
    // Best effort: remove the unverified factor so it doesn't show as
    // dangling in the list.
    await supabase.auth.mfa.unenroll({ factorId: enrolling.factorId });
    setEnrolling(null);
    setCode("");
    await reload();
  }

  async function removeFactor(factorId: string) {
    const ok = confirm(
      "Rimuovere il dispositivo 2FA? Potrai aggiungerne uno nuovo in qualsiasi momento.",
    );
    if (!ok) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      toast.error("Rimozione fallita", { description: error.message });
      return;
    }
    toast.success("Dispositivo rimosso");
    await reload();
  }

  const verified = factors?.filter((f) => f.status === "verified") ?? [];
  const hasVerified = verified.length > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasVerified ? (
              <>
                <ShieldCheck className="text-green-500 h-5 w-5" />
                Autenticazione a due fattori attiva
              </>
            ) : (
              <>
                <ShieldOff className="text-muted-foreground h-5 w-5" />
                Autenticazione a due fattori non attiva
              </>
            )}
          </CardTitle>
          <CardDescription>
            Al login ti verrà chiesto un codice a 6 cifre generato da
            un&apos;app di autenticazione (Google Authenticator, Authy,
            1Password, ecc.). Fortemente consigliata per medici, coach
            e amministratori.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {factors === null ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Caricamento...
            </div>
          ) : verified.length === 0 && !enrolling ? (
            <Button onClick={startEnroll} disabled={busy}>
              <Smartphone className="mr-2 h-4 w-4" />
              {busy ? "..." : "Attiva 2FA"}
            </Button>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {verified.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="text-sm">
                    <p className="font-medium">
                      {f.friendlyName ?? "App di autenticazione"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Aggiunto il{" "}
                      {new Date(f.createdAt).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => removeFactor(f.id)}
                    aria-label="Rimuovi"
                  >
                    <Trash2 className="text-destructive h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {enrolling && (
        <Card>
          <CardHeader>
            <CardTitle>Scansiona il QR</CardTitle>
            <CardDescription>
              Apri la tua app di autenticazione e scansiona il codice.
              Poi inserisci il codice a 6 cifre qui sotto.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {/* Supabase returns `qr_code` as an SVG data URL. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enrolling.qr}
              alt="QR code 2FA"
              className="bg-white h-48 w-48 rounded-md p-2"
            />
            <details className="text-muted-foreground text-xs w-full">
              <summary className="cursor-pointer">
                Non puoi scansionare il QR? Usa la chiave manuale
              </summary>
              <code className="bg-muted mt-2 block rounded-md p-2 font-mono text-xs break-all">
                {enrolling.secret}
              </code>
            </details>
            <div className="grid w-full gap-2">
              <Label htmlFor="enrollCode">Codice di verifica</Label>
              <Input
                id="enrollCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="h-12 text-center text-2xl tracking-[0.3em] tabular-nums"
                autoFocus
              />
            </div>
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                onClick={cancelEnroll}
                disabled={busy}
                className="flex-1"
              >
                Annulla
              </Button>
              <Button
                onClick={confirmEnroll}
                disabled={busy || code.length !== 6}
                className="flex-1"
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Conferma
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
