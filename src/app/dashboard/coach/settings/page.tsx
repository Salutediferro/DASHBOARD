"use client";

import * as React from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useUser } from "@/lib/hooks/use-user";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

function SaveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center rounded-md px-4 text-sm font-medium"
    >
      Salva
    </button>
  );
}

export default function CoachSettingsPage() {
  const { profile } = useUser();
  const [fullName, setFullName] = React.useState(profile?.fullName ?? "");
  const [bio, setBio] = React.useState("");
  const [brandName, setBrandName] = React.useState("Salute di Ferro");
  const [brandColor, setBrandColor] = React.useState("#C9A96E");
  const [availability, setAvailability] = React.useState(() =>
    Object.fromEntries(
      DAY_NAMES.map((_, i) => [
        i,
        { start: "08:00", end: "20:00", closed: i === 0 },
      ]),
    ),
  );
  const [notifPrefs, setNotifPrefs] = React.useState({
    newCheckin: true,
    newClient: true,
    payment: true,
    ai: false,
  });

  React.useEffect(() => {
    if (profile?.fullName) setFullName(profile.fullName);
  }, [profile]);

  function save(label: string) {
    return () => toast.success(`${label} salvato`);
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Impostazioni
        </h1>
        <p className="text-muted-foreground text-sm">Gestisci account e brand</p>
      </header>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profilo</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="availability">Disponibilità</TabsTrigger>
          <TabsTrigger value="notifications">Notifiche</TabsTrigger>
          <TabsTrigger value="subscription">Abbonamento</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profilo coach</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
              <SaveButton onClick={save("Profilo")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Branding</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="brandName">Nome brand</Label>
                <Input
                  id="brandName"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Colore primario</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="border-border h-11 w-16 rounded border"
                  />
                  <Input
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Logo</Label>
                <div className="bg-muted/40 border-border flex h-32 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground">
                  Upload logo (placeholder)
                </div>
              </div>
              <SaveButton onClick={save("Branding")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Orari settimanali</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {Object.entries(availability).map(([dow, day]) => (
                <div
                  key={dow}
                  className="border-border flex items-center gap-3 rounded-md border p-2"
                >
                  <span className="w-10 text-xs font-semibold">
                    {DAY_NAMES[Number(dow)]}
                  </span>
                  <label className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={!day.closed}
                      onChange={(e) =>
                        setAvailability({
                          ...availability,
                          [dow]: { ...day, closed: !e.target.checked },
                        })
                      }
                      className="accent-primary"
                    />
                    Aperto
                  </label>
                  <Input
                    type="time"
                    value={day.start}
                    disabled={day.closed}
                    onChange={(e) =>
                      setAvailability({
                        ...availability,
                        [dow]: { ...day, start: e.target.value },
                      })
                    }
                    className="h-9 w-28"
                  />
                  <span className="text-muted-foreground text-xs">—</span>
                  <Input
                    type="time"
                    value={day.end}
                    disabled={day.closed}
                    onChange={(e) =>
                      setAvailability({
                        ...availability,
                        [dow]: { ...day, end: e.target.value },
                      })
                    }
                    className="h-9 w-28"
                  />
                </div>
              ))}
              <SaveButton
                onClick={async () => {
                  const res = await fetch("/api/coach/availability", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(availability),
                  });
                  if (res.ok) toast.success("Disponibilità salvata");
                  else toast.error("Errore");
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preferenze notifiche</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {[
                { key: "newCheckin", label: "Nuovo check-in cliente" },
                { key: "newClient", label: "Nuovo cliente" },
                { key: "payment", label: "Pagamenti e rinnovi" },
                { key: "ai", label: "Report AI settimanali" },
              ].map((n) => (
                <label
                  key={n.key}
                  className="border-border flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <span>{n.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(
                      notifPrefs[n.key as keyof typeof notifPrefs],
                    )}
                    onChange={(e) =>
                      setNotifPrefs({
                        ...notifPrefs,
                        [n.key]: e.target.checked,
                      })
                    }
                    className="accent-primary h-5 w-5"
                  />
                </label>
              ))}
              <SaveButton onClick={save("Notifiche")} />
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
                <p className="text-xs uppercase text-muted-foreground">
                  Piano corrente
                </p>
                <p className="font-heading text-2xl font-semibold">Pro</p>
                <p className="text-muted-foreground text-sm">
                  €49/mese · fino a 50 clienti
                </p>
              </div>
              <button
                type="button"
                onClick={() => toast.info("Billing in arrivo (Stripe)")}
                className="hover:bg-muted inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-medium"
              >
                Gestisci billing
              </button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Funzione multi-coach in arrivo. Contattaci per attivarla sul tuo
                account.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
