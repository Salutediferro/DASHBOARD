/**
 * Public exports · components Agente di Ferro
 *
 * Modulo UI feature-flagged. Vedere `lib/ai/agente-ferro/index.ts` per
 * la logica server-side (system prompt, tools, detector, knowledge base).
 */

export { AgenteFerroChat } from "./AgenteFerroChat";
export { AgenteFerroBanner } from "./AgenteFerroBanner";
export {
  AgenteFerroAvatar,
  AGENTE_FERRO_STATE_LABELS,
  type AgenteFerroAvatarState,
  type AgenteFerroAvatarSize,
} from "./AgenteFerroAvatar";
