"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Loader2,
  LogOut,
  Save,
  Trash2,
  Upload,
  User as UserIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import {
  profileFormSchema,
  type ProfileFormInput,
} from "@/lib/validators/profile";

type Props = {
  /** Whether to show the clinical section (patient-only fields). */
  showClinical?: boolean;
  /** Whether to show the public professional section (bio + specialties). */
  showProfessional?: boolean;
  /** Skip the avatar + name + upload header block. Pages that already
   * render `<ProfileHero>` above the form pass this to avoid showing
   * the same identity + avatar twice. */
  hideHeader?: boolean;
};

function initials(name: string, email: string) {
  const src = name?.trim() || email || "";
  return (
    src
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function computeAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const diffMs = Date.now() - dob.getTime();
  const ageDt = new Date(diffMs);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
}

export function ProfileForm({
  showClinical = false,
  showProfessional = false,
  hideHeader = false,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const qc = useQueryClient();
  const { profile, isLoading } = useUser();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      sex: null,
      birthDate: "",
      heightCm: null,
      phone: "",
      taxCode: "",
      emergencyContact: "",
      medicalConditions: "",
      allergies: "",
      medications: "",
      injuries: "",
      targetWeightKg: null,
      bio: "",
      specialties: "",
    },
  });

  // Hydrate the form once the profile fetch resolves.
  React.useEffect(() => {
    if (!profile) return;
    form.reset({
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      sex: profile.sex,
      birthDate: profile.birthDate ?? "",
      heightCm: profile.heightCm,
      phone: profile.phone ?? "",
      taxCode: profile.taxCode ?? "",
      emergencyContact: profile.emergencyContact ?? "",
      medicalConditions: profile.medicalConditions ?? "",
      allergies: profile.allergies ?? "",
      medications: profile.medications ?? "",
      injuries: profile.injuries ?? "",
      targetWeightKg: profile.targetWeightKg ?? null,
      bio: profile.bio ?? "",
      specialties: profile.specialties ?? "",
    });
  }, [profile, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: ProfileFormInput) => {
      // Normalize empty strings to null before sending.
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(values)) {
        payload[k] = v === "" ? null : v;
      }
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "Errore salvataggio",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Profilo salvato");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/me/avatar", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "Upload fallito",
        );
      }
      return res.json() as Promise<{ avatarUrl: string | null }>;
    },
    onSuccess: () => {
      toast.success("Avatar aggiornato");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeAvatarMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/me/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Errore rimozione");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Avatar rimosso");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (isLoading || !profile) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const watched = form.watch();
  const displayName =
    [watched.firstName, watched.lastName].filter(Boolean).join(" ") ||
    profile.fullName ||
    "";
  const age = computeAge(watched.birthDate ?? null);

  return (
    <div className="flex flex-col gap-6 pb-10">
      {!hideHeader && (
      <header className="flex items-center gap-4">
        <Avatar className="size-20">
          {profile.avatarUrl && (
            <AvatarImage src={profile.avatarUrl} alt={displayName} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
            {initials(displayName, profile.email)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="font-heading truncate text-2xl font-semibold tracking-tight">
            {displayName || "Profilo"}
          </h1>
          <p className="text-muted-foreground truncate text-xs">
            {profile.email} · {profile.role}
          </p>
          <div className="mt-2 flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/heic"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) avatarMutation.mutate(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarMutation.isPending}
              className="border-border hover:bg-muted inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium disabled:opacity-50"
            >
              {avatarMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              Carica avatar
            </button>
            {profile.avatarUrl && (
              <button
                type="button"
                onClick={() => removeAvatarMutation.mutate()}
                disabled={removeAvatarMutation.isPending}
                className="text-destructive hover:bg-destructive/10 inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />
                Rimuovi
              </button>
            )}
          </div>
        </div>
      </header>
      )}

      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="h-4 w-4" /> Dati anagrafici
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">Nome</Label>
                <Input id="firstName" {...form.register("firstName")} />
                {form.formState.errors.firstName && (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName">Cognome</Label>
                <Input id="lastName" {...form.register("lastName")} />
                {form.formState.errors.lastName && (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sex">Sesso</Label>
                <Select
                  value={form.watch("sex") ?? ""}
                  onValueChange={(v) =>
                    form.setValue(
                      "sex",
                      (v as "MALE" | "FEMALE" | "OTHER") || null,
                    )
                  }
                >
                  <SelectTrigger id="sex">
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Maschio</SelectItem>
                    <SelectItem value="FEMALE">Femmina</SelectItem>
                    <SelectItem value="OTHER">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Età</Label>
                <div className="bg-muted/40 text-muted-foreground flex h-10 items-center rounded-md border px-3 text-sm tabular-nums">
                  {age != null ? `${age} anni` : "—"}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="heightCm">Altezza (cm)</Label>
                <Input
                  id="heightCm"
                  type="number"
                  step="0.5"
                  inputMode="decimal"
                  className="tabular-nums"
                  {...form.register("heightCm", {
                    setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                  })}
                />
                {form.formState.errors.heightCm && (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.heightCm.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  {...form.register("phone")}
                />
                {form.formState.errors.phone && (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="taxCode">Codice fiscale</Label>
                <Input
                  id="taxCode"
                  {...form.register("taxCode")}
                  className="uppercase"
                />
                {form.formState.errors.taxCode && (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.taxCode.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emergencyContact">Contatto di emergenza</Label>
              <Input
                id="emergencyContact"
                placeholder="Nome e telefono (es. Mario Rossi +39 333 1234567)"
                {...form.register("emergencyContact")}
              />
              {form.formState.errors.emergencyContact && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.emergencyContact.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input value={profile.email} disabled />
              <p className="text-muted-foreground text-xs">
                L&apos;email non può essere modificata.
              </p>
            </div>
          </CardContent>
        </Card>

        {showProfessional && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Profilo pubblico
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                Visibile ai clienti collegati. Aiuta a costruire fiducia.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  placeholder="Chi sei, cosa offri, il tuo approccio..."
                  {...form.register("bio")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="specialties">Specializzazioni</Label>
                <Input
                  id="specialties"
                  placeholder="Es. Powerlifting, Riabilitazione, Nutrizione sportiva"
                  {...form.register("specialties")}
                />
                <p className="text-muted-foreground text-xs">
                  Separa con virgole. Verranno mostrate come tag.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {showClinical && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Informazioni cliniche
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="medicalConditions">
                  Patologie / condizioni
                </Label>
                <Textarea
                  id="medicalConditions"
                  rows={3}
                  placeholder="Es. ipertensione, diabete tipo 2..."
                  {...form.register("medicalConditions")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="allergies">Allergie / intolleranze</Label>
                <Textarea
                  id="allergies"
                  rows={2}
                  placeholder="Es. lattosio, arachidi..."
                  {...form.register("allergies")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="medications">Supplementi in uso</Label>
                <Textarea
                  id="medications"
                  rows={2}
                  placeholder="Es. Ramipril 5mg/die..."
                  {...form.register("medications")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="targetWeightKg">Peso obiettivo (kg)</Label>
                <Input
                  id="targetWeightKg"
                  type="number"
                  step="0.1"
                  placeholder="Es. 72.0"
                  {...form.register("targetWeightKg", {
                    setValueAs: (v) =>
                      v === "" || v == null ? null : Number(v),
                  })}
                />
                <p className="text-muted-foreground text-xs">
                  Opzionale. Sarà mostrato come barra di progresso rispetto
                  al peso più recente.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="injuries">Infortuni / limitazioni</Label>
                <Textarea
                  id="injuries"
                  rows={2}
                  placeholder="Es. ernia L5-S1, frattura polso dx 2022..."
                  {...form.register("injuries")}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-border bg-background/80 py-3 backdrop-blur">
          <button
            type="button"
            onClick={logout}
            className="text-destructive hover:bg-destructive/10 inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium"
          >
            <LogOut className="h-4 w-4" />
            Esci
          </button>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salva profilo
          </button>
        </div>
      </form>
    </div>
  );
}
