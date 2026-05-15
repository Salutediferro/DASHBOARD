import "server-only";

import { generateText } from "ai";

import type { BriefingSummary } from "@/lib/data";
import { mockGreeting } from "./mock-greeting";

/**
 * Routing AI · 2026-05-15 security fix MAJOR 2:
 *  - Migrato da direct Anthropic SDK a Vercel AI Gateway (string model ID)
 *    per beneficiare di zero-data-retention (Pro plan) + provider failover
 *    + cost tracking unificato.
 *  - Richiede env `AI_GATEWAY_API_KEY` in prod oppure OIDC token quando
 *    deployato su Vercel. In dev fallback automatico a `mockGreeting`.
 *  - AI SDK 6 risolve la string `anthropic/claude-haiku-4.5` via gateway
 *    senza importare il provider package.
 */

const GREETING_PROMPT = `Sei l'Agente di Ferro · tono di un coach calmo, fermo, italiano · MAI diagnostico, MAI rosso allarme. Una sola frase, max 12 parole, prefisso nome utente. Esempi: 'Marco. Giovedì col Coach. 3 cose nel quaderno.' / 'Sereno, atleta. Continua così.' / 'Marco. Vit D vale due minuti col Coach.' NIENTE punto esclamativo. NIENTE emoji.`;

const WEEKDAYS_IT: Record<number, string> = {
  0: "domenica",
  1: "lunedì",
  2: "martedì",
  3: "mercoledì",
  4: "giovedì",
  5: "venerdì",
  6: "sabato",
};

/**
 * Compact briefing digest that we expose to the LLM. We deliberately
 * strip raw clinical numbers and IDs — the agent only needs labels,
 * counts and persona to phrase a one-line greeting.
 */
function buildPromptPayload(summary: BriefingSummary) {
  const today = new Date();
  const dayName = WEEKDAYS_IT[today.getDay()];

  const todayAppointment = summary.nextAppointment
    ? {
        dayName: WEEKDAYS_IT[summary.nextAppointment.startTime.getDay()],
        professionalRole: summary.nextAppointment.professional.role,
        professionalName: summary.nextAppointment.professional.name,
      }
    : null;

  return {
    firstName: summary.firstName,
    persona: summary.persona,
    dayName,
    hasMission: Boolean(summary.mission?.text),
    openActions: summary.topActions.length,
    attentionCount: summary.attentionCount,
    todayAppointment,
  };
}

/**
 * Returns the one-line greeting rendered above the Agente di Ferro
 * landing page. Cached per user — short TTL so a check-in within the
 * same hour can refresh via `revalidateTag("greeting:${userId}")`.
 *
 * Fallbacks:
 *  - `MOCK_AGENTE=true` → `mockGreeting(summary)` (never touches network)
 *  - No gateway auth (no AI_GATEWAY_API_KEY né OIDC) → same
 *  - LLM error → same (logged via console.warn for observability)
 *
 * Auth gateway: preferito OIDC token Vercel (`VERCEL_OIDC_TOKEN`, auto-iniettato
 * in prod). In dev locale usa `vercel env pull` + `AI_GATEWAY_API_KEY`.
 */
export async function getGreeting(
  userId: string,
  summary: BriefingSummary,
): Promise<string> {

  const mockMode = process.env.MOCK_AGENTE === "true";
  // Solo gateway auth — niente fallback su provider API key diretta,
  // per garantire zero-data-retention e routing centralizzato.
  const hasGatewayAuth =
    Boolean(process.env.AI_GATEWAY_API_KEY) ||
    Boolean(process.env.VERCEL_OIDC_TOKEN);
  if (mockMode || !hasGatewayAuth) {
    return mockGreeting(summary);
  }

  try {
    const { text } = await generateText({
      // AI Gateway routing · zero-data-retention (Pro plan).
      // Model ID verificato via `curl https://ai-gateway.vercel.sh/v1/models`.
      model: "anthropic/claude-haiku-4.5",
      system: GREETING_PROMPT,
      prompt: JSON.stringify(buildPromptPayload(summary)),
      maxOutputTokens: 60,
    });
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : mockGreeting(summary);
  } catch (err) {
    // Greeting is decorative — never block the page on an LLM hiccup.
    console.warn("[agente-ferro] greeting fallback:", err);
    return mockGreeting(summary);
  }
}
