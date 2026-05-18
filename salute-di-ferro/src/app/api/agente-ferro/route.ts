/**
 * Route handler · POST /api/agente-ferro
 *
 * Re-esporta `POST` dall'handler in `features/agente-ferro/api/handler.ts`.
 * `runtime` e `maxDuration` DEVONO essere dichiarati in-file (parsing
 * statico Next.js 16 delle route segment config NON accetta re-export
 * — riferimento: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config).
 *
 * La logica reale (auth, rate limit, detector, streamText) vive nel feature
 * module per facilità di testing.
 */

export { POST } from "@/features/agente-ferro/api/handler";

export const runtime = "nodejs"; // Prisma + Anthropic SDK richiedono Node runtime
export const maxDuration = 60; // streaming può tenere connessione aperta fino a 60s
