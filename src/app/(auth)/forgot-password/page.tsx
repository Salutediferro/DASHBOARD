"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validators/auth";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [loading, setLoading] = React.useState(false);
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);
  const [shakeKey, setShakeKey] = React.useState(0);
  const [sent, setSent] = React.useState<string | null>(null);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setLoading(true);
    setErrorBanner(null);
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
    });
    setLoading(false);
    if (error) {
      setErrorBanner(error.message);
      setShakeKey((k) => k + 1);
      return;
    }
    toast.success("Email di reset inviata");
    setSent(values.email);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-5">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-7 w-7" aria-hidden />
        </div>
        <header className="flex flex-col gap-1.5">
          <h1 className="text-display text-2xl md:text-3xl">
            Controlla la tua email
          </h1>
          <p className="text-sm text-muted-foreground">
            Abbiamo inviato un link di reset a{" "}
            <span className="font-medium text-foreground">{sent}</span>.
            Aprilo per scegliere una nuova password.
          </p>
        </header>
        <Link
          href="/login"
          className="focus-ring inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Torna al login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-display text-2xl md:text-3xl">
          Password dimenticata
        </h1>
        <p className="text-sm text-muted-foreground">
          Inserisci la tua email e ti invieremo un link per scegliere una nuova
          password.
        </p>
      </header>

      {errorBanner && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            aria-hidden
          />
          <p className="flex-1 text-sm text-destructive">{errorBanner}</p>
        </div>
      )}

      <form
        id="forgot-form"
        key={shakeKey}
        className={cn("flex flex-col gap-4", shakeKey > 0 && "shake")}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="email" className="text-xs font-medium">
            Email
          </Label>
          <div className="relative">
            <Mail
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={form.formState.errors.email ? true : undefined}
              className="focus-ring pl-9"
              {...form.register("email")}
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-[11px] text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Invia email di reset
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Ti è tornata in mente?{" "}
        <Link
          href="/login"
          className="focus-ring rounded text-primary-500 underline-offset-4 hover:underline"
        >
          Torna al login
        </Link>
      </p>
    </div>
  );
}
