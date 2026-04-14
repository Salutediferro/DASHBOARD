"use client";

import * as React from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useUser } from "@/lib/hooks/use-user";
import { createClient } from "@/lib/supabase/client";

export default function ClientProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useUser();
  const [fullName, setFullName] = React.useState(profile?.fullName ?? "");
  const [goal, setGoal] = React.useState("MASS");
  const [unit, setUnit] = React.useState<"KG" | "LBS">("KG");
  const [language, setLanguage] = React.useState("it");
  const [notifs, setNotifs] = React.useState({
    workoutReminder: true,
    mealReminder: true,
    checkin: true,
    coach: true,
  });

  React.useEffect(() => {
    if (profile?.fullName) setFullName(profile.fullName);
  }, [profile]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Profilo
        </h1>
        <p className="text-muted-foreground text-sm">Le tue impostazioni</p>
      </header>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profilo</TabsTrigger>
          <TabsTrigger value="goals">Obiettivi</TabsTrigger>
          <TabsTrigger value="preferences">Preferenze</TabsTrigger>
          <TabsTrigger value="subscription">Abbonamento</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dati personali</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Email</Label>
                <Input value={profile?.email ?? ""} disabled />
              </div>
              <button
                type="button"
                onClick={() => toast.success("Profilo salvato")}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-md text-sm font-medium"
              >
                Salva
              </button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Obiettivi</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Obiettivo principale</Label>
                <Select value={goal} onValueChange={(v) => setGoal(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MASS">Massa muscolare</SelectItem>
                    <SelectItem value="CUTTING">Definizione</SelectItem>
                    <SelectItem value="STRENGTH">Forza</SelectItem>
                    <SelectItem value="HEALTH">Salute</SelectItem>
                    <SelectItem value="SPORT">Sport specifico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <button
                type="button"
                onClick={() => toast.success("Obiettivo aggiornato")}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-md text-sm font-medium"
              >
                Salva
              </button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preferenze</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Unità di misura</Label>
                  <Select
                    value={unit}
                    onValueChange={(v) => setUnit((v ?? "KG") as "KG" | "LBS")}
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
                  <Select value={language} onValueChange={(v) => setLanguage(v ?? "it")}>
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
                  { key: "workoutReminder", label: "Promemoria allenamento" },
                  { key: "mealReminder", label: "Promemoria pasti" },
                  { key: "checkin", label: "Check-in settimanale" },
                  { key: "coach", label: "Messaggi dal coach" },
                ].map((n) => (
                  <label
                    key={n.key}
                    className="border-border flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <span>{n.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(notifs[n.key as keyof typeof notifs])}
                      onChange={(e) =>
                        setNotifs({ ...notifs, [n.key]: e.target.checked })
                      }
                      className="accent-primary h-5 w-5"
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => toast.success("Preferenze salvate")}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-md text-sm font-medium"
              >
                Salva
              </button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="mt-4">
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
                className="hover:bg-muted inline-flex h-11 items-center justify-center rounded-md border text-sm font-medium"
              >
                Gestisci billing
              </button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <button
        type="button"
        onClick={logout}
        className="text-destructive hover:bg-destructive/10 mt-4 inline-flex h-12 items-center justify-center gap-2 rounded-md border text-sm font-medium"
      >
        <LogOut className="h-4 w-4" />
        Esci
      </button>
    </div>
  );
}
