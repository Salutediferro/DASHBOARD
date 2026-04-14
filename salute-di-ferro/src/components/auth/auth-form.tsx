"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validators/auth";

type Props = { variant: "login" | "register" };

export function AuthForm({ variant }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const supabase = createClient();
  const [loading, setLoading] = React.useState(false);

  const isLogin = variant === "login";

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "CLIENT",
    },
  });

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
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { fullName: values.fullName, role: values.role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setLoading(false);
      toast.error("Registrazione fallita", { description: error.message });
      return;
    }

    if (data.session) {
      // Sync DB profile (email confirmation disabled).
      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.fullName,
          role: values.role,
        }),
      });
      setLoading(false);
      toast.success("Account creato");
      const target =
        values.role === "COACH" ? "/dashboard/coach" : "/dashboard/client";
      router.replace(target);
      router.refresh();
    } else {
      setLoading(false);
      toast.success("Controlla la tua email per confermare l'account");
    }
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
            <div className="grid gap-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input id="fullName" {...registerForm.register("fullName")} />
              {registerForm.formState.errors.fullName && (
                <p className="text-destructive text-sm">
                  {registerForm.formState.errors.fullName.message}
                </p>
              )}
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
            <div className="grid gap-2">
              <Label>Ruolo</Label>
              <Select
                defaultValue="CLIENT"
                onValueChange={(v) =>
                  registerForm.setValue("role", v as "COACH" | "CLIENT")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT">Cliente</SelectItem>
                  <SelectItem value="COACH">Coach</SelectItem>
                </SelectContent>
              </Select>
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
