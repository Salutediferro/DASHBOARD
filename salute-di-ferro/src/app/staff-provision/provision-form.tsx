"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";

import { toast } from "@/lib/toast";
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
  password: z.string().min(8, "Minimo 8 caratteri"),
  firstName: z.string().trim().min(1, "Nome obbligatorio").max(80),
  lastName: z.string().trim().min(1, "Cognome obbligatorio").max(80),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]),
  role: z.enum(["DOCTOR", "COACH", "ADMIN"]),
});

type FormInput = z.infer<typeof formSchema>;

type CreatedUser = {
  id: string;
  email: string;
  role: string;
  fullName: string;
};

export function ProvisionForm() {
  const [result, setResult] = React.useState<CreatedUser | null>(null);
  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      sex: "MALE",
      role: "DOCTOR",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormInput) => {
      const res = await fetch("/api/internal/provision-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Creazione utente fallita";
        throw new Error(msg);
      }
      return res.json() as Promise<CreatedUser>;
    },
    onSuccess: (data) => {
      setResult(data);
      form.reset();
      toast.success("Utente creato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-6">
      {result && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-5 text-sm">
            <CheckCircle2 className="text-primary mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Utente creato</p>
              <p className="text-muted-foreground text-xs">
                {result.fullName} ({result.email}) — {result.role}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 items-center rounded-md px-3 text-xs font-medium"
            >
              Crea un altro
            </button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Nuovo account</CardTitle>
          <CardDescription>
            Crea un account con email + password pronto all&apos;uso.
            L&apos;email viene marcata come confermata.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="staff-provision-form"
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="flex flex-col gap-4"
          >
            <div className="grid gap-2">
              <Label>Ruolo</Label>
              <Select
                defaultValue="DOCTOR"
                onValueChange={(v) =>
                  form.setValue("role", v as FormInput["role"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOCTOR">DOCTOR</SelectItem>
                  <SelectItem value="COACH">COACH</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
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

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Sesso</Label>
              <Select
                defaultValue="MALE"
                onValueChange={(v) =>
                  form.setValue("sex", v as FormInput["sex"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">M</SelectItem>
                  <SelectItem value="FEMALE">F</SelectItem>
                  <SelectItem value="OTHER">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            type="submit"
            form="staff-provision-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Crea utente
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
