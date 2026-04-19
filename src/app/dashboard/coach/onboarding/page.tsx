"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/onboarding/stepper";
import { CompletionAnimation } from "@/components/onboarding/completion-animation";
import { useCoachOnboarding } from "@/lib/stores/onboarding";

type CoachData = ReturnType<typeof useCoachOnboarding.getState>["data"];

type StepDef = {
  key: string;
  label: string;
  title: string;
  copy: string;
  optional?: boolean;
  canAdvance: (d: CoachData) => boolean;
};

const STEPS: StepDef[] = [
  {
    key: "pro",
    label: "Professionale",
    title: "I tuoi dati professionali",
    copy: "Iniziamo con le informazioni che appariranno sul tuo profilo visibile agli assistiti.",
    canAdvance: (d) => d.fullName.trim().length > 1,
  },
  {
    key: "creds",
    label: "Certificazioni",
    title: "Certificazioni e specializzazioni",
    copy: "Indica le tue abilitazioni e aree di competenza. Puoi aggiungerne altre dal profilo in seguito.",
    optional: true,
    canAdvance: () => true,
  },
  {
    key: "avail",
    label: "Disponibilità",
    title: "Disponibilità settimanale",
    copy: "Una prima bozza degli orari in cui ricevi richieste. Potrai configurare slot precisi dal calendario.",
    canAdvance: () => true,
  },
  {
    key: "bio",
    label: "Bio",
    title: "Bio pubblica",
    copy: "Presentati brevemente: come lavori, cosa ti distingue, con chi ottieni i migliori risultati.",
    optional: true,
    canAdvance: () => true,
  },
  {
    key: "photo",
    label: "Foto",
    title: "Foto profilo",
    copy: "Un volto rassicura. Puoi caricarla ora o aggiornarla più tardi dal tuo profilo.",
    optional: true,
    canAdvance: () => true,
  },
];

const SPECIALIZATIONS = [
  "Bodybuilding",
  "Powerlifting",
  "Functional",
  "Dimagrimento",
  "Sport specifico",
  "Recomposition",
  "Salute posturale",
  "Performance atleti",
];

const CERTIFICATIONS = [
  "CONI",
  "FIPE",
  "FIF",
  "Laurea Scienze Motorie",
  "NSCA CSCS",
  "NASM CPT",
  "ISSA CFT",
];

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

export default function CoachOnboardingPage() {
  const router = useRouter();
  const { step, data, setStep, update, reset } = useCoachOnboarding();
  const [finished, setFinished] = React.useState(false);

  const finish = useMutation({
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
      toast.success("Profilo coach completato");
      setFinished(true);
    },
    onError: () => toast.error("Errore salvataggio"),
  });

  const current = STEPS[step - 1];
  const stepLabels = STEPS.map((s) => s.label);
  const canAdvance = !!current && current.canAdvance(data);

  function next() {
    if (step < STEPS.length) setStep(step + 1);
    else finish.mutate();
  }
  function prev() {
    if (step > 1) setStep(step - 1);
  }
  function skip() {
    if (step < STEPS.length) setStep(step + 1);
  }

  if (finished) {
    return (
      <DoneScreen
        onGoToDashboard={() => {
          reset();
          router.replace("/dashboard/coach");
        }}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl flex-col gap-8 pb-28">
      <header className="flex flex-col gap-2 pt-4">
        <h1 className="text-display text-3xl">Benvenuto, Coach</h1>
        <p className="text-sm text-muted-foreground">
          Pochi passaggi per configurare il tuo profilo professionale.
        </p>
      </header>

      <Stepper steps={stepLabels} current={step} />

      <div className="grid gap-8 lg:grid-cols-[2fr_3fr]">
        <aside className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Passaggio {step}
          </p>
          <h2 className="text-display text-2xl">{current.title}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {current.copy}
          </p>
        </aside>

        <section className="surface-1 rounded-xl p-5">
          {step === 1 && <ProStep data={data} update={update} />}
          {step === 2 && <CredentialsStep data={data} update={update} />}
          {step === 3 && <AvailabilityStep data={data} update={update} />}
          {step === 4 && <BioStep data={data} update={update} />}
          {step === 5 && <PhotoStep data={data} update={update} />}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/90 px-4 py-3 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={prev}
            disabled={step === 1}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Indietro
          </Button>
          <div className="flex items-center gap-2">
            {current.optional && step < STEPS.length && (
              <Button type="button" variant="ghost" onClick={skip}>
                Salta
              </Button>
            )}
            <Button
              type="button"
              onClick={next}
              disabled={!canAdvance || finish.isPending}
              aria-busy={finish.isPending}
            >
              {finish.isPending && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              {step === STEPS.length ? "Completa" : "Avanti"}
              {step < STEPS.length && (
                <ArrowRight className="ml-1.5 h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Steps ──────────────────────────────────────────────────────────

function ProStep({
  data,
  update,
}: {
  data: CoachData;
  update: (p: Partial<CoachData>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Nome e cognome" required>
        <Input
          value={data.fullName}
          onChange={(e) => update({ fullName: e.target.value })}
          placeholder="Luca Prada"
          className="focus-ring"
        />
      </Field>
      <Field label="Titolo / qualifica">
        <Input
          value={data.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Es. Personal Trainer · Strength Coach"
          className="focus-ring"
        />
      </Field>
      <Field label="Anni di esperienza">
        <Input
          type="number"
          min={0}
          max={60}
          value={data.yearsExperience}
          onChange={(e) =>
            update({ yearsExperience: Number(e.target.value) })
          }
          className="focus-ring"
        />
      </Field>
    </div>
  );
}

function CredentialsStep({
  data,
  update,
}: {
  data: CoachData;
  update: (p: Partial<CoachData>) => void;
}) {
  function toggle<T extends string>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  }
  return (
    <div className="flex flex-col gap-5">
      <Field label="Certificazioni">
        <div className="flex flex-wrap gap-1.5">
          {CERTIFICATIONS.map((c) => {
            const active = data.credentials.includes(c);
            return (
              <button
                key={c}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() =>
                  update({ credentials: toggle(data.credentials, c) })
                }
                className={cn(
                  "focus-ring rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary-500/40 bg-primary-500/15 text-primary-500"
                    : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted",
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Specializzazioni">
        <div className="flex flex-wrap gap-1.5">
          {SPECIALIZATIONS.map((s) => {
            const active = data.specializations.includes(s);
            return (
              <button
                key={s}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() =>
                  update({ specializations: toggle(data.specializations, s) })
                }
                className={cn(
                  "focus-ring rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary-500/40 bg-primary-500/15 text-primary-500"
                    : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted",
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}

function AvailabilityStep({
  data,
  update,
}: {
  data: CoachData;
  update: (p: Partial<CoachData>) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {Object.entries(data.availability).map(([dow, day]) => (
        <div
          key={dow}
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-md border border-border/60 p-2",
            !day.closed && "bg-primary-500/5",
          )}
        >
          <span className="w-10 text-xs font-semibold">
            {DAY_NAMES[Number(dow)]}
          </span>
          <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
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
              className="accent-primary-500"
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
            className="focus-ring h-9 w-28"
          />
          <span className="text-xs text-muted-foreground">—</span>
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
            className="focus-ring h-9 w-28"
          />
        </div>
      ))}
    </div>
  );
}

function BioStep({
  data,
  update,
}: {
  data: CoachData;
  update: (p: Partial<CoachData>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Bio pubblica">
        <Textarea
          rows={6}
          value={data.bio}
          onChange={(e) => update({ bio: e.target.value })}
          placeholder="Il tuo approccio in 3-5 frasi. Chi aiuti, come lavori, cosa ti rende diverso."
          className="focus-ring resize-none"
          maxLength={800}
        />
        <span className="text-[11px] text-muted-foreground">
          {data.bio.length}/800
        </span>
      </Field>
      <Field label="Nome brand (opzionale)">
        <Input
          value={data.brandName}
          onChange={(e) => update({ brandName: e.target.value })}
          placeholder="Es. Salute di Ferro"
          className="focus-ring"
        />
      </Field>
    </div>
  );
}

function PhotoStep({
  data,
  update,
}: {
  data: CoachData;
  update: (p: Partial<CoachData>) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="focus-ring group relative inline-flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-primary-500/30 bg-muted/30 transition-colors hover:border-primary-500/60 hover:bg-primary-500/5"
      >
        {data.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.photoUrl}
            alt="Anteprima foto"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex flex-col items-center gap-1 text-muted-foreground">
            <Camera className="h-6 w-6" aria-hidden />
            <span className="text-[11px] uppercase tracking-wide">
              Carica foto
            </span>
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              update({ photoUrl: reader.result });
              toast.success("Foto pronta (salvata alla fine del wizard)");
            }
          };
          reader.readAsDataURL(f);
        }}
      />
      {data.photoUrl && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => update({ photoUrl: null })}
        >
          <X className="mr-1 h-3 w-3" /> Rimuovi
        </Button>
      )}
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Consigliata formato quadrato, almeno 400×400. Puoi sempre cambiarla dal
        profilo.
      </p>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium">
        {label}
        {required && <span className="ml-1 text-primary-500">*</span>}
      </span>
      {children}
    </Label>
  );
}

function DoneScreen({ onGoToDashboard }: { onGoToDashboard: () => void }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col items-center justify-center gap-6 pb-10 text-center">
      <CompletionAnimation />
      <div className="flex flex-col gap-2">
        <h1 className="text-display text-3xl">Tutto pronto</h1>
        <p className="text-sm text-muted-foreground">
          Il tuo profilo coach è configurato. Ora puoi impostare la disponibilità
          dettagliata, invitare i primi assistiti e gestire sessioni.
        </p>
      </div>
      <Button
        type="button"
        size="lg"
        onClick={onGoToDashboard}
        className="min-w-[220px]"
      >
        <CheckCircle2 className="mr-2 h-4 w-4" /> Vai alla dashboard
      </Button>
    </div>
  );
}
