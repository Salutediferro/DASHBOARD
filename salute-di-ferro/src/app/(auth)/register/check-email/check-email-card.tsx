"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MailCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

/**
 * Post-registration screen.
 *
 * The account already exists in Supabase auth (email_confirm=false) and
 * in our Prisma DB. Supabase has sent a confirmation email; clicking the
 * link lands on /auth/callback, which exchanges the code for a session
 * and bounces to the dashboard.
 *
 * The user can re-request the email from this screen (rate-limited by
 * Supabase's default ~60s per address).
 */
export function CheckEmailCard() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const supabase = createClient();
  const [resending, setResending] = React.useState(false);

  async function resend() {
    if (!email) {
      toast.error("Email mancante — torna a /register");
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
  }

  return (
    <Card>
      <CardHeader>
        <div className="bg-primary/10 text-primary mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
          <MailCheck className="h-6 w-6" />
        </div>
        <CardTitle className="text-center">Controlla la tua email</CardTitle>
        <CardDescription className="text-center">
          {email ? (
            <>
              Abbiamo inviato un link di conferma a <strong>{email}</strong>.
            </>
          ) : (
            "Abbiamo inviato un link di conferma al tuo indirizzo email."
          )}{" "}
          Cliccalo per attivare l&apos;account.
        </CardDescription>
      </CardHeader>

      <CardContent className="text-muted-foreground text-sm">
        <ul className="list-disc space-y-1 pl-5">
          <li>Il link può richiedere qualche minuto per arrivare.</li>
          <li>Controlla anche la cartella spam.</li>
          <li>
            Se hai sbagliato email, torna alla{" "}
            <Link href="/register" className="text-primary underline">
              registrazione
            </Link>
            .
          </li>
        </ul>
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={resend}
          disabled={resending || !email}
        >
          {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Reinvia email di conferma
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
