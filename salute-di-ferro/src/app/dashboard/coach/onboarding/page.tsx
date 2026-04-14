"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Stepper } from "@/components/onboarding/stepper";
import { useCoachOnboarding } from "@/lib/stores/onboarding";

const STEPS = ["Profilo", "Orari", "Branding", "Scheda", "Inviti"];

const SPECIALIZATIONS = [
  "Bodybuilding",
  "Powerlifting",
  "Functional",
  "Dimagrimento",
  "Sport specifico",
  "Recomposition",
];

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

export default function CoachOnboardingPage() {
  const router = useRouter();
  const { step, data, setStep, update, reset } = useCoachOnboarding();
  const [emailDraft, setEmailDraft] = React.useState("");

  const finishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "COACH", data }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("Onboarding completato");
      reset();
      router.replace("/dashboard/coach");
    },
    onError: () => toast.error("Errore salvataggio"),
  });

  function toggleSpec(s: string) {
    const has = data.specializations.includes(s);
    update({
      specializations: has
        ? data.specializations.filter((x) => x !== s)
        : [...data.specializations, s],
    });
  }

  function next() {
    if (step < STEPS.length) setStep(step + 1);
    else finishMutation.mutate();
  }
  function prev() {
    if (step > 1) setStep(step - 1);
  }

  function addEmail() {
    const v = emailDraft.trim();
    if (!v || data.inviteEmails.includes(v)) return;
    update({ inviteEmails: [...data.inviteEmails, v] });
    setEmailDraft("");
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Benvenuto, Coach
        </h1>
        <p className="text-muted-foreground text-sm">
          Completa il setup iniziale per iniziare
        </p>
      </header>

      <Stepper steps={STEPS} current={step} />

      <Card>
        <CardContent className="flex flex-col gap-5 p-6">
          {step === 1 && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  value={data.bio}
                  onChange={(e) => update({ bio: e.target.value })}
                  placeholder="Raccontaci chi sei e il tuo approccio..."
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Specializzazioni</Label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATIONS.map((s) => {
                    const active = data.specializations.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSpec(s)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium",
                          active
                            ? "bg-primary text-primary-foreground border-transparent"
                            : "hover:bg-muted",
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="years">Anni di esperienza</Label>
                <Input
                  id="years"
                  type="number"
                  min={0}
                  max={50}
                  value={data.yearsExperience}
                  onChange={(e) =>
                    update({ yearsExperience: Number(e.target.value) })
                  }
                />
              </div>
            </>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <Label>Disponibilità settimanale</Label>
              {Object.entries(data.availability).map(([dow, day]) => (
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
                        update({
                          availability: {
                            ...data.availability,
                            [dow]: { ...day, closed: !e.target.checked },
                          },
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
                      update({
                        availability: {
                          ...data.availability,
                          [dow]: { ...day, start: e.target.value },
                        },
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
                      update({
                        availability: {
                          ...data.availability,
                          [dow]: { ...day, end: e.target.value },
                        },
                      })
                    }
                    className="h-9 w-28"
                  />
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="brandName">Nome brand</Label>
                <Input
                  id="brandName"
                  value={data.brandName}
                  onChange={(e) => update({ brandName: e.target.value })}
                  placeholder="Es. Salute di Ferro"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="brandColor">Colore primario</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="brandColor"
                    type="color"
                    value={data.brandColor}
                    onChange={(e) => update({ brandColor: e.target.value })}
                    className="border-border h-12 w-16 rounded border"
                  />
                  <Input
                    value={data.brandColor}
                    onChange={(e) => update({ brandColor: e.target.value })}
                    className="font-mono"
                  />
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Il logo potrà essere caricato dalle impostazioni dopo
                l&apos;onboarding.
              </p>
            </>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-full">
                💪
              </div>
              <h2 className="font-heading text-xl font-semibold">
                Crea la tua prima scheda
              </h2>
              <p className="text-muted-foreground text-sm">
                Puoi creare un template di allenamento ora oppure saltarlo e
                farlo più tardi dal menu &quot;Allenamenti&quot;.
              </p>
              <button
                type="button"
                onClick={() => {
                  update({ createdFirstTemplate: true });
                  setStep(5);
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-md px-4 text-sm font-medium"
              >
                Vai all&apos;editor schede
              </button>
              <button
                type="button"
                onClick={() => setStep(5)}
                className="text-muted-foreground text-xs underline"
              >
                Salta per ora
              </button>
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col gap-3">
              <Label>Invita i tuoi primi clienti via email</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="cliente@email.com"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEmail();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addEmail}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-md px-4 text-sm font-medium"
                >
                  Aggiungi
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.inviteEmails.map((e) => (
                  <Badge
                    key={e}
                    className="bg-primary/10 text-primary gap-1 pr-1"
                  >
                    {e}
                    <button
                      type="button"
                      onClick={() =>
                        update({
                          inviteEmails: data.inviteEmails.filter((x) => x !== e),
                        })
                      }
                      className="hover:bg-primary/20 flex h-4 w-4 items-center justify-center rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                Le email di invito verranno inviate al completamento
                (placeholder).
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={prev}
              disabled={step === 1}
              className="hover:bg-muted inline-flex h-11 items-center gap-1 rounded-md border px-3 text-sm disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" />
              Indietro
            </button>
            <button
              type="button"
              onClick={next}
              disabled={finishMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium"
            >
              {finishMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {step === STEPS.length ? "Completa" : "Avanti"}
              {step < STEPS.length && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
