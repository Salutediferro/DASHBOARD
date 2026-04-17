"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Loader2, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { compressImage } from "@/lib/utils/compress-image";

type Angle = "front" | "side" | "back";

const ANGLE_LABELS: Record<Angle, string> = {
  front: "Fronte",
  side: "Fianco",
  back: "Schiena",
};

function PhotoUpload({
  angle,
  dataUrl,
  onChange,
}: {
  angle: Angle;
  dataUrl: string | null;
  onChange: (v: string | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      onChange(compressed);
    } catch {
      toast.error("Errore compressione immagine");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs font-semibold uppercase tracking-wider">
        {ANGLE_LABELS[angle]}
      </Label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="bg-muted/40 hover:bg-muted border-border relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md border-2 border-dashed"
      >
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={ANGLE_LABELS[angle]}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="text-muted-foreground flex flex-col items-center gap-1.5 p-2">
            {/* silhouette guide */}
            <svg viewBox="0 0 40 80" className="h-20 w-10 opacity-30">
              <circle cx="20" cy="10" r="7" fill="currentColor" />
              <rect x="12" y="20" width="16" height="28" rx="4" fill="currentColor" />
              <rect x="4" y="22" width="6" height="22" rx="3" fill="currentColor" />
              <rect x="30" y="22" width="6" height="22" rx="3" fill="currentColor" />
              <rect x="13" y="50" width="6" height="26" rx="3" fill="currentColor" />
              <rect x="21" y="50" width="6" height="26" rx="3" fill="currentColor" />
            </svg>
            <Camera className="h-4 w-4" />
            <span className="text-[10px]">Tocca per caricare</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      {dataUrl && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-muted-foreground hover:text-destructive text-xs"
        >
          Rimuovi
        </button>
      )}
    </div>
  );
}

const MEASUREMENT_FIELDS: {
  key: keyof Measurements;
  label: string;
}[] = [
  { key: "waist", label: "Vita" },
  { key: "chest", label: "Petto" },
  { key: "armRight", label: "Braccio DX" },
  { key: "armLeft", label: "Braccio SX" },
  { key: "thighRight", label: "Coscia DX" },
  { key: "thighLeft", label: "Coscia SX" },
  { key: "calf", label: "Polpaccio" },
];

type Measurements = {
  waist: string;
  chest: string;
  armRight: string;
  armLeft: string;
  thighRight: string;
  thighLeft: string;
  calf: string;
};

export default function NewCheckInPage() {
  const router = useRouter();
  const [weight, setWeight] = React.useState("");
  const [measurements, setMeasurements] = React.useState<Measurements>({
    waist: "",
    chest: "",
    armRight: "",
    armLeft: "",
    thighRight: "",
    thighLeft: "",
    calf: "",
  });
  const [front, setFront] = React.useState<string | null>(null);
  const [side, setSide] = React.useState<string | null>(null);
  const [back, setBack] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState("");
  const [rating, setRating] = React.useState(0);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed: Record<string, number | null> = {};
      for (const { key } of MEASUREMENT_FIELDS) {
        const v = measurements[key];
        parsed[key] = v ? Number(v) : null;
      }
      const res = await fetch("/api/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightKg: Number(weight),
          measurements: parsed,
          frontPhotoUrl: front,
          sidePhotoUrl: side,
          backPhotoUrl: back,
          clientNotes: notes || null,
          rating: rating || null,
        }),
      });
      if (!res.ok) throw new Error("Errore invio check-in");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Check-in inviato");
      router.replace("/dashboard/patient");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-5 pb-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Nuovo check-in
        </h1>
        <p className="text-muted-foreground text-sm">
          Inserisci i dati settimanali
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="weight">Peso attuale (kg)</Label>
            <Input
              id="weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-14 text-2xl tabular-nums"
              placeholder="79.5"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase">
              Misure (cm) · opzionali
            </Label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {MEASUREMENT_FIELDS.map((f) => (
                <div key={f.key} className="flex flex-col gap-1">
                  <Label
                    htmlFor={f.key}
                    className="text-muted-foreground text-[10px]"
                  >
                    {f.label}
                  </Label>
                  <Input
                    id={f.key}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={measurements[f.key]}
                    onChange={(e) =>
                      setMeasurements({ ...measurements, [f.key]: e.target.value })
                    }
                    className="h-11 text-lg tabular-nums"
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <Label className="text-xs font-semibold uppercase">Foto</Label>
          <div className="grid grid-cols-3 gap-3">
            <PhotoUpload angle="front" dataUrl={front} onChange={setFront} />
            <PhotoUpload angle="side" dataUrl={side} onChange={setSide} />
            <PhotoUpload angle="back" dataUrl={back} onChange={setBack} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Come ti senti?</Label>
            <Textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Aderenza dieta, energia, problemi..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Rating settimana</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="flex h-12 w-12 items-center justify-center"
                  aria-label={`${n} stelle`}
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-transform hover:scale-110",
                      rating >= n
                        ? "fill-primary text-primary"
                        : "text-muted-foreground",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <button
        type="button"
        disabled={mutation.isPending || !weight}
        onClick={() => mutation.mutate()}
        className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-14 items-center justify-center gap-2 rounded-lg text-base font-semibold disabled:opacity-50"
      >
        {mutation.isPending && <Loader2 className="h-5 w-5 animate-spin" />}
        Invia check-in
      </button>
    </div>
  );
}
