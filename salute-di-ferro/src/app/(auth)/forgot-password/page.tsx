"use client";

import * as React from "react";
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
import { createClient } from "@/lib/supabase/client";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validators/auth";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [loading, setLoading] = React.useState(false);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
    });
    setLoading(false);
    if (error) {
      toast.error("Errore", { description: error.message });
      return;
    }
    toast.success("Email di reset inviata", {
      description: "Controlla la tua casella di posta",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password dimenticata</CardTitle>
        <CardDescription>
          Inserisci la tua email per ricevere il link di reset
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="forgot-form"
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-destructive text-sm">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button
          type="submit"
          form="forgot-form"
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Invia email di reset
        </Button>
        <Link
          href="/login"
          className="text-muted-foreground hover:text-primary text-center text-sm"
        >
          Torna al login
        </Link>
      </CardFooter>
    </Card>
  );
}
