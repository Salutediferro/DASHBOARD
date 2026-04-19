"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stepper } from "@/components/onboarding/stepper";
import { CompletionAnimation } from "@/components/onboarding/completion-animation";
import { useClientOnboarding } from "@/lib/stores/onboarding";

type StepDef = {
  key: string;
  label: string;
  title: string;
  copy: string;
  optional?: boolean;
  /** Returns true when the user can advance. */
  canAdvance: (d: ClientData) => boolean;
};

type ClientData = ReturnType<typeof useClientOnboarding.getState>["data"];

const STEPS: StepDef[] = [
  {
    key: "personal",
    label: "Anagrafica",
    title: "Iniziamo dai tuoi dati",
    copy: "Ci servono solo le basi per personalizzare il tuo percorso. Potrai modificare tutto dal profilo in qualsiasi momento.",
    canAdvance: (d) => d.fullName.trim().length > 1 && !!d.birthDate && !!d.sex,
  },
  {
    key: "measures",
    label: "Misure",
    title: "Le tue misure attuali",
    copy: "Altezza, peso e circonferenza vita ci danno il punto di partenza. Registrerai misurazioni più dettagliate nel tempo.",
    canAdvance: (d) => d.heightCm > 0 && d.weightKg > 0,
  },
  {
    key: "goals",
    label: "Obiettivi",
    title: "Cosa vuoi raggiungere",
    copy: "Definire un obiettivo aiuta te e il tuo team a misurare i progressi. Nessuna scelta è definitiva.",
    optional: true,
    canAdvance: () => true,
  },
  {
    key: "health",
    label: "Salute",
    title: "Stato di salute",
    copy: "Allergie, patologie e farmaci attivi sono importanti per medico e coach. Solo i professionisti collegati potranno vederli.",
    optional: true,
    canAdvance: () => true,
  },
  {
    key: "consents",
    label: "Consensi",
    title: "Privacy e consensi",
    copy: "Ultimo passo: il consenso al trattamento dei dati sanitari (GDPR Art. 9). Puoi revocarlo in qualsiasi momento.",
    canAdvance: (d) => d.consentDataProcessing,
  },
];

const PRIMARY_GOALS = [
  { value: "weight-loss", label: "Perdere peso" },
  { value: "muscle-gain", label: "Aumentare massa muscolare" },
  { value: "performance", label: "Migliorare performance sportiva" },
  { value: "health", label: "Rimettermi in salute" },
  { value: "habits", label: "Creare abitudini sane" },
  { value: "other", label: "Altro" },
];

export default function PatientOnboardingPage() {
  const router = useRouter();
  const { step, data, setStep, update, reset } = useClientOnboarding();
  const [finished, setFinished] = React.useState(false);

  const finish = useMutation({
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
      toast.success("Profilo completato");
      setFinished(true);
    },
    onError: () => toast.error("Errore durante il salvataggio"),
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
    return <DoneScreen role="PATIENT" onGoToDashboard={() => { reset(); router.replace("/dashboard/patient"); }} />;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl flex-col gap-8 pb-28">
      <header className="flex flex-col gap-2 pt-4">
        <h1 className="text-display text-3xl">Benvenuto</h1>
        <p className="text-sm text-muted-foreground">
          Configurazione iniziale del tuo spazio personale.
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
        <section
          className="surface-1 rounded-xl p-5"
          aria-labelledby="step-form"
        >
          <h3 id="step-form" className="sr-only">
            Campi del passaggio
          </h3>
          {step === 1 && <PersonalStep data={data} update={update} />}
          {step === 2 && <MeasuresStep data={data} update={update} />}
          {step === 3 && <GoalsStep data={data} update={update} />}
          {step === 4 && <HealthStep data={data} update={update} />}
          {step === 5 && <ConsentsStep data={data} update={update} />}
        </section>
      </div>

      <BottomBar
        onPrev={prev}
        onNext={next}
        onSkip={current.optional ? skip : undefined}
        canAdvance={canAdvance}
        disabledPrev={step === 1}
        isLast={step === STEPS.length}
        pending={finish.isPending}
      />
    </div>
  );
}

// ── Bottom bar ──────────────────────────────────────────────────────

function BottomBar({
  onPrev,
  onNext,
  onSkip,
  canAdvance,
  disabledPrev,
  isLast,
  pending,
}: {
  onPrev: () => void;
  onNext: () => void;
  onSkip?: () => void;
  canAdvance: boolean;
  disabledPrev: boolean;
  isLast: boolean;
  pending: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/90 px-4 py-3 backdrop-blur md:px-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          disabled={disabledPrev}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Indietro
        </Button>
        <div className="flex items-center gap-2">
          {onSkip && (
            <Button type="button" variant="ghost" onClick={onSkip}>
              Salta
            </Button>
          )}
          <Button
            type="button"
            onClick={onNext}
            disabled={!canAdvance || pending}
            aria-busy={pending}
          >
            {pending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            {isLast ? "Completa" : "Avanti"}
            {!isLast && <ArrowRight className="ml-1.5 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Steps ──────────────────────────────────────────────────────────

function PersonalStep({
  data,
  update,
}: {
  data: ClientData;
  update: (p: Partial<ClientData>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Nome e cognome" required>
        <Input
          value={data.fullName}
          onChange={(e) => update({ fullName: e.target.value })}
          placeholder="Mario Rossi"
          className="focus-ring"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data di nascita" required>
          <Input
            type="date"
            value={data.birthDate}
            onChange={(e) => update({ birthDate: e.target.value })}
            max={new Date().toISOString().slice(0, 10)}
            className="focus-ring"
          />
        </Field>
        <Field label="Sesso" required>
          <Select
            value={data.sex}
            onValueChange={(v) => update({ sex: (v ?? "") as "M" | "F" | "" })}
          >
            <SelectTrigger className="focus-ring">
              <SelectValue placeholder="Seleziona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Maschio</SelectItem>
              <SelectItem value="F">Femmina</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Telefono (opzionale)">
        <Input
          type="tel"
          value={data.phone}
          onChange={(e) => update({ phone: e.target.value })}
          placeholder="+39 333 1234567"
          className="focus-ring"
        />
      </Field>
    </div>
  );
}

function MeasuresStep({
  data,
  update,
}: {
  data: ClientData;
  update: (p: Partial<ClientData>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Altezza (cm)" required>
        <Input
          type="number"
          inputMode="numeric"
          min={120}
          max={230}
          value={data.heightCm}
          onChange={(e) => update({ heightCm: Number(e.target.value) })}
          className="focus-ring"
        />
      </Field>
      <Field label="Peso attuale (kg)" required>
        <Input
          type="number"
          inputMode="decimal"
          step="0.1"
          min={30}
          max={250}
          value={data.weightKg}
          onChange={(e) => update({ weightKg: Number(e.target.value) })}
          className="focus-ring"
        />
      </Field>
      <Field label="Circonferenza vita (cm, opzionale)">
        <Input
          type="number"
          inputMode="decimal"
          step="0.5"
          min={40}
          max={200}
          value={data.waistCm ?? ""}
          onChange={(e) =>
            update({
              waistCm: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="focus-ring"
        />
      </Field>
    </div>
  );
}

function GoalsStep({
  data,
  update,
}: {
  data: ClientData;
  update: (p: Partial<ClientData>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Obiettivo principale">
        <div className="grid grid-cols-2 gap-2">
          {PRIMARY_GOALS.map((g) => {
            const active = data.primaryGoal === g.value;
            return (
              <button
                key={g.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update({ primaryGoal: g.value })}
                className={cn(
                  "focus-ring rounded-lg border px-3 py-3 text-left text-sm transition-colors",
                  active
                    ? "border-primary-500/40 bg-primary-500/15 text-primary-500"
                    : "border-border/60 bg-muted/30 text-foreground hover:bg-muted",
                )}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Peso target (kg, opzionale)">
        <Input
          type="number"
          inputMode="decimal"
          step="0.5"
          min={30}
          max={250}
          value={data.targetWeightKg ?? ""}
          onChange={(e) =>
            update({
              targetWeightKg: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="focus-ring"
        />
      </Field>
    </div>
  );
}

function HealthStep({
  data,
  update,
}: {
  data: ClientData;
  update: (p: Partial<ClientData>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Patologie note">
        <Textarea
          rows={2}
          value={data.medicalConditions}
          onChange={(e) => update({ medicalConditions: e.target.value })}
          placeholder="Es. ipertensione, diabete, tiroidite…"
          className="focus-ring resize-none"
        />
      </Field>
      <Field label="Allergie">
        <Textarea
          rows={2}
          value={data.allergies}
          onChange={(e) => update({ allergies: e.target.value })}
          placeholder="Es. penicillina, lattosio, frutta secca…"
          className="focus-ring resize-none"
        />
      </Field>
      <Field label="Farmaci attivi">
        <Textarea
          rows={2}
          value={data.medications}
          onChange={(e) => update({ medications: e.target.value })}
          placeholder="Es. tachipirina al bisogno, levotiroxina 50 mcg…"
          className="focus-ring resize-none"
        />
      </Field>
      <Field label="Contatto di emergenza (nome + numero)">
        <Input
          value={data.emergencyContact}
          onChange={(e) => update({ emergencyContact: e.target.value })}
          placeholder="Laura Rossi · +39 333 1234567"
          className="focus-ring"
        />
      </Field>
    </div>
  );
}

function ConsentsStep({
  data,
  update,
}: {
  data: ClientData;
  update: (p: Partial<ClientData>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ConsentRow
        checked={data.consentDataProcessing}
        onChange={(v) => update({ consentDataProcessing: v })}
        label="Consenso al trattamento dei dati sanitari"
        description="Necessario per erogare il servizio. Ai sensi dell'Art. 9 GDPR. Revocabile in qualsiasi momento dal profilo."
        required
      />
      <ConsentRow
        checked={data.consentMarketing}
        onChange={(v) => update({ consentMarketing: v })}
        label="Comunicazioni informative (opzionale)"
        description="Ricevi email con novità su nuove funzionalità ed eventi. Puoi disattivarle da impostazioni → notifiche."
      />
    </div>
  );
}

function ConsentRow({
  checked,
  onChange,
  label,
  description,
  required,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
  required?: boolean;
}) {
  return (
    <label
      className={cn(
        "surface-1 flex cursor-pointer items-start gap-3 rounded-xl p-4 transition-colors hover:bg-muted/30",
        checked && "border border-primary-500/30 bg-primary-500/5",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-primary-500"
      />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">
          {label}
          {required && (
            <span className="ml-1 text-[11px] font-semibold text-primary-500">
              obbligatorio
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
    </label>
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

// ── Done screen ────────────────────────────────────────────────────

function DoneScreen({
  role,
  onGoToDashboard,
}: {
  role: "PATIENT" | "COACH";
  onGoToDashboard: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col items-center justify-center gap-6 pb-10 text-center">
      <CompletionAnimation />
      <div className="flex flex-col gap-2">
        <h1 className="text-display text-3xl">Tutto pronto</h1>
        <p className="text-sm text-muted-foreground">
          {role === "PATIENT"
            ? "Il tuo profilo è configurato. Ora puoi iniziare a monitorare la tua salute e interagire col tuo team."
            : "Il tuo profilo coach è pronto. Da ora puoi accettare nuovi assistiti e gestire sessioni."}
        </p>
      </div>
      <Button
        type="button"
        size="lg"
        onClick={onGoToDashboard}
        className="min-w-[220px]"
      >
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Vai alla dashboard
      </Button>
    </div>
  );
}
