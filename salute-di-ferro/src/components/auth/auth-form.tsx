"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  UserCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validators/auth";

type Props = { variant: "login" | "register" };

type InviteInfo = {
  valid: true;
  professionalName: string;
  professionalRole: "DOCTOR" | "COACH";
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  note: string | null;
  expiresAt: string;
};

export function AuthForm({ variant }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const inviteToken = searchParams.get("invite");
  const supabase = createClient();
  const [loading, setLoading] = React.useState(false);
  const [invite, setInvite] = React.useState<InviteInfo | null>(null);
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [inviteChecking, setInviteChecking] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [capsLockOn, setCapsLockOn] = React.useState(false);

  const isLogin = variant === "login";

  // The dashboard is what every successful login lands on — warm the JS
  // chunk on password focus so the post-submit navigation feels instant.
  const prefetchDashboard = React.useCallback(() => {
    router.prefetch(redirectTo);
  }, [router, redirectTo]);

  function handlePasswordKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  }

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "PATIENT",
      acceptTerms: false,
      acceptHealthDataProcessing: false,
    },
  });

  // Validate the invite token on register page load. On success, pre-fill
  // whatever the inviting professional typed in (email, name) so the
  // patient doesn't retype. On failure, we still allow plain registration
  // but show a warning.
  React.useEffect(() => {
    if (isLogin || !inviteToken) return;
    let cancelled = false;
    setInviteChecking(true);
    fetch(
      `/api/invitations/verify?token=${encodeURIComponent(inviteToken)}`,
    )
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as InviteInfo;
          setInvite(data);
          setInviteError(null);
          if (data.email) registerForm.setValue("email", data.email);
          if (data.firstName)
            registerForm.setValue("firstName", data.firstName);
          if (data.lastName) registerForm.setValue("lastName", data.lastName);
        } else {
          const body = await res.json().catch(() => ({}));
          setInvite(null);
          setInviteError(
            typeof body?.error === "string"
              ? body.error
              : "Invito non valido",
          );
        }
      })
      .catch(() => {
        if (!cancelled)
          setInviteError("Verifica dell'invito non riuscita, riprova.");
      })
      .finally(() => {
        if (!cancelled) setInviteChecking(false);
      });
    return () => {
      cancelled = true;
    };
    // The token is stable per URL — we only want this to run once on mount
    // per token. registerForm is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogin, inviteToken]);

  // MFA step state. When the user has an enrolled TOTP factor, password
  // sign-in lands in `aal1` and we need a second-factor challenge to
  // upgrade to `aal2` before letting them into the dashboard.
  const [mfaStep, setMfaStep] = React.useState<null | {
    factorId: string;
    challengeId: string;
  }>(null);
  const [mfaCode, setMfaCode] = React.useState("");

  async function onLogin(values: LoginInput) {
    setLoading(true);
    // Users on mobile frequently add a stray leading space when tapping
    // an email — trim before hitting Supabase so we don't get a generic
    // "invalid credentials" for what's really a typo.
    const email = values.email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: values.password,
    });
    if (error) {
      setLoading(false);
      toast.error("Accesso fallito", { description: error.message });
      return;
    }

    // Detect whether we need to step up to aal2 (user has MFA enrolled).
    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (
      aalData &&
      aalData.currentLevel === "aal1" &&
      aalData.nextLevel === "aal2"
    ) {
      // Pick the first verified TOTP factor on the user. If none are
      // verified we just proceed with aal1 — login still works, the
      // /dashboard/settings/security page prompts them to finish setup.
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totp = factorsData?.totp?.find((f) => f.status === "verified");
      if (totp) {
        const { data: chal, error: chalErr } =
          await supabase.auth.mfa.challenge({ factorId: totp.id });
        if (chalErr || !chal) {
          setLoading(false);
          toast.error("Impossibile avviare la verifica 2FA", {
            description: chalErr?.message,
          });
          return;
        }
        setMfaStep({ factorId: totp.id, challengeId: chal.id });
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    void fetch("/api/audit/login", { method: "POST" }).catch(() => undefined);
    toast.success("Bentornato!");
    router.replace(redirectTo);
    router.refresh();
  }

  async function onMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaStep) return;
    setLoading(true);
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfaStep.factorId,
      challengeId: mfaStep.challengeId,
      code: mfaCode.trim(),
    });
    setLoading(false);
    if (error) {
      toast.error("Codice non valido", { description: error.message });
      return;
    }
    void fetch("/api/audit/login", { method: "POST" }).catch(() => undefined);
    toast.success("Accesso completato");
    setMfaStep(null);
    setMfaCode("");
    router.replace(redirectTo);
    router.refresh();
  }

  async function onRegister(values: RegisterInput) {
    setLoading(true);

    // Public signup always creates a PATIENT. Server enforces this — we
    // force the role client-side too so the user doesn't see a role selector.
    // If an invite token is present and valid, include it so the server
    // can bind the new patient to the inviting professional.
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        role: "PATIENT",
        acceptTerms: values.acceptTerms,
        acceptHealthDataProcessing: values.acceptHealthDataProcessing,
        ...(invite && inviteToken ? { inviteToken } : {}),
      }),
    });

    if (!res.ok) {
      setLoading(false);
      const body = await res.json().catch(() => ({}));
      toast.error("Registrazione fallita", {
        description:
          typeof body.error === "string" ? body.error : "Riprova più tardi",
      });
      return;
    }

    const body = (await res.json().catch(() => ({}))) as {
      requiresEmailConfirmation?: boolean;
    };

    // PATIENT signup → the auth user was created without email_confirm,
    // so signInWithPassword would fail with "Email not confirmed". Ask
    // Supabase to send the confirmation email and redirect to the
    // "check your inbox" screen. The user finishes the flow by clicking
    // the link in the email, which routes through /auth/callback and
    // establishes the session.
    if (body.requiresEmailConfirmation) {
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email: values.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      setLoading(false);
      if (resendErr) {
        // Non-fatal: the user can resend from the check-email screen.
        toast.error("Account creato ma invio email fallito", {
          description: resendErr.message,
        });
      } else {
        toast.success("Ti abbiamo inviato una email di conferma");
      }
      router.replace(
        `/register/check-email?email=${encodeURIComponent(values.email)}`,
      );
      return;
    }

    // Legacy path (non-PATIENT, e.g. admin-provisioned) — proceed with
    // password sign-in.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setLoading(false);
    if (signInError) {
      toast.error("Login post-registrazione fallito", {
        description: signInError.message,
      });
      return;
    }

    void fetch("/api/audit/login", { method: "POST" }).catch(() => undefined);
    toast.success("Account creato");
    router.replace("/dashboard/patient");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isLogin ? "Accedi" : "Crea il tuo account"}</CardTitle>
        <CardDescription>
          {isLogin
            ? "Entra con la tua email e password"
            : "Inizia il tuo percorso con Salute di Ferro"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {mfaStep && (
          <form onSubmit={onMfaVerify} className="flex flex-col gap-4">
            <div className="bg-primary/5 border-primary/30 rounded-md border p-3 text-sm">
              Inserisci il codice a 6 cifre dall&apos;app di autenticazione
              (es. Google Authenticator, Authy).
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mfaCode">Codice 2FA</Label>
              <Input
                id="mfaCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={mfaCode}
                onChange={(e) =>
                  setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="h-12 text-center text-2xl tracking-[0.3em] tabular-nums"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              disabled={loading || mfaCode.length !== 6}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verifica
            </Button>
            <button
              type="button"
              onClick={() => {
                setMfaStep(null);
                setMfaCode("");
              }}
              className="text-muted-foreground hover:text-primary text-center text-xs"
            >
              Annulla
            </button>
          </form>
        )}
        {!mfaStep && !isLogin && inviteToken && (
          <div className="mb-4">
            {inviteChecking ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifica invito in corso...
              </div>
            ) : invite ? (
              <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                <UserCheck className="text-primary mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">
                    Sei stato invitato da {invite.professionalName}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {invite.professionalRole === "DOCTOR" ? "Medico" : "Coach"}{" "}
                    · Al termine della registrazione sarai assegnato
                    automaticamente.
                  </p>
                </div>
              </div>
            ) : inviteError ? (
              <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <AlertCircle className="text-destructive mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Invito non valido</p>
                  <p className="text-muted-foreground text-xs">
                    {inviteError}. Puoi comunque registrarti come paziente,
                    ma non verrai collegato automaticamente a un
                    professionista.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
        {!mfaStep &&
          (isLogin ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={loginForm.handleSubmit(onLogin)}
            id="login-form"
          >
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                {...loginForm.register("email")}
              />
              {loginForm.formState.errors.email && (
                <p className="text-destructive text-sm">
                  {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-muted-foreground hover:text-primary text-xs"
                >
                  Password dimenticata?
                </Link>
              </div>
              <div className="relative">
                {(() => {
                  const { onBlur, ...rest } = loginForm.register("password");
                  return (
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      onFocus={prefetchDashboard}
                      onKeyUp={handlePasswordKey}
                      onKeyDown={handlePasswordKey}
                      onBlur={(e) => {
                        setCapsLockOn(false);
                        void onBlur(e);
                      }}
                      className="pr-11"
                      {...rest}
                    />
                  );
                })()}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-11 items-center justify-center"
                  aria-label={
                    showPassword ? "Nascondi password" : "Mostra password"
                  }
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {capsLockOn && (
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  BLOC MAIUSC attivo
                </p>
              )}
              {loginForm.formState.errors.password && (
                <p className="text-destructive text-sm">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>
          </form>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={registerForm.handleSubmit(onRegister)}
            id="register-form"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  {...registerForm.register("firstName")}
                />
                {registerForm.formState.errors.firstName && (
                  <p className="text-destructive text-sm">
                    {registerForm.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Cognome</Label>
                <Input
                  id="lastName"
                  {...registerForm.register("lastName")}
                />
                {registerForm.formState.errors.lastName && (
                  <p className="text-destructive text-sm">
                    {registerForm.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...registerForm.register("email")}
              />
              {registerForm.formState.errors.email && (
                <p className="text-destructive text-sm">
                  {registerForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                {(() => {
                  const { onBlur, ...rest } = registerForm.register("password");
                  return (
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      onKeyUp={handlePasswordKey}
                      onKeyDown={handlePasswordKey}
                      onBlur={(e) => {
                        setCapsLockOn(false);
                        void onBlur(e);
                      }}
                      className="pr-11"
                      {...rest}
                    />
                  );
                })()}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-11 items-center justify-center"
                  aria-label={
                    showPassword ? "Nascondi password" : "Mostra password"
                  }
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {capsLockOn && (
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  BLOC MAIUSC attivo
                </p>
              )}
              {registerForm.formState.errors.password && (
                <p className="text-destructive text-sm">
                  {registerForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Conferma password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="pr-11"
                  {...registerForm.register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-11 items-center justify-center"
                  aria-label={
                    showConfirmPassword
                      ? "Nascondi password"
                      : "Mostra password"
                  }
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {registerForm.formState.errors.confirmPassword && (
                <p className="text-destructive text-sm">
                  {registerForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 rounded-md border border-border p-3">
              <label className="flex items-start gap-2 text-xs leading-snug">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 flex-shrink-0 accent-primary"
                  {...registerForm.register("acceptTerms")}
                />
                <span>
                  Ho letto e accetto l&apos;
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="text-primary underline"
                  >
                    informativa privacy
                  </Link>{" "}
                  e i{" "}
                  <Link
                    href="/terms"
                    target="_blank"
                    className="text-primary underline"
                  >
                    termini d&apos;uso
                  </Link>
                  .
                </span>
              </label>
              <label className="flex items-start gap-2 text-xs leading-snug">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 flex-shrink-0 accent-primary"
                  {...registerForm.register("acceptHealthDataProcessing")}
                />
                <span>
                  Presto consenso esplicito al trattamento dei miei{" "}
                  <strong>dati relativi alla salute</strong> (art. 9 GDPR)
                  per le finalità di coordinamento sanitario descritte
                  nell&apos;informativa. Posso revocarlo in qualsiasi
                  momento.
                </span>
              </label>
              {registerForm.formState.errors.acceptTerms && (
                <p className="text-destructive text-xs">
                  {registerForm.formState.errors.acceptTerms.message}
                </p>
              )}
            </div>
          </form>
          ))}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        {!mfaStep && (
          <Button
            type="submit"
            form={isLogin ? "login-form" : "register-form"}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLogin ? "Accedi" : "Crea account"}
          </Button>
        )}
        <p className="text-muted-foreground text-center text-sm">
          {isLogin ? (
            <>
              Non hai un account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Registrati
              </Link>
            </>
          ) : (
            <>
              Hai già un account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Accedi
              </Link>
            </>
          )}
        </p>
      </CardFooter>
    </Card>
  );
}
