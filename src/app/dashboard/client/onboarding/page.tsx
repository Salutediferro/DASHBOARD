"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
import { Stepper } from "@/components/onboarding/stepper";
import { useClientOnboarding } from "@/lib/stores/onboarding";

const STEPS = ["Profilo", "Obiettivi", "Esperienza", "Attrezzatura", "Tutorial"];

const GOALS = [
  { v: "MASS", label: "Massa muscolare", emoji: "💪" },
  { v: "CUTTING", label: "Definizione", emoji: "🔥" },
  { v: "STRENGTH", label: "Forza", emoji: "🏋️" },
  { v: "HEALTH", label: "Salute generale", emoji: "❤️" },
  { v: "SPORT", label: "Sport specifico", emoji: "⚽" },
] as const;

const EQUIPMENT = [
  { v: "GYM", label: "Palestra completa" },
  { v: "HOME_GYM", label: "Home gym" },
  { v: "DUMBBELLS", label: "Solo manubri" },
  { v: "BODYWEIGHT", label: "Corpo libero" },
  { v: "BANDS", label: "Elastici" },
];

const TUTORIAL_SLIDES = [
  {
    title: "Il tuo allenamento sempre con te",
    body: "Tracciamento set per set, timer riposo automatico, placeholder intelligenti dalle sessioni precedenti.",
    emoji: "🏋️",
  },
  {
    title: "Nutrizione su misura",
    body: "Il tuo piano è sempre disponibile. Sostituzioni rapide se manca un alimento.",
    emoji: "🥗",
  },
  {
    title: "AI assistant dedicato",
    body: "Dubbi su tecnica o dieta? Chiedi all'AI 24/7 con il contesto della tua scheda.",
    emoji: "✨",
  },
];

export default function ClientOnboardingPage() {
  const router = useRouter();
  const { step, data, setStep, update, reset } = useClientOnboarding();
  const [slide, setSlide] = React.useState(0);

  const finishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "CLIENT", data }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("Onboarding completato");
      reset();
      router.replace("/dashboard/client");
    },
  });

  function next() {
    if (step < STEPS.length) setStep(step + 1);
    else finishMutation.mutate();
  }
  function prev() {
    if (step > 1) setStep(step - 1);
  }

  function toggleEquipment(v: string) {
    const has = data.equipment.includes(v);
    update({
      equipment: has
        ? data.equipment.filter((x) => x !== v)
        : [...data.equipment, v],
    });
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 pb-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Benvenuto
        </h1>
        <p className="text-muted-foreground text-sm">Parlaci di te</p>
      </header>

      <Stepper steps={STEPS} current={step} />

      <Card>
        <CardContent className="flex flex-col gap-5 p-6">
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="birthDate">Data di nascita</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={data.birthDate}
                    onChange={(e) => update({ birthDate: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Sesso</Label>
                  <Select
                    value={data.sex}
                    onValueChange={(v) => update({ sex: (v ?? "") as "M" | "F" | "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Maschio</SelectItem>
                      <SelectItem value="F">Femmina</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="height">Altezza (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    inputMode="numeric"
                    value={data.heightCm}
                    onChange={(e) =>
                      update({ heightCm: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="weight">Peso attuale (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={data.weightKg}
                    onChange={(e) =>
                      update({ weightKg: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex flex-col gap-2">
                <Label>Obiettivo principale</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {GOALS.map((g) => (
                    <button
                      key={g.v}
                      type="button"
                      onClick={() => update({ goal: g.v })}
                      className={cn(
                        "flex items-center gap-3 rounded-md border p-3 text-left transition-colors",
                        data.goal === g.v
                          ? "border-primary bg-primary/10"
                          : "hover:bg-muted",
                      )}
                    >
                      <span className="text-2xl">{g.emoji}</span>
                      <span className="text-sm font-medium">{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="target">Peso target (opzionale)</Label>
                <Input
                  id="target"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={data.targetWeightKg ?? ""}
                  onChange={(e) =>
                    update({
                      targetWeightKg: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Livello</Label>
                <Select
                  value={data.experience}
                  onValueChange={(v) =>
                    update({
                      experience: (v ?? "") as ClientExperience,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">Principiante</SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermedio</SelectItem>
                    <SelectItem value="ADVANCED">Avanzato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="years">Anni di allenamento</Label>
                <Input
                  id="years"
                  type="number"
                  min={0}
                  value={data.yearsTraining}
                  onChange={(e) =>
                    update({ yearsTraining: Number(e.target.value) })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="injuries">Infortuni o limitazioni</Label>
                <Textarea
                  id="injuries"
                  rows={3}
                  placeholder="Ernia, spalla, ginocchio..."
                  value={data.injuries}
                  onChange={(e) => update({ injuries: e.target.value })}
                />
              </div>
            </>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-2">
              <Label>Attrezzatura disponibile</Label>
              <div className="grid grid-cols-1 gap-2">
                {EQUIPMENT.map((e) => {
                  const active = data.equipment.includes(e.v);
                  return (
                    <button
                      key={e.v}
                      type="button"
                      onClick={() => toggleEquipment(e.v)}
                      className={cn(
                        "flex items-center justify-between rounded-md border p-3 text-left",
                        active
                          ? "border-primary bg-primary/10"
                          : "hover:bg-muted",
                      )}
                    >
                      <span className="text-sm font-medium">{e.label}</span>
                      <input
                        type="checkbox"
                        readOnly
                        checked={active}
                        className="accent-primary pointer-events-none h-4 w-4"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col gap-4">
              <div className="animate-in fade-in-0 slide-in-from-right-4 duration-500 flex flex-col items-center gap-3 py-6 text-center">
                <div className="text-5xl">{TUTORIAL_SLIDES[slide]!.emoji}</div>
                <h2 className="font-heading text-xl font-semibold">
                  {TUTORIAL_SLIDES[slide]!.title}
                </h2>
                <p className="text-muted-foreground max-w-sm text-sm">
                  {TUTORIAL_SLIDES[slide]!.body}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                {TUTORIAL_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSlide(i)}
                    aria-label={`Slide ${i + 1}`}
                    className={cn(
                      "h-2 w-2 rounded-full transition-all",
                      slide === i ? "bg-primary w-6" : "bg-muted",
                    )}
                  />
                ))}
              </div>
              {slide < TUTORIAL_SLIDES.length - 1 && (
                <button
                  type="button"
                  onClick={() => setSlide(slide + 1)}
                  className="text-primary text-sm hover:underline"
                >
                  Prossima slide →
                </button>
              )}
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
              {step === STEPS.length ? "Inizia" : "Avanti"}
              {step < STEPS.length && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type ClientExperience = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "";
