"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, UserCheck, AlertCircle } from "lucide-react";

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

  const isLogin = variant === "login";

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

  async function onLogin(values: LoginInput) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(values);
    setLoading(false);
    if (error) {
      toast.error("Accesso fallito", { description: error.message });
      return;
    }
    toast.success("Bentornato!");
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

    // Auth user created server-side — now sign in to establish the session.
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
        {!isLogin && inviteToken && (
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
        {isLogin ? (
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
                autoComplete="email"
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
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...loginForm.register("password")}
              />
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
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...registerForm.register("password")}
              />
              {registerForm.formState.errors.password && (
                <p className="text-destructive text-sm">
                  {registerForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Conferma password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...registerForm.register("confirmPassword")}
              />
              {registerForm.formState.errors.confirmPassword && (
                <p className="text-destructive text-sm">
                  {registerForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
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
