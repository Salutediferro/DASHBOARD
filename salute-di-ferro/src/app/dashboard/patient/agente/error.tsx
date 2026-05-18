"use client";

/**
 * Error boundary del segment /dashboard/patient/agente.
 *
 * Cattura errori sollevati durante render dei Server Components
 * (es. `buildBriefing` che fallisce, Supabase 5xx). Senza questo
 * file il fallback è la error page globale di Next.js (schermo bianco),
 * mentre i pazienti vedrebbero lo skeleton infinito durante Suspense
 * stuck.
 *
 * Tono: ambra "attention", MAI rosso destructive su dati clinici
 * (decisione cliente).
 */

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AgenteFerroError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[agente-ferro] segment error:", error.message, error.digest);
  }, [error]);

  return (
    <main className="container mx-auto max-w-4xl px-4 py-6">
      <Card className="border-amber-500/40 bg-amber-500/10 p-6">
        <h1 className="mb-2 text-xl font-semibold text-foreground">
          L&apos;Agente di Ferro non è raggiungibile in questo momento.
        </h1>
        <p className="mb-4 text-sm text-muted-foreground">
          C&apos;è stato un problema tecnico nel caricare il tuo briefing. Riprova
          fra qualche istante. Se il problema persiste, scrivi al team.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => reset()}>Riprova</Button>
          <Button
            variant="outline"
            render={<Link href="/dashboard/patient">Torna alla dashboard</Link>}
          />
        </div>
      </Card>
    </main>
  );
}
