# Agente di Ferro · Feature Module

Chat AI conversazionale per la dashboard paziente Salute di Ferro.

**Stack**: Anthropic Claude via `@ai-sdk/anthropic` + streaming UI via `@ai-sdk/react` (useChat hook + streamText handler).

---

## 📁 Struttura

```
src/features/agente-ferro/
├── components/
│   ├── AgenteFerroChat.tsx       Componente principale chat (useChat + Textarea + messages list)
│   ├── AgenteFerroAvatar.tsx     Avatar bot
│   ├── AgenteFerroBanner.tsx     Banner disclaimer AI (Info icon + testo)
│   └── index.ts                  Barrel export
├── lib/
│   ├── system-prompt.ts          System prompt LLM (tono, vocabolario, regole)
│   ├── knowledge-base.ts         Conoscenza SDF strutturata (panels, biomarker, FAQ)
│   ├── tools.ts                  Tool definitions Anthropic (function calling)
│   ├── detector.ts               Intent detection / routing utente
│   ├── mock-data.ts              Mock per test locale senza DB
│   ├── index.ts                  Barrel export · espone AI_DISCLAIMER, SUGGESTED_QUESTIONS, isAgenteFerroEnabled
├── api/
│   └── handler.ts                POST /api/agente-ferro · streamText + tools wiring
├── page.tsx                      UI pagina /dashboard/patient/agente (Server Component · auth + render)
├── tests/
│   └── detector.test.ts          Test intent detector
└── README.md                     Questo file
```

## 🔗 Stub Next.js (NON modificare)

Next.js App Router richiede che route + page vivano in `src/app/...`. Due file stub re-exportano dal feature module:

- `src/app/api/agente-ferro/route.ts` → `export { POST } from "@/features/agente-ferro/api/handler"`
- `src/app/dashboard/patient/agente/page.tsx` → `export { default } from "@/features/agente-ferro/page"`

Tutto il codice reale vive in **questa cartella**.

---

## 🚀 Dipendenze

Aggiunte a `package.json`:

```json
"@ai-sdk/anthropic": "^3.0.75",
"@ai-sdk/react": "^3.0.177"
```

Più (già presenti nel dashboard):
- `ai` (per `streamText`, `convertToModelMessages`, `tool`, `UIMessage`, `DefaultChatTransport`)
- `zod` (validation tool args)
- `lucide-react` (Info icon)
- `@prisma/client` (read paziente data)
- shadcn/ui: `Button`, `Badge`, `Textarea`

---

## 🔐 Env vars richieste

```env
ANTHROPIC_API_KEY=sk-ant-...
```

Più le esistenti del dashboard (`DATABASE_URL`, `SUPABASE_*`, ecc).

---

## 🛣 Routes generate

| Route | File reale | Cosa fa |
|---|---|---|
| `GET /dashboard/patient/agente` | `page.tsx` | Render pagina chat (Server Component · auth check + feature flag check) |
| `POST /api/agente-ferro` | `api/handler.ts` | Streaming response Claude · tool calling abilitato |

---

## 🧪 Test locale

```bash
cd salute-di-ferro
npm run dev
# poi vai a http://localhost:3000/dashboard/patient/agente
```

Per disabilitare temporaneamente: `isAgenteFerroEnabled()` in `lib/index.ts` ritorna `false` → page redirect.

---

## 🛡 A11y notes (debito tecnico noto)

Chat AI streaming è dominio noto-difficile a11y. Da rivedere quando si tocca codice rendering:
- **Messages list**: serve `aria-live="polite"` o `role="log"` per annunciare nuovi messaggi SR
- **Streaming token-by-token**: strategia announcement per non spammare SR (es. annunciare solo on-complete)
- **Textarea input**: label associata + error state aria-invalid
- **Button send**: accessible name esplicito
- **Banner disclaimer**: Info icon `aria-hidden`, testo nel DOM tree

Pianificare review con `accessibility-lead:live-region-controller` + `aria-specialist` PRIMA di considerare il modulo "done".

---

## 🔄 Storia

| Data | Cambio |
|---|---|
| 2026-05-14 | Setup iniziale feature module (refactor da paths sparsi) |
