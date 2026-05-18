/**
 * Route handler · POST /api/agente-ferro
 *
 * Re-esporta `POST` + config (`runtime`, `maxDuration`) dall'handler in
 * `features/agente-ferro/api/handler.ts`. Next.js legge questi simboli
 * SOLO da un file `route.ts` dentro `src/app/api/**`.
 *
 * La logica reale (auth, rate limit, detector, streamText) vive nel
 * feature module per facilità di testing.
 */

export { POST, runtime, maxDuration } from "@/features/agente-ferro/api/handler";
