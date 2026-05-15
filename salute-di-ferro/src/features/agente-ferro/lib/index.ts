/**
 * Agente di Ferro · public exports
 *
 * Modulo AI feature-flagged (rispetto DECISIONI_BETA.md team Leone).
 * Attivazione: NEXT_PUBLIC_ENABLE_AGENTE_FERRO=1
 */

export {
  AI_DISCLAIMER,
  SUGGESTED_QUESTIONS,
  buildAgenteFerroSystemPrompt,
} from "./system-prompt";

export {
  PANELS,
  PRICING,
  FAQ,
  OBJECTIONS,
  COACH_ESCALATION_HINT,
  KNOWLEDGE_BASE_SUMMARY,
  BRAND_LANGUAGE_RULES,
} from "./knowledge-base";

export {
  detectForbiddenContent,
  runDetectorTests,
  DETECTOR_TEST_CASES,
} from "./detector";

export type { DetectorVerdict } from "./detector";

export { buildAgenteFerroTools } from "./tools";

export {
  getMockUserProfile,
  getMockOrders,
  getMockTestResults,
} from "./mock-data";

/**
 * Modello AI in uso · 2026-05-15: routato via Vercel AI Gateway per
 * zero-data-retention + OIDC auth + failover. Override possibile via env
 * `AGENTE_FERRO_MODEL` (es. per upgrade a sonnet quando serve qualità
 * decisioni health, vedi piano sprint).
 *
 * Format: `<provider>/<model>` — AI SDK 6 risolve via gateway.
 * Verifica ID validi: `curl https://ai-gateway.vercel.sh/v1/models`.
 */
export const AGENTE_FERRO_MODEL =
  process.env.AGENTE_FERRO_MODEL || "anthropic/claude-haiku-4.5";

/**
 * Feature flag · rispetta DECISIONI_BETA.md (AI fuori scope beta workout team Leone).
 * In sviluppo locale: 1. In production: solo dopo merge approvato + decisione SDF.
 */
export function isAgenteFerroEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_AGENTE_FERRO === "1";
}
