# ARCHITECTURE NOTES — Salute di Ferro

Snapshot iniziale per portare il modulo **Workout** da prototipo a beta.
Stato: **solo orientamento** — nessun file di codice modificato.

---

## 1. Versioni esatte

| Stack | Versione |
|---|---|
| Node.js (locale) | **v24.13.1** |
| Next.js | **16.2.3** (App Router, Turbopack dev) |
| React / React DOM | **19.2.4** |
| TypeScript | ^5 |
| Prisma / @prisma/client | **^7.7.0** (con `@prisma/adapter-pg` ^7.7.0, `pg` ^8.20.0) |
| @supabase/ssr | **^0.10.2** |
| @supabase/supabase-js | **^2.103.0** |
| Tailwind CSS | ^4 (`@tailwindcss/postcss`) |
| Zod | ^4.3.6 |
| TanStack Query | ^5.99.0 |
| Zustand | ^5.0.12 |
| AI SDK | `ai` ^6.0.158, `@ai-sdk/openai` ^3.0.52 |
| Stripe | ^22.0.1 (server), `@stripe/stripe-js` ^9.1.0 |

> ⚠️ `salute-di-ferro/AGENTS.md` avvisa: questa è una versione di Next/Prisma con breaking changes — consultare `node_modules/next/dist/docs/` prima di modificare codice.

---

## 2. Entità Prisma rilevanti per il modulo Workout

Definite in `prisma/schema.prisma`.

### Core workout
- **`WorkoutTemplate`** — programma creato da un coach (appartiene a `Organization`). Campi: `name`, `description`, `difficulty`, `type`, `isPublic`, `tags[]`. Relazioni: `coach`, `organization`, `days`.
- **`WorkoutDay`** — singola giornata di un template. Campi: `dayNumber`, `name`, `notes`. Relazione: `template`, `exercises`.
- **`WorkoutExercise`** — riga di prescrizione (esercizio dentro una giornata). Campi: `orderIndex`, `sets`, `reps` (string es. `"8-10"`), `rpe`, `restSeconds`, `tempo`, `supersetGroup`, `notes`.
- **`Exercise`** — libreria esercizi (globale o per organization). Campi: `name`, `nameIt`, `slug` (univoco), `muscleGroup`, `secondaryMuscles[]`, `equipment`, `description`, `steps[]`, `tips[]`, `commonMistakes[]`, `variants[]`, `videoUrl`, `thumbnailUrl`, `incrementKg`.

### Esecuzione lato cliente
- **`WorkoutLog`** — sessione svolta dal client. Campi: `clientId`, `workoutDayId`, `date`, `duration`, `notes`, `rating`, `completed`.
- **`WorkoutSetLog`** — singola serie loggata. Campi: `setNumber`, `reps`, `weight`, `rpe`, `isWarmup`, `notes`.

### Progressione (RP-style)
- **`ProgressionSuggestion`** — suggerimento automatico al coach per un client/esercizio. Campi: `status` (PENDING/ACCEPTED/IGNORED), `action` (INCREASE_WEIGHT/MAINTAIN/REDUCE_WEIGHT/ADD_SET/DELOAD), `reason`, `lastWeight/Reps/Rpe`, `suggestedWeight/Reps/Sets`.

### Modelli di supporto richiesti dal modulo
- **`User`** (con `role`: ADMIN/COACH/CLIENT, `organizationId`)
- **`CoachClient`** (pivot coach↔client, `status`, `checkInFrequency`, ecc.)
- **`Organization`** (multi-tenant / white-label)

### Enum coinvolte
`UserRole`, `Difficulty`, `WorkoutType`, `MuscleGroup`, `Equipment`, `ProgressionStatus`, `ProgressionAction`, `CoachClientStatus`.

---

## 3. Route `/api` relative al Workout

Tutte sotto `salute-di-ferro/src/app/api/`.

### Coach — gestione template
- `POST/GET /api/workouts` — lista/crea WorkoutTemplate
- `GET/PUT/DELETE /api/workouts/[id]` — dettaglio/aggiorna/elimina template
- `POST /api/workouts/[id]/assign` — assegna template a un client

### Client — esecuzione
- `GET /api/client/workout/today` — workout previsto oggi
- `POST /api/client/workout/log` — logga set/sessione in corso
- `POST /api/client/workout/complete` — chiude la sessione
- `GET /api/client/workout/history` — storico sessioni
- `GET /api/client/workout/history/[id]` — dettaglio sessione

### Libreria esercizi
- `GET/POST /api/exercises`
- `GET/PUT/DELETE /api/exercises/[id]`

### AI (generazione programmi — al momento parte del modulo workout)
- `POST /api/ai/generate-program`
- `POST /api/ai/adjust-program`
- `POST /api/ai/regenerate-day`
- `POST /api/workouts/from-ai` — converte output AI in WorkoutTemplate

### Progressione
- `GET /api/coach/clients/[id]/progression` — suggerimenti per uno specifico client
- `PATCH /api/coach/progression-suggestions/[id]` — accetta/ignora suggerimento

> Le route AI sopra dipendono dal flag/ambiente OpenAI; vanno valutate per la beta (probabilmente da nascondere dietro feature flag insieme al resto dei moduli AI).

---

## 4. Pagine Coach e Client relative al Workout

Tutte sotto `salute-di-ferro/src/app/dashboard/`.

### Coach
- `/dashboard/coach/workouts` — lista template
- `/dashboard/coach/workouts/[id]/edit` — editor template (giornate + esercizi)
- `/dashboard/coach/workouts/ai-generate` — generazione AI di un programma
- `/dashboard/coach/exercises` — libreria esercizi

### Client
- `/dashboard/client/workout` — landing del workout assegnato
- `/dashboard/client/workout/session` — schermata di esecuzione/logging
- `/dashboard/client/workout/history` — storico
- `/dashboard/client/workout/history/[id]` — dettaglio sessione

### Pagine non-workout (da nascondere via feature flag in beta)
Per memoria, queste sono presenti ma fuori scope per il primo rollout beta:
nutrition (coach + client), check-ins, biometrics, progress, appointments/calendar, ai-assistant, weekly-report, support, admin, onboarding, settings, profile.

---

## 5. Layer Supabase / auth (riferimento rapido)

- `src/lib/supabase/client.ts` — `createBrowserClient` per i Client Components.
- `src/lib/supabase/server.ts` — `createServerClient` con `cookies()` per Server Components / route handlers.
- `src/lib/supabase/middleware.ts` — `updateSession()` usato dal middleware Next per refresh token + lettura user.
- `middleware.ts` (root del progetto, **non** in `src/`) — protegge `/dashboard`, fa role-based routing fra `coach`/`client`/`admin`, e contiene un **dev bypass** (`NEXT_PUBLIC_DEV_BYPASS=1` + `NODE_ENV=development`) che finge un utente `CLIENT`. Da rimuovere prima della beta.

---

## 6. Note operative per la beta workout

- Stack chiavi attualmente in `.env.local`: Supabase (URL + anon + service role), Prisma (`DATABASE_URL`, `DIRECT_URL`), Stripe (3), OpenAI, `NEXT_PUBLIC_DEV_BYPASS`.
- `.env.local` **non è tracciato da git** (catturato da `.env*` in `.gitignore`) — non è quindi necessario rimuoverlo dall'indice. Vedi sezione "Stato chiavi" nella risposta.
- Layout root (`src/app/layout.tsx`) forza tema `dark`, monta `ThemeProvider`, `QueryProvider`, `Toaster` (sonner) e `PwaRegister` — già pronto per l'uso da PWA.
