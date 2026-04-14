"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
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
  password: z.string().min(8, "Minimo 8 caratteri"),
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

export default function AdminCreateUserPage() {
  const router = useRouter();
  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
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
        password: values.password,
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
      return res.json();
    },
    onSuccess: () => {
      toast.success("Utente creato");
      router.replace("/dashboard/admin/users");
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

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Nuovo utente professionale</CardTitle>
          <CardDescription>
            Crea un account DOCTOR o COACH. La password sarà comunicata
            all&apos;utente separatamente.
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
                <Input id="firstName" {...form.register("firstName")} />
                {form.formState.errors.firstName && (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Cognome</Label>
                <Input id="lastName" {...form.register("lastName")} />
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
                autoComplete="email"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password iniziale</Label>
              <Input
                id="password"
                type="text"
                autoComplete="off"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.password.message}
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
