import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { getCheckIn, getPreviousCheckIn } from "@/lib/mock-checkins";

const schema = z.object({ checkInId: z.string() });

const FALLBACK = `Analisi AI (demo — OPENAI_API_KEY non configurata).

Confronto foto precedente / attuale:
- Composizione corporea: leggero miglioramento generale, vita più asciutta.
- Massa muscolare: spalle e schiena alta più piene, buona simmetria braccia.
- Definizione: addominali più visibili in posizione frontale, separazione quadricipiti accennata.
- Postura: allineamento scapolare migliorato rispetto alla foto di lato.

Suggerimento: mantenere il surplus calorico moderato e prioritizzare il lavoro sui dorsali. Ottimo lavoro, continua così!`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const current = getCheckIn(parsed.data.checkInId);
  if (!current) {
    return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
  }
  const previous = getPreviousCheckIn(parsed.data.checkInId);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "placeholder") {
    return NextResponse.json({ analysis: FALLBACK, provider: "mock" });
  }

  // Attempt real call to OpenAI Vision
  try {
    const photos = [
      current.frontPhotoUrl,
      current.sidePhotoUrl,
      current.backPhotoUrl,
      previous?.frontPhotoUrl,
      previous?.sidePhotoUrl,
      previous?.backPhotoUrl,
    ].filter((u): u is string => !!u);

    const messages = [
      {
        role: "system" as const,
        content:
          "Sei un coach fitness esperto. Analizza le foto di check-in e fornisci un'analisi professionale in italiano, motivante e concisa.",
      },
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: "Analizza queste foto di check-in fitness. Confronta la foto precedente con quella attuale. Evidenzia i cambiamenti visibili in termini di composizione corporea, massa muscolare, definizione, e postura. Rispondi in italiano, in modo professionale e motivante.",
          },
          ...photos.map((url) => ({
            type: "image_url" as const,
            image_url: { url },
          })),
        ],
      },
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ analysis: FALLBACK, provider: "mock-fallback" });
    }
    const json = await res.json();
    const analysis =
      (json?.choices?.[0]?.message?.content as string | undefined) ?? FALLBACK;
    return NextResponse.json({ analysis, provider: "openai" });
  } catch {
    return NextResponse.json({ analysis: FALLBACK, provider: "mock-error" });
  }
}
