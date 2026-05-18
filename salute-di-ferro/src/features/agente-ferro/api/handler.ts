/**
 * POST /api/agente-ferro
 *
 * Endpoint chat Agente di Ferro · AI SDK v6 + Anthropic.
 *
 * Flusso:
 *  1. Auth check via Supabase server client (`resolveAuthUser`).
 *  2. Rate limit per-userId via Upstash (10 messaggi/min, evita abuse + cost overrun).
 *  3. Parsing UI messages (formato AI SDK v6 `UIMessage[]`).
 *  4. Detector parole vietate v2 sull'ULTIMO messaggio utente:
 *     - se trigger emergency/disease/clinical-action → safe reply diretta, NO chiamata Anthropic.
 *  5. Build system prompt + tools bound to userId.
 *  6. `streamText` → `toUIMessageStreamResponse()` per streaming-first UX.
 *  7. (TODO post-MVP) Persistenza conversazione su `AiConversation` table.
 *
 * Compliance:
 *  - Audit log su ogni richiesta (utile per UE AI Act + compliance interna).
 *  - Detector blocca pre-modello casi sensibili → zero rischio output errato.
 *  - Disclaimer fisso lato UI (non in stream, è UI overlay).
 *
 * Auth bypass dev (`NEXT_PUBLIC_DEV_BYPASS=1`): la route accetta un finto user
 * coerente con middleware root, e i tool useranno mock-data.ts.
 */

import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveAuthUser } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

import {
  AGENTE_FERRO_MODEL,
  buildAgenteFerroSystemPrompt,
  buildAgenteFerroTools,
  detectForbiddenContent,
  isAgenteFerroChatEnabled,
} from "@/features/agente-ferro/lib";
import { detectAgentReply } from "@/features/agente-ferro/lib/detector";

/**
 * NOTA AUDIT · `AuditLog.action` è uno String free-form in schema Prisma
 * (vedi `prisma/schema.prisma::model AuditLog`) — i valori canonici sono
 * mantenuti in `src/lib/audit-actions.ts`. Aggiunti 2026-05-15:
 *   - AI_MESSAGE  → richiesta processata (mock o reale)
 *   - AI_BLOCKED  → detector ha intercettato pattern vietato
 *
 * Il payload `metadata` NON contiene il testo utente (privacy: può contenere
 * dati clinici sensibili). Logghiamo solo `matchedPattern` quando bloccato,
 * più conteggio messaggi e flag `mock`.
 */
function logAgenteEvent(
  action: "message.sent" | "detector.blocked" | "model.error",
  payload: Record<string, unknown>
) {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log(`[agente-ferro] ${action}`, payload);
  }
}

export const runtime = "nodejs"; // Prisma + Anthropic SDK richiedono Node runtime
export const maxDuration = 60; // streaming può tenere connessione aperta fino a 60s

const RATE_LIMIT_REQUESTS = 10; // 10 messaggi/min per utente
const RATE_LIMIT_WINDOW_S = 60;

// ============================================================
// Helpers
// ============================================================

function isDevBypass(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_BYPASS === "1"
  );
}

/**
 * Estrae il testo dell'ultimo messaggio utente (per detector pre-LLM).
 * In AI SDK v6 i `UIMessage` hanno `parts: [{ type: 'text', text: '...' }, ...]`.
 */
function lastUserText(messages: UIMessage[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return "";
  const parts = (lastUser as { parts?: Array<{ type: string; text?: string }> }).parts ?? [];
  return parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join(" ")
    .trim();
}

/**
 * Mock mode · attivo quando MOCK_AGENTE=true o quando non c'è auth gateway.
 * Bypassa la chiamata modello per dev locale senza consumare token.
 *
 * Auth gateway: preferito OIDC token Vercel (auto-iniettato in prod come
 * `VERCEL_OIDC_TOKEN`). In dev locale: `vercel env pull` + `AI_GATEWAY_API_KEY`.
 */
function isMockMode(): boolean {
  const hasGatewayAuth =
    Boolean(process.env.AI_GATEWAY_API_KEY) ||
    Boolean(process.env.VERCEL_OIDC_TOKEN);
  return process.env.MOCK_AGENTE === "true" || !hasGatewayAuth;
}

/**
 * Genera risposta mock contestuale basata su keyword nell'input utente.
 * Restituisce uno stream UI message v6 con chunk delay per simulare streaming reale.
 */
function mockChatResponse(userText: string, userFirstName: string | null): Response {
  const name = userFirstName ?? "guerriero";
  const lowered = userText.toLowerCase();
  let reply: string;

  if (/prezzo|costa|quanto|euro|€/.test(lowered)) {
    reply = `${name}, modalità mock attiva: Founder Pass €9,99/mese (200 posti limitati), Mensile €24,99/mese (cancellabile), Annual €197/anno. In produzione qui risponderebbe Claude con risposta dinamica + tool calling sui tuoi dati reali.`;
  } else if (/test|esame|analisi|sangue|panell/.test(lowered)) {
    reply = `${name}, mock-mode: Il pannello FERRO CORE include 16 biomarcatori (testosterone, fegato, reni, tiroide, vitamina D, ecc). Add-on disponibili: Androgeno, Cuore, Reni, Fegato, Metabolico, Tiroide, Recovery, Donna. Quando Claude è attivo, leggo i tuoi risultati reali dal DB.`;
  } else if (/ciao|salve|buongiorno|buonasera|hey|hello/.test(lowered)) {
    reply = `Ciao ${name}! Sono l'Agente di Ferro in modalità test (\`MOCK_AGENTE=true\`). Pronto a rispondere come faccio in produzione, ma senza consumare token. Provami: chiedimi prezzi, pannelli, prossimo passo del percorso.`;
  } else if (/aiut|help|cosa fai|chi sei|come funzion/.test(lowered)) {
    reply = `Sono l'Agente di Ferro · ora in modalità mock per dev. In produzione: rispondo su prezzi, pannelli ematici, test di Ferro, prenotazioni Coach, lettura risultati. Tool calling abilitato per leggere il tuo profilo dal DB. Per attivare AI reale: \`vercel env pull\` + \`MOCK_AGENTE=false\`.`;
  } else {
    reply = `${name}, ho ricevuto: "${userText.slice(0, 100)}${userText.length > 100 ? "..." : ""}". Mock mode ON · niente call al modello per ora. Setta auth AI Gateway + \`MOCK_AGENTE=false\` per attivare la chat reale.`;
  }

  const encoder = new TextEncoder();
  const id = crypto.randomUUID();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "start", messageId: id })}\n\n`)
      );

      const words = reply.split(" ");
      for (let i = 0; i < words.length; i++) {
        const delta = (i === 0 ? "" : " ") + words[i];
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "text-delta", id, delta })}\n\n`
          )
        );
        // Delay 30-80ms simula token streaming reale
        await new Promise((r) => setTimeout(r, 30 + Math.random() * 50));
      }

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "finish", messageId: id })}\n\n`)
      );
      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Vercel-AI-UI-Message-Stream": "v1",
    },
  });
}

/**
 * Risposta safe quando il detector blocca prima del modello.
 * Restituisce un UI message stream finto con il messaggio safe (formato AI SDK v6).
 */
function safeReplyResponse(text: string): Response {
  // Pattern v6: stream un singolo `text-delta` + finish
  // ma per semplicità + minor latenza, restituiamo plain text/event-stream compatibile.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const id = crypto.randomUUID();
      const startEvent = `data: ${JSON.stringify({ type: "start", messageId: id })}\n\n`;
      const textEvent = `data: ${JSON.stringify({
        type: "text-delta",
        id,
        delta: text,
      })}\n\n`;
      const finishEvent = `data: ${JSON.stringify({ type: "finish", messageId: id })}\n\n`;
      const doneEvent = `data: [DONE]\n\n`;
      controller.enqueue(encoder.encode(startEvent));
      controller.enqueue(encoder.encode(textEvent));
      controller.enqueue(encoder.encode(finishEvent));
      controller.enqueue(encoder.encode(doneEvent));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Vercel-AI-UI-Message-Stream": "v1",
    },
  });
}

// ============================================================
// POST handler
// ============================================================

export async function POST(request: Request) {
  // ── Feature flag · usa il flag CHAT (più ristretto del flag dashboard).
  // La dashboard può essere ON in prod (`NEXT_PUBLIC_ENABLE_AGENTE_FERRO`)
  // mentre la chat resta gated separatamente (`NEXT_PUBLIC_ENABLE_AGENTE_CHAT`)
  // in attesa di: AI Gateway auth + DPA Anthropic + pen-test prompt injection.
  // Senza questo check, un paziente autenticato potrebbe colpire l'endpoint
  // direttamente anche con la chat OFF nell'UI, consumando token Anthropic.
  if (!isAgenteFerroChatEnabled()) {
    return NextResponse.json(
      { error: "agente-ferro chat disabled" },
      { status: 503 }
    );
  }

  // ── 1. Auth ───────────────────────────────────────────────────
  let userId: string;
  let userFirstName: string | null = null;
  let userRole: string | null = null;

  if (isDevBypass()) {
    userId = "dev-bypass-mock-user";
    userFirstName = "Marco";
    userRole = "PATIENT";
  } else {
    const authUser = await resolveAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    userId = authUser.id;
    // Profilo light per personalizzazione system prompt
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, role: true },
    });
    userFirstName = profile?.firstName ?? null;
    userRole = profile?.role ?? null;

    // ── Role check (MAJOR 1 · security fix 2026-05-15) ───────────────
    // L'agente è destinato a pazienti (PATIENT) e admin (testing).
    // Professionisti, coach, etc. devono passare da altri endpoint.
    if (userRole !== "PATIENT" && userRole !== "ADMIN") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  // ── 2. Rate limit ─────────────────────────────────────────────
  if (!isDevBypass()) {
    try {
      const { ok } = await rateLimit({
        key: `agente-ferro:${userId}`,
        limit: RATE_LIMIT_REQUESTS,
        windowMs: RATE_LIMIT_WINDOW_S * 1000,
      });
      if (!ok) {
        return NextResponse.json(
          { error: "rate_limited", retryAfterSeconds: RATE_LIMIT_WINDOW_S },
          { status: 429 }
        );
      }
    } catch (e) {
      // Fail-closed: se il rate limiter non risponde non possiamo garantire
      // protezione contro abuse / cost overrun → blocchiamo. Preferibile
      // un 503 transitorio rispetto a token Anthropic illimitati.
      console.warn(
        "[agente-ferro] rate limit check error · fail-closed:",
        (e as Error).message
      );
      return NextResponse.json(
        { error: "rate_limit_unavailable", retryAfterSeconds: RATE_LIMIT_WINDOW_S },
        { status: 503 }
      );
    }
  }

  // ── 3. Parse body (AI SDK v6 useChat shape) ───────────────────
  let body: { messages?: UIMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const messages = body.messages ?? [];
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "no_messages" }, { status: 400 });
  }

  // ── 4. Detector parole vietate v2 sull'ultimo messaggio utente ─
  const userText = lastUserText(messages);
  const verdict = detectForbiddenContent(userText);
  if (verdict.block && verdict.safeReply) {
    logAgenteEvent("detector.blocked", {
      userId,
      category: verdict.category,
      matchedPattern: verdict.matchedPattern,
    });
    // Persistenza audit · GDPR Art. 30 + UE AI Act.
    // NIENTE userText completo: solo categoria + pattern matched (no PII).
    if (!isDevBypass()) {
      await logAudit({
        actorId: userId,
        action: "AI_BLOCKED",
        entityType: "AgenteFerroMessage",
        metadata: {
          category: verdict.category,
          matchedPattern: verdict.matchedPattern,
          messagesCount: messages.length,
        },
        request,
      });
    }
    return safeReplyResponse(verdict.safeReply);
  }

  // ── 4.5 Mock mode · bypass modello per dev locale senza consumare token ──
  if (isMockMode()) {
    logAgenteEvent("message.sent", {
      userId,
      messagesCount: messages.length,
      mock: true,
    });
    if (!isDevBypass()) {
      await logAudit({
        actorId: userId,
        action: "AI_MESSAGE",
        entityType: "AgenteFerroMessage",
        metadata: {
          messagesCount: messages.length,
          mock: true,
        },
        request,
      });
    }
    return mockChatResponse(userText, userFirstName);
  }

  // ── 5. Build system prompt + tools ────────────────────────────
  const systemPrompt = buildAgenteFerroSystemPrompt({
    userFirstName,
    userRole,
  });

  const tools = buildAgenteFerroTools(userId, prisma);

  // ── 6. streamText → UI message stream response ────────────────
  // Modello routato via AI Gateway (string ID `provider/model`) — niente
  // dipendenza da `@ai-sdk/anthropic` qui, l'auth viene fatta via OIDC
  // (`VERCEL_OIDC_TOKEN`) o `AI_GATEWAY_API_KEY` in dev.
  try {
    const modelMessages = await convertToModelMessages(messages);
    const result = streamText({
      model: AGENTE_FERRO_MODEL,
      system: systemPrompt,
      messages: modelMessages,
      tools,
      // tool calls automatici · max 5 step per evitare loop infiniti tool/model
      stopWhen: ({ steps }) => steps.length >= 5,
      // Logging non-PII per debug + detector OUTPUT (UE AI Act + FNOMCeO):
      // ispeziona il testo finale generato dal modello. Se ha "scavalcato"
      // il system prompt e prodotto diagnosi/dosaggi mascherati, NON
      // possiamo retrarre lo stream già inviato — logghiamo evento critico
      // per audit + review umano. Per blocco hard serve refactor a
      // non-streaming + risposta differita.
      async onFinish({ text, usage }) {
        if (process.env.NODE_ENV === "development") {
          console.log("[agente-ferro] usage:", usage);
        }
        try {
          const verdict = detectAgentReply(text);
          if (verdict.block) {
            logAgenteEvent("detector.blocked", {
              userId,
              category: verdict.category,
              matchedPattern: verdict.matchedPattern,
              source: "output",
            });
            if (!isDevBypass()) {
              await logAudit({
                actorId: userId,
                action: "AI_BLOCKED",
                entityType: "AgenteFerroMessage",
                metadata: {
                  category: verdict.category,
                  matchedPattern: verdict.matchedPattern,
                  source: "output",
                },
                request,
              });
            }
          }
        } catch (detectorErr) {
          // Detector deve essere best-effort: un crash qui non deve
          // sporcare la response al client.
          console.warn(
            "[agente-ferro] detector(output) error:",
            (detectorErr as Error).message
          );
        }
      },
    });

    logAgenteEvent("message.sent", {
      userId,
      messagesCount: messages.length,
    });

    // Audit Art. 30 GDPR · solo conteggio messaggi + flag (NO testo utente).
    if (!isDevBypass()) {
      await logAudit({
        actorId: userId,
        action: "AI_MESSAGE",
        entityType: "AgenteFerroMessage",
        metadata: {
          messagesCount: messages.length,
          mock: false,
        },
        request,
      });
    }

    return result.toUIMessageStreamResponse();
  } catch (e) {
    logAgenteEvent("model.error", {
      userId,
      message: (e as Error).message,
    });
    return NextResponse.json(
      { error: "model_error" },
      { status: 502 }
    );
  }
}
