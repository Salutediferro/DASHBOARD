"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  UserCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [capsLockOn, setCapsLockOn] = React.useState(false);
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);
  const [shakeKey, setShakeKey] = React.useState(0);
  const [rememberMe, setRememberMe] = React.useState(true);

  const [invite, setInvite] = React.useState<InviteInfo | null>(null);
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [inviteChecking, setInviteChecking] = React.useState(false);

  const isLogin = variant === "login";

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

  const registerPassword = registerForm.watch("password");

  // Validate the invite token on register page load.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogin, inviteToken]);

  // MFA step state
  const [mfaStep, setMfaStep] = React.useState<null | {
    factorId: string;
    challengeId: string;
  }>(null);
  const [mfaCode, setMfaCode] = React.useState("");

  function rejectSubmit(message: string) {
    setErrorBanner(message);
    setShakeKey((k) => k + 1);
  }

  async function onLogin(values: LoginInput) {
    setLoading(true);
    setErrorBanner(null);
    const email = values.email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: values.password,
    });
    if (error) {
      setLoading(false);
      rejectSubmit(error.message || "Credenziali non valide.");
      return;
    }

    // MFA step-up if enrolled
    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (
      aalData &&
      aalData.currentLevel === "aal1" &&
      aalData.nextLevel === "aal2"
    ) {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totp = factorsData?.totp?.find((f) => f.status === "verified");
      if (totp) {
        const { data: chal, error: chalErr } =
          await supabase.auth.mfa.challenge({ factorId: totp.id });
        if (chalErr || !chal) {
          setLoading(false);
          rejectSubmit(
            chalErr?.message ?? "Impossibile avviare la verifica 2FA.",
          );
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
    setErrorBanner(null);
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfaStep.factorId,
      challengeId: mfaStep.challengeId,
      code: mfaCode.trim(),
    });
    setLoading(false);
    if (error) {
      rejectSubmit(error.message || "Codice 2FA non valido.");
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
    setErrorBanner(null);

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
      rejectSubmit(
        typeof body.error === "string"
          ? body.error
          : "Registrazione fallita. Riprova più tardi.",
      );
      return;
    }

    const body = (await res.json().catch(() => ({}))) as {
      requiresEmailConfirmation?: boolean;
    };

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

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password ?? "",
    });
    setLoading(false);
    if (signInError) {
      rejectSubmit(signInError.message || "Login post-registrazione fallito.");
      return;
    }

    void fetch("/api/audit/login", { method: "POST" }).catch(() => undefined);
    toast.success("Account creato");
    router.replace("/dashboard/patient");
    router.refresh();
  }

  // ── MFA step: standalone compact view ────────────────────────
  if (mfaStep) {
    return (
      <div className="flex flex-col gap-5">
        <Header
          title="Verifica 2FA"
          subtitle="Inserisci il codice a 6 cifre dall'app di autenticazione (es. Google Authenticator, Authy)."
        />
        {errorBanner && (
          <ErrorBanner
            key={shakeKey}
            message={errorBanner}
            onClose={() => setErrorBanner(null)}
          />
        )}
        <form
          onSubmit={onMfaVerify}
          className={cn("flex flex-col gap-4", shakeKey > 0 && "shake")}
          key={shakeKey}
        >
          <div className="grid gap-2">
            <Label htmlFor="mfaCode" className="text-xs font-medium">
              Codice
            </Label>
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
              className="focus-ring h-14 text-center text-2xl tracking-[0.3em] tabular-nums"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading || mfaCode.length !== 6}
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
            className="focus-ring rounded text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Annulla
          </button>
        </form>
      </div>
    );
  }

  // ── Main form view ───────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <Header
        title={isLogin ? "Accedi" : "Crea il tuo account"}
        subtitle={
          isLogin
            ? "Bentornato, inserisci le tue credenziali per continuare."
            : "Inizia il tuo percorso con Salute di Ferro."
        }
      />

      {errorBanner && (
        <ErrorBanner
          key={shakeKey}
          message={errorBanner}
          onClose={() => setErrorBanner(null)}
        />
      )}

      {!isLogin && inviteToken && (
        <InviteStatus
          checking={inviteChecking}
          invite={invite}
          error={inviteError}
        />
      )}

      {isLogin ? (
        <form
          key={`login-${shakeKey}`}
          className={cn("flex flex-col gap-4", shakeKey > 0 && "shake")}
          onSubmit={loginForm.handleSubmit(onLogin)}
          id="login-form"
        >
          <LeadingIconField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            icon={Mail}
            error={loginForm.formState.errors.email?.message}
            registerProps={loginForm.register("email")}
          />

          <PasswordField
            id="password"
            label="Password"
            autoComplete="current-password"
            show={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            error={loginForm.formState.errors.password?.message}
            capsLockOn={capsLockOn}
            registerProps={loginForm.register("password")}
            extraLabel={
              <Link
                href="/forgot-password"
                className="focus-ring rounded text-[11px] text-muted-foreground underline-offset-4 hover:text-primary-500 hover:underline"
              >
                Password dimenticata?
              </Link>
            }
            onFocus={prefetchDashboard}
            onKeyEvent={handlePasswordKey}
          />

          {/* Ricordami */}
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <BrandCheckbox
              checked={rememberMe}
              onChange={setRememberMe}
              ariaLabel="Ricordami"
            />
            <span>Ricordami su questo dispositivo</span>
          </label>

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Accedi
          </Button>
        </form>
      ) : (
        <form
          key={`register-${shakeKey}`}
          className={cn("flex flex-col gap-4", shakeKey > 0 && "shake")}
          onSubmit={registerForm.handleSubmit(onRegister)}
          id="register-form"
        >
          <div className="grid grid-cols-2 gap-3">
            <LeadingIconField
              id="firstName"
              label="Nome"
              autoComplete="given-name"
              icon={User}
              error={registerForm.formState.errors.firstName?.message}
              registerProps={registerForm.register("firstName")}
            />
            <LeadingIconField
              id="lastName"
              label="Cognome"
              autoComplete="family-name"
              icon={User}
              error={registerForm.formState.errors.lastName?.message}
              registerProps={registerForm.register("lastName")}
            />
          </div>

          <LeadingIconField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            icon={Mail}
            error={registerForm.formState.errors.email?.message}
            registerProps={registerForm.register("email")}
          />

          <PasswordField
            id="password"
            label="Password"
            autoComplete="new-password"
            show={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            error={registerForm.formState.errors.password?.message}
            capsLockOn={capsLockOn}
            registerProps={registerForm.register("password")}
            onKeyEvent={handlePasswordKey}
          >
            <PasswordStrengthMeter value={registerPassword ?? ""} />
          </PasswordField>

          <PasswordField
            id="confirmPassword"
            label="Conferma password"
            autoComplete="new-password"
            show={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((v) => !v)}
            error={registerForm.formState.errors.confirmPassword?.message}
            registerProps={registerForm.register("confirmPassword")}
          />

          <div className="surface-1 flex flex-col gap-3 rounded-xl p-3">
            <label className="flex items-start gap-2.5 text-xs leading-snug">
              <BrandCheckbox
                checked={!!registerForm.watch("acceptTerms")}
                onChange={(v) => registerForm.setValue("acceptTerms", v)}
                ariaLabel="Accetto privacy e termini"
              />
              <span>
                Ho letto e accetto l&apos;
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-primary-500 underline underline-offset-4 hover:text-primary-500/80"
                >
                  informativa privacy
                </Link>{" "}
                e i{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  className="text-primary-500 underline underline-offset-4 hover:text-primary-500/80"
                >
                  termini d&apos;uso
                </Link>
                .
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-xs leading-snug">
              <BrandCheckbox
                checked={!!registerForm.watch("acceptHealthDataProcessing")}
                onChange={(v) =>
                  registerForm.setValue("acceptHealthDataProcessing", v)
                }
                ariaLabel="Consento al trattamento dei dati sanitari"
              />
              <span>
                Presto consenso esplicito al trattamento dei miei{" "}
                <strong>dati relativi alla salute</strong> (art. 9 GDPR) per le
                finalità di coordinamento sanitario descritte
                nell&apos;informativa. Posso revocarlo in qualsiasi momento.
              </span>
            </label>
            {registerForm.formState.errors.acceptTerms && (
              <p className="text-[11px] text-destructive">
                {registerForm.formState.errors.acceptTerms.message}
              </p>
            )}
          </div>

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crea account
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {isLogin ? (
          <>
            Non hai un account?{" "}
            <Link
              href="/register"
              className="focus-ring rounded text-primary-500 underline-offset-4 hover:underline"
            >
              Registrati
            </Link>
          </>
        ) : (
          <>
            Hai già un account?{" "}
            <Link
              href="/login"
              className="focus-ring rounded text-primary-500 underline-offset-4 hover:underline"
            >
              Accedi
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="flex flex-col gap-1.5">
      <h1 className="text-display text-2xl md:text-3xl">{title}</h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </header>
  );
}

function ErrorBanner({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5"
    >
      <AlertCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
        aria-hidden
      />
      <p className="flex-1 text-sm text-destructive">{message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Chiudi avviso"
        className="focus-ring rounded text-destructive/70 hover:text-destructive"
      >
        <span aria-hidden>×</span>
      </button>
    </div>
  );
}

function InviteStatus({
  checking,
  invite,
  error,
}: {
  checking: boolean;
  invite: InviteInfo | null;
  error: string | null;
}) {
  if (checking) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Verifica invito in corso…
      </div>
    );
  }
  if (invite) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-primary-500/30 bg-primary-500/5 p-3 text-sm">
        <UserCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-primary-500"
          aria-hidden
        />
        <div className="flex-1">
          <p className="font-medium">
            Sei stato invitato da {invite.professionalName}
          </p>
          <p className="text-xs text-muted-foreground">
            {invite.professionalRole === "DOCTOR" ? "Medico" : "Coach"} · Al
            termine della registrazione sarai assegnato automaticamente.
          </p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
        <AlertCircle
          className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
          aria-hidden
        />
        <div className="flex-1">
          <p className="font-medium">Invito non valido</p>
          <p className="text-xs text-muted-foreground">
            {error}. Puoi comunque registrarti come cliente, ma non verrai
            collegato automaticamente a un professionista.
          </p>
        </div>
      </div>
    );
  }
  return null;
}

// react-hook-form register(...) returns a typed `UseFormRegisterReturn<Name>`
// parameterised over the exact literal field path. We accept the erased
// `string` form so sub-components work across both login and register
// forms without paying for a generic — the consumer passes the narrow
// result through spread, the type widens safely.
type FieldRegister = ReturnType<
  ReturnType<typeof useForm<LoginInput & RegisterInput>>["register"]
>;

function LeadingIconField({
  id,
  label,
  icon: Icon,
  type = "text",
  autoComplete,
  inputMode,
  error,
  registerProps,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  error?: string;
  registerProps: FieldRegister;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={id}
          type={type}
          autoComplete={autoComplete}
          inputMode={inputMode}
          autoCapitalize="none"
          spellCheck={false}
          className="focus-ring pl-9"
          aria-invalid={error ? true : undefined}
          {...registerProps}
        />
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  show,
  onToggle,
  error,
  capsLockOn,
  registerProps,
  extraLabel,
  onFocus,
  onKeyEvent,
  children,
}: {
  id: string;
  label: string;
  autoComplete: string;
  show: boolean;
  onToggle: () => void;
  error?: string;
  capsLockOn?: boolean;
  registerProps: FieldRegister;
  extraLabel?: React.ReactNode;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onKeyEvent?: React.KeyboardEventHandler<HTMLInputElement>;
  children?: React.ReactNode;
}) {
  const { onBlur, ...rest } = registerProps;
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs font-medium">
          {label}
        </Label>
        {extraLabel}
      </div>
      <div className="relative">
        <Lock
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          onFocus={onFocus}
          onKeyUp={onKeyEvent}
          onKeyDown={onKeyEvent}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          className="focus-ring pl-9 pr-11"
          {...rest}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Nascondi password" : "Mostra password"}
          tabIndex={-1}
          className="focus-ring absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {capsLockOn && (
        <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <AlertTriangle className="h-3 w-3" aria-hidden />
          BLOC MAIUSC attivo
        </p>
      )}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {children}
    </div>
  );
}

// ── Password strength meter (4 segmenti) ────────────────────────

function computeStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/\d/.test(pw) && /[a-zA-Z]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}

const STRENGTH_LABELS: Record<number, string> = {
  0: "Inserisci una password",
  1: "Debole",
  2: "Media",
  3: "Buona",
  4: "Forte",
};

function PasswordStrengthMeter({ value }: { value: string }) {
  const score = computeStrength(value);
  return (
    <div aria-live="polite" className="mt-0.5 flex flex-col gap-1">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score}
        aria-label={`Robustezza password: ${STRENGTH_LABELS[score]}`}
        className="flex gap-1"
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-200",
              i < score
                ? score >= 3
                  ? "bg-success"
                  : score === 2
                    ? "bg-warning"
                    : "bg-destructive"
                : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {STRENGTH_LABELS[score]}
      </p>
    </div>
  );
}

// ── Brand checkbox ──────────────────────────────────────────────

function BrandCheckbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        "focus-ring relative mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
        checked
          ? "border-primary-500 bg-primary-500"
          : "border-border/60 bg-card hover:border-primary-500/50",
      )}
    >
      {checked && (
        <svg
          viewBox="0 0 16 16"
          className="h-3 w-3 text-primary-foreground"
          aria-hidden
        >
          <path
            d="M3.5 8.5 L6.5 11.5 L12.5 5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
