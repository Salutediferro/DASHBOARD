"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

/**
 * Landing page after a recovery / invite email. The Supabase session
 * has already been established by /auth/callback, so we just collect a
 * new password + confirmation, call `supabase.auth.updateUser` and
 * bounce the user to their role home.
 */
export function SetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setEmail(data.user?.email ?? null);
      setSessionChecked(true);
      if (!data.user) {
        toast.error("Sessione scaduta, richiedi un nuovo link");
        router.replace("/login");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const canSubmit =
    password.length >= 8 && password === confirm && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      toast.error("Impossibile impostare la password", {
        description: error.message,
      });
      return;
    }
    // Now that the user has a real password, bounce to their role home
    // via the generic /dashboard dispatcher (middleware routes by role).
    toast.success("Password impostata");
    router.replace("/dashboard");
    router.refresh();
  }

  if (!sessionChecked) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Imposta la tua password</CardTitle>
        <CardDescription>
          {email ? (
            <>
              Stai attivando l&apos;account per{" "}
              <span className="text-foreground font-medium">{email}</span>
            </>
          ) : (
            "Stai completando l'attivazione del tuo account"
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit} id="set-password-form" className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="password">Nuova password</Label>
            <div className="relative">
              <Input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-11 items-center justify-center"
                aria-label={show ? "Nascondi" : "Mostra"}
                tabIndex={-1}
              >
                {show ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-muted-foreground text-xs">
              Minimo 8 caratteri. Scegli qualcosa che non usi altrove.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm">Conferma password</Label>
            <Input
              id="confirm"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {confirm.length > 0 && password !== confirm && (
              <p className="text-destructive text-xs">
                Le password non coincidono
              </p>
            )}
          </div>

          <div className="bg-primary/5 border-primary/30 text-muted-foreground flex items-start gap-2 rounded-md border p-3 text-xs">
            <ShieldCheck className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Una volta impostata la password ti verrà chiesto di attivare
              l&apos;autenticazione a due fattori (obbligatoria per i
              professionisti). Serve solo un&apos;app come Google
              Authenticator, Authy o 1Password.
            </p>
          </div>
        </form>
      </CardContent>

      <CardFooter>
        <Button
          type="submit"
          form="set-password-form"
          disabled={!canSubmit}
          className="w-full"
          size="lg"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Attiva account
        </Button>
      </CardFooter>
    </Card>
  );
}
