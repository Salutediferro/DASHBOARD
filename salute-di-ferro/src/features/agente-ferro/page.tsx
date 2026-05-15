/**
 * /dashboard/patient/agente · pagina dashboard proattiva Agente di Ferro
 *
 * Server Component (Cache Components):
 *  1. Auth check via Supabase (redirect /login se anonymous).
 *  2. Role check: PATIENT (+ ADMIN per testing).
 *  3. Feature flag: isAgenteFerroEnabled() → off ⇒ redirect.
 *  4. Briefing proattivo (mission, stats, action plan, body systems).
 *
 * La chat conversazionale vive ora in /dashboard/patient/agente/chat.
 *
 * Streaming:
 *  - Greeting in <Suspense> top-level (saluto contestuale, può richiedere LLM).
 *  - Sezioni dashboard wrappate ognuna in <Suspense> per progressive rendering.
 *
 * NOTE: niente `export const dynamic = "force-dynamic"` — incompatibile con
 * Cache Components. Le sezioni che devono restare dinamiche restano async senza
 * direttiva `use cache`; quelle cacheabili lo dichiarano internamente.
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isAgenteFerroEnabled } from "@/features/agente-ferro/lib";
import { buildBriefing } from "@/features/agente-ferro/lib/briefing";
import { getGreeting } from "@/features/agente-ferro/lib/greeting";
import { AgenteFerroBanner } from "@/features/agente-ferro/components/AgenteFerroBanner";
import { MissionHero } from "@/features/agente-ferro/components/MissionHero";
import { AmbientStatsStrip } from "@/features/agente-ferro/components/AmbientStatsStrip";
import { ActionPlanList } from "@/features/agente-ferro/components/ActionPlanList";
import { BodySystemGrid } from "@/features/agente-ferro/components/BodySystemGrid";
import { AgentCTA } from "@/features/agente-ferro/components/AgentCTA";
import { OnboardingState } from "@/features/agente-ferro/components/OnboardingState";
import {
  GreetingSkeleton,
  MissionSkeleton,
  StatsSkeleton,
  PlanSkeleton,
  SystemGridSkeleton,
} from "@/features/agente-ferro/components/skeletons";

export const metadata = {
  title: "Agente di Ferro — Salute di Ferro",
  description:
    "Il tuo briefing giornaliero, mission, stats e action plan personalizzato.",
};

async function resolveUserId(): Promise<string> {
  const isDevBypass =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_BYPASS === "1";

  if (isDevBypass) {
    return process.env.DEV_MOCK_USER_ID || "mock-mature-attention";
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (!me) redirect("/login");
  if (me.role !== "PATIENT" && me.role !== "ADMIN") redirect("/dashboard");

  return user.id;
}

async function AgenteGreeting({ userId }: { userId: string }) {
  const briefing = await buildBriefing(userId);
  const text = await getGreeting(userId, briefing);
  return (
    <p className="text-lg text-muted-foreground">
      <span className="sr-only">Saluto dell&apos;Agente di Ferro: </span>
      {text}
    </p>
  );
}

async function ProactiveDashboard({ userId }: { userId: string }) {
  const briefing = await buildBriefing(userId);

  if (briefing.persona === "onboarding") {
    return (
      <OnboardingState
        firstName={briefing.firstName}
        completeness={briefing.completeness}
      />
    );
  }

  return (
    <>
      <Suspense fallback={<MissionSkeleton />}>
        <MissionHero mission={briefing.mission} />
      </Suspense>

      <Suspense fallback={<StatsSkeleton />}>
        <AmbientStatsStrip stats={briefing.stats} />
      </Suspense>

      <Suspense fallback={<PlanSkeleton />}>
        <ActionPlanList actions={briefing.topActions} />
      </Suspense>

      {briefing.persona === "mature" && (
        <Suspense fallback={<SystemGridSkeleton />}>
          <BodySystemGrid systems={briefing.bodySystems} />
        </Suspense>
      )}

      <AgentCTA briefing={briefing} />
    </>
  );
}

export default async function AgenteFerroPage() {
  if (!isAgenteFerroEnabled()) {
    redirect("/dashboard/patient");
  }
  const userId = await resolveUserId();

  return (
    <main
      id="main-content"
      className="container mx-auto px-4 py-6 space-y-6 max-w-4xl"
    >
      <AgenteFerroBanner />
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Agente di Ferro</h1>
        <Suspense fallback={<GreetingSkeleton />}>
          <AgenteGreeting userId={userId} />
        </Suspense>
      </header>
      <div className="space-y-6">
        <ProactiveDashboard userId={userId} />
      </div>
    </main>
  );
}
