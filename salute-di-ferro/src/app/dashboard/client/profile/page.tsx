"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Save, Loader2, ShieldAlert, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser, type UserProfile } from "@/lib/hooks/use-user";
import { createClient } from "@/lib/supabase/client";

// ----- helpers -----

function num(s: string): number | null {
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function computeAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const diffMs = Date.now() - dob.getTime();
  const ageDt = new Date(diffMs);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
}

function initialsOf(name: string, email: string) {
  const src = name?.trim() || email;
  const parts = src.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

// ----- Local-only (localStorage) section types -----

type GoalsState = {
  primaryGoal: string;
  fitnessLevel: string;
  weeklyHours: number | null;
};

type HealthState = {
  medicalConditions: string;
  allergies: string;
  medications: string;
  injuries: string;
};

type PreferencesState = {
  unit: "KG" | "LBS";
  language: "it" | "en";
  notifWorkout: boolean;
  notifMeal: boolean;
  notifCheckin: boolean;
  notifCoach: boolean;
};

const DEFAULT_GOALS: GoalsState = {
  primaryGoal: "MASS",
  fitnessLevel: "INTERMEDIATE",
  weeklyHours: null,
};

const DEFAULT_HEALTH: HealthState = {
  medicalConditions: "",
  allergies: "",
  medications: "",
  injuries: "",
};

const DEFAULT_PREFS: PreferencesState = {
  unit: "KG",
  language: "it",
  notifWorkout: true,
  notifMeal: true,
  notifCheckin: true,
  notifCoach: true,
};

function useLocalState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [state, setState] = React.useState<T>(initial);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setState({ ...initial, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  function update(v: T) {
    setState(v);
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  }
  return [state, update];
}

// ----- Component -----

export default function ClientProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const qc = useQueryClient();
  const { profile } = useUser();

  // Anagrafica form state (synced from server profile)
  const [form, setForm] = React.useState<Partial<UserProfile>>({});
  React.useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName,
        lastName: profile.lastName,
        sex: profile.sex,
        birthDate: profile.birthDate,
        heightCm: profile.heightCm,
        phone: profile.phone,
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("Anagrafica salvata");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Errore salvataggio"),
  });

  // Goals, Health, Preferences — localStorage only
  const [goals, setGoals] = useLocalState<GoalsState>(
    `sdf:profile:goals:${profile?.id ?? "anon"}`,
    DEFAULT_GOALS,
  );
  const [health, setHealth] = useLocalState<HealthState>(
    `sdf:profile:health:${profile?.id ?? "anon"}`,
    DEFAULT_HEALTH,
  );
  const [prefs, setPrefs] = useLocalState<PreferencesState>(
    `sdf:profile:prefs:${profile?.id ?? "anon"}`,
    DEFAULT_PREFS,
  );

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const age = computeAge(form.birthDate ?? null);
  const displayName =
    [form.firstName, form.lastName].filter(Boolean).join(" ") ||
    profile?.fullName ||
    "";
  const initials = initialsOf(displayName, profile?.email ?? "");

  return (
    <div className="flex flex-col gap-5 pb-28">
      {/* Header con avatar */}
      <header className="flex items-center gap-4">
        <Avatar className="size-16">
          {profile?.avatarUrl && (
            <AvatarImage src={profile.avatarUrl} alt={displayName} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <h1 className="font-heading truncate text-2xl font-semibold tracking-tight">
            {displayName || "Profilo"}
          </h1>
          <p className="text-muted-foreground truncate text-xs">
            {profile?.email}
          </p>
        </div>
      </header>

      <Tabs defaultValue="personal">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Anagrafica</TabsTrigger>
          <TabsTrigger value="health">Salute</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* =========================
            TAB 1 — ANAGRAFICA (DB)
           ========================= */}
        <TabsContent value="personal" className="mt-4 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserIcon className="h-4 w-4" />
                Dati personali
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    id="firstName"
                    value={form.firstName ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value || null })
                    }
                    placeholder="Mario"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lastName">Cognome</Label>
                  <Input
                    id="lastName"
                    value={form.lastName ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value || null })
                    }
                    placeholder="Rossi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sex">Sesso</Label>
                  <Select
                    value={form.sex ?? ""}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        sex: (v as "MALE" | "FEMALE" | "OTHER") || null,
                      })
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
                    value={form.birthDate ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, birthDate: e.target.value || null })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Età</Label>
                  <div className="bg-muted/40 flex h-10 items-center rounded-md border px-3 tabular-nums">
                    {age != null ? `${age} anni` : "—"}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="heightCm">Altezza (cm)</Label>
                  <Input
                    id="heightCm"
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    value={form.heightCm ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, heightCm: num(e.target.value) })
                    }
                    placeholder="178"
                    className="tabular-nums"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={form.phone ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value || null })
                  }
                  placeholder="+39 333 1234567"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Email</Label>
                <Input value={profile?.email ?? ""} disabled />
                <p className="text-muted-foreground text-xs">
                  L&apos;email non può essere modificata.
                </p>
              </div>

              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className={cn(
                  "bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center justify-center gap-2 rounded-md text-sm font-semibold disabled:opacity-50",
                )}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salva anagrafica
              </button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================
            TAB 2 — SALUTE & OBIETTIVI (local)
           ========================= */}
        <TabsContent value="health" className="mt-4 flex flex-col gap-4">
          <div className="border-amber-400/50 bg-amber-50 dark:bg-amber-950/20 flex gap-2 rounded-md border p-3 text-xs">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Dati salvati solo sul dispositivo
              </p>
              <p className="text-amber-800/80 dark:text-amber-300/80">
                Obiettivi e informazioni sanitarie sono attualmente conservati
                in locale. La sincronizzazione su server (con accesso protetto
                medico/coach) arriverà nel prossimo aggiornamento.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Obiettivi</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Obiettivo principale</Label>
                <Select
                  value={goals.primaryGoal}
                  onValueChange={(v) =>
                    setGoals({ ...goals, primaryGoal: v ?? "MASS" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MASS">Massa muscolare</SelectItem>
                    <SelectItem value="CUTTING">Definizione</SelectItem>
                    <SelectItem value="STRENGTH">Forza</SelectItem>
                    <SelectItem value="HEALTH">Salute generale</SelectItem>
                    <SelectItem value="SPORT">Sport specifico</SelectItem>
                    <SelectItem value="RECOMP">Ricomposizione</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Livello esperienza</Label>
                  <Select
                    value={goals.fitnessLevel}
                    onValueChange={(v) =>
                      setGoals({ ...goals, fitnessLevel: v ?? "INTERMEDIATE" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BEGINNER">Principiante</SelectItem>
                      <SelectItem value="INTERMEDIATE">Intermedio</SelectItem>
                      <SelectItem value="ADVANCED">Avanzato</SelectItem>
                      <SelectItem value="ATHLETE">Atleta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="weekly-hours">Ore attività/sett.</Label>
                  <Input
                    id="weekly-hours"
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    value={goals.weeklyHours ?? ""}
                    onChange={(e) =>
                      setGoals({ ...goals, weeklyHours: num(e.target.value) })
                    }
                    className="tabular-nums"
                    placeholder="4"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setGoals(goals); // trigger write
                  toast.success("Obiettivi aggiornati");
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md text-sm font-medium"
              >
                Salva obiettivi
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Informazioni sanitarie
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="conditions">Patologie / condizioni mediche</Label>
                <Textarea
                  id="conditions"
                  rows={3}
                  value={health.medicalConditions}
                  onChange={(e) =>
                    setHealth({ ...health, medicalConditions: e.target.value })
                  }
                  placeholder="Es. ipertensione, diabete tipo 2..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="allergies">Allergie / intolleranze</Label>
                <Textarea
                  id="allergies"
                  rows={2}
                  value={health.allergies}
                  onChange={(e) =>
                    setHealth({ ...health, allergies: e.target.value })
                  }
                  placeholder="Es. lattosio, arachidi..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="medications">Farmaci in uso</Label>
                <Textarea
                  id="medications"
                  rows={2}
                  value={health.medications}
                  onChange={(e) =>
                    setHealth({ ...health, medications: e.target.value })
                  }
                  placeholder="Es. Ramipril 5mg/die..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="injuries">Infortuni / limitazioni</Label>
                <Textarea
                  id="injuries"
                  rows={2}
                  value={health.injuries}
                  onChange={(e) =>
                    setHealth({ ...health, injuries: e.target.value })
                  }
                  placeholder="Es. ernia L5-S1, frattura polso dx 2022..."
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setHealth(health);
                  toast.success("Dati sanitari aggiornati");
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md text-sm font-medium"
              >
                Salva dati sanitari
              </button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================
            TAB 3 — ACCOUNT
           ========================= */}
        <TabsContent value="account" className="mt-4 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preferenze</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Unità di misura</Label>
                  <Select
                    value={prefs.unit}
                    onValueChange={(v) =>
                      setPrefs({
                        ...prefs,
                        unit: (v as "KG" | "LBS") ?? "KG",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KG">Kg / cm</SelectItem>
                      <SelectItem value="LBS">Lbs / in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Lingua</Label>
                  <Select
                    value={prefs.language}
                    onValueChange={(v) =>
                      setPrefs({
                        ...prefs,
                        language: (v as "it" | "en") ?? "it",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="it">Italiano</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Notifiche</Label>
                {[
                  { key: "notifWorkout" as const, label: "Promemoria allenamento" },
                  { key: "notifMeal" as const, label: "Promemoria pasti" },
                  { key: "notifCheckin" as const, label: "Check-in settimanale" },
                  { key: "notifCoach" as const, label: "Messaggi dal coach" },
                ].map((n) => (
                  <label
                    key={n.key}
                    className="border-border flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <span>{n.label}</span>
                    <input
                      type="checkbox"
                      checked={prefs[n.key]}
                      onChange={(e) =>
                        setPrefs({ ...prefs, [n.key]: e.target.checked })
                      }
                      className="accent-primary h-5 w-5"
                    />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Abbonamento</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="border-border rounded-md border p-4">
                <p className="text-muted-foreground text-xs uppercase">
                  Piano corrente
                </p>
                <p className="font-heading text-2xl font-semibold">Premium</p>
                <p className="text-muted-foreground text-sm">
                  €49/mese · coaching completo
                </p>
              </div>
              <button
                type="button"
                onClick={() => toast.info("Billing in arrivo (Stripe)")}
                className="hover:bg-muted inline-flex h-10 items-center justify-center rounded-md border text-sm font-medium"
              >
                Gestisci billing
              </button>
            </CardContent>
          </Card>

          <button
            type="button"
            onClick={logout}
            className="text-destructive hover:bg-destructive/10 inline-flex h-12 items-center justify-center gap-2 rounded-md border text-sm font-medium"
          >
            <LogOut className="h-4 w-4" />
            Esci dall&apos;account
          </button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
