"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { AlertTriangle, ArrowLeft, Copy, Loader2, Mail } from "lucide-react";
import { z } from "zod";

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

const formSchema = z.object({
  email: z.string().email("Email non valida"),
  firstName: z.string().trim().min(1, "Nome obbligatorio").max(80),
  lastName: z.string().trim().min(1, "Cognome obbligatorio").max(80),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")
    .nullable()
    .optional()
    .or(z.literal("")),
  role: z.enum(["DOCTOR", "COACH"]),
});

type FormInput = z.infer<typeof formSchema>;

type ProvisionResult = {
  id: string;
  email: string;
  setupEmailStatus?: "sent" | "failed" | "link-only" | "skipped";
  setupLinkFallback?: string | null;
};

export default function AdminCreateUserPage() {
  const router = useRouter();
  const [result, setResult] = React.useState<ProvisionResult | null>(null);
  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      sex: null,
      birthDate: "",
      role: "DOCTOR",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormInput) => {
      const body = {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        sex: values.sex || null,
        birthDate: values.birthDate ? values.birthDate : null,
        role: values.role,
      };
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Creazione utente fallita";
        throw new Error(msg);
      }
      return res.json() as Promise<ProvisionResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      form.reset();
      if (data.setupEmailStatus === "sent") {
        toast.success("Utente creato — email di attivazione inviata");
      } else if (data.setupEmailStatus === "link-only") {
        toast.success("Utente creato — copia il link di attivazione qui sotto");
      } else if (data.setupEmailStatus === "failed") {
        toast.warning(
          "Utente creato ma link di attivazione non generato. Riprova o crea manualmente.",
        );
      } else {
        toast.success("Utente creato");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/admin/users"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Utenti
      </Link>

      {result && (
        <Card className="border-primary/40 bg-primary/5 max-w-2xl">
          <CardContent className="flex flex-col gap-3 p-5 text-sm">
            <div className="flex items-start gap-3">
              <Mail className="text-primary mt-0.5 h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">
                  {result.setupEmailStatus === "sent"
                    ? "Email di attivazione inviata"
                    : result.setupEmailStatus === "link-only"
                      ? "Email non inviata — copia il link manualmente"
                      : "Utente creato"}
                </p>
                <p className="text-muted-foreground text-xs">
                  Destinatario:{" "}
                  <span className="text-foreground font-medium">
                    {result.email}
                  </span>
                </p>
              </div>
            </div>
            {result.setupLinkFallback && (
              <div className="border-border bg-card flex flex-col gap-2 rounded-md border p-3">
                <p className="text-muted-foreground text-xs">
                  Link di attivazione (scade entro 24h):
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate text-xs">
                    {result.setupLinkFallback}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        result.setupLinkFallback ?? "",
                      );
                      toast.success("Link copiato");
                    }}
                    className="hover:bg-muted inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs"
                  >
                    <Copy className="h-3 w-3" />
                    Copia
                  </button>
                </div>
              </div>
            )}
            {result.setupEmailStatus === "failed" && (
              <div className="text-destructive flex items-start gap-2 text-xs">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Il link non è stato generato. Riprova oppure crea l&apos;utente
                  dal pannello Supabase.
                </p>
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => router.replace("/dashboard/admin/users")}
                className="border-border hover:bg-muted inline-flex h-9 items-center rounded-md border px-3 text-xs font-medium"
              >
                Vai alla lista utenti
              </button>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-3 text-xs font-medium"
              >
                Crea un altro
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Nuovo utente professionale</CardTitle>
          <CardDescription>
            Crea un account DOCTOR o COACH. Riceverà un&apos;email con un
            link per impostare la propria password — nessuna credenziale
            passa da te.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="admin-create-user-form"
            onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
            className="flex flex-col gap-4"
          >
            <div className="grid gap-2">
              <Label>Ruolo</Label>
              <Select
                defaultValue="DOCTOR"
                onValueChange={(v) =>
                  form.setValue("role", v as "DOCTOR" | "COACH")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOCTOR">Medico (DOCTOR)</SelectItem>
                  <SelectItem value="COACH">Coach (COACH)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  autoCapitalize="words"
                  autoComplete="off"
                  {...form.register("firstName")}
                />
                {form.formState.errors.firstName && (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Cognome</Label>
                <Input
                  id="lastName"
                  autoCapitalize="words"
                  autoComplete="off"
                  {...form.register("lastName")}
                />
                {form.formState.errors.lastName && (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Sesso</Label>
                <Select
                  onValueChange={(v) =>
                    form.setValue(
                      "sex",
                      (v || null) as "MALE" | "FEMALE" | "OTHER" | null,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">M</SelectItem>
                    <SelectItem value="FEMALE">F</SelectItem>
                    <SelectItem value="OTHER">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="birthDate">Data di nascita</Label>
                <Input
                  id="birthDate"
                  type="date"
                  {...form.register("birthDate")}
                />
                {form.formState.errors.birthDate && (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.birthDate.message}
                  </p>
                )}
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            type="submit"
            form="admin-create-user-form"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Crea utente
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
