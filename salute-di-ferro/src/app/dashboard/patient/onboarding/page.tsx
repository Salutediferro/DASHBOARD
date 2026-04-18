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

const STEPS = ["Profilo", "Info cliniche", "Scopri"];

const TUTORIAL_SLIDES = [
  {
    title: "Biometria & check-in settimanali",
    body: "Registra peso, misure e come ti senti ogni settimana: il medico e il coach vedranno i tuoi progressi.",
    emoji: "📈",
  },
  {
    title: "Referti sempre al sicuro",
    body: "Carica analisi e visite nella cartella clinica. Solo tu decidi quali professionisti possono vederli.",
    emoji: "📄",
  },
  {
    title: "In contatto con il tuo team",
    body: "Prenota appuntamenti e scrivi direttamente al tuo medico o coach dalla chat.",
    emoji: "💬",
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
        body: JSON.stringify({ role: "PATIENT", data }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("Onboarding completato");
      reset();
      router.replace("/dashboard/patient");
    },
    onError: () => toast.error("Errore durante il salvataggio"),
  });

  function next() {
    if (step < STEPS.length) setStep(step + 1);
    else finishMutation.mutate();
  }
  function prev() {
    if (step > 1) setStep(step - 1);
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 pb-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Benvenuto
        </h1>
        <p className="text-muted-foreground text-sm">
          Bastano pochi dati per iniziare.
        </p>
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
              <p className="text-muted-foreground text-xs">
                Queste informazioni aiutano medici e coach a offrirti un
                percorso sicuro. Puoi aggiornarle in qualsiasi momento dal tuo
                profilo.
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="allergies">Allergie</Label>
                <Textarea
                  id="allergies"
                  rows={2}
                  placeholder="Es. penicillina, lattosio, frutta secca..."
                  value={data.allergies}
                  onChange={(e) => update({ allergies: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="conditions">Patologie note</Label>
                <Textarea
                  id="conditions"
                  rows={2}
                  placeholder="Es. ipertensione, diabete, tiroidite..."
                  value={data.medicalConditions}
                  onChange={(e) =>
                    update({ medicalConditions: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emergency">Contatto di emergenza</Label>
                <Input
                  id="emergency"
                  placeholder="Nome e numero"
                  value={data.emergencyContact}
                  onChange={(e) =>
                    update({ emergencyContact: e.target.value })
                  }
                />
              </div>
            </>
          )}

          {step === 3 && (
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
