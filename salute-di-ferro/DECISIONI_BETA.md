# Decisioni Beta — Salute di Ferro Dashboard

Questo documento fissa le scelte prese prima di iniziare l'esecuzione del piano beta. Claude Code deve leggerlo all'inizio di ogni sessione e rispettarlo senza deviare.

## Obiettivo della fase
Portare il **solo modulo Workout** a stato funzionante end-to-end in locale, per 1-2 coach beta reali che lo useranno con clienti veri. Non è produzione pubblica, non è pilota pagante. È una beta chiusa.

## Scope fissato

**Dentro la beta:**
- Auth Supabase (signup, login, logout, middleware)
- Gestione clienti lato coach (lista, dettaglio, invito/creazione)
- Libreria esercizi (CRUD completo)
- Template workout (creazione, modifica, assegnazione al cliente)
- Esecuzione sessione workout lato cliente (log serie/reps/peso/RPE/note)
- Lettura cronologia sessioni lato coach e lato cliente
- Profilo base utente

**Fuori dalla beta (feature-flagged, codice non cancellato):**
- Nutrizione e piani alimentari
- Check-in fotografici
- Biometriche e progress chart
- Appuntamenti e calendario
- Tutte le feature AI (generazione programmi, analisi, chat assistente)
- Report settimanali
- Progression suggestions automatiche
- Pannello Admin
- App mobile Expo
- Stripe e pagamenti
- Medical reports

## Decisioni tecniche fissate

**Stack (non si tocca):** Next.js 16 App Router, React 19, TypeScript strict, Prisma 7, Supabase (Auth + Postgres + Storage), Tailwind 4, shadcn/ui, React Query, Zustand, Zod, React Hook Form.

**Database:** Supabase cloud, progetto dedicato `salute-di-ferro-dev`, regione UE (Frankfurt o Paris). Non si usa Docker locale.

**Dev bypass:** `NEXT_PUBLIC_DEV_BYPASS` deve essere `0` (o assente) durante tutta la beta. L'auth reale deve funzionare da subito.

**AI:** completamente fuori scope. Le route `/api/ai/*` e i pulsanti "Genera con AI" nella UI vengono disabilitati via feature flag nel Prompt 6. Il codice resta nel repo ma non è raggiungibile.

**Feature flag:** variabile env `NEXT_PUBLIC_ENABLED_MODULES="workout"`. Helper `isModuleEnabled(name)` in `src/lib/feature-flags.ts`.

**Seed:** 1 organizzazione, 1 coach, 2 clienti, 25-30 esercizi base italiani, 2 template demo, 1 assegnazione attiva. Idempotente.

**Sicurezza:** `.env.local` è già fuori da git (confermato nel Prompt 0). Nessuna rotazione chiavi necessaria per ora.

## Regole d'oro per Claude Code

1. **Rispetta lo scope.** Se un task tocca moduli fuori scope (nutrizione, AI, check-in, biometriche, appuntamenti, admin, mobile, Stripe), fermati e rispondi "fuori scope beta, feature-flagged, non tocco".
2. **Next 16 ha breaking changes.** Prima di scrivere codice su server components, middleware, route handlers, data fetching o `cookies()`, consulta `node_modules/next/dist/docs/` o `AGENTS.md`. Non applicare pattern di Next 14/15 a memoria.
3. **Un file alla volta, un commit alla volta.** Messaggi di commit nel formato `feat(workout-<area>): <cosa>` o `fix(workout-<area>): <cosa>`.
4. **Se devi cambiare schema Prisma, fermati e chiedi conferma.** Mai `db push`, sempre migration versionata con nome descrittivo.
5. **Ogni prompt finisce con uno smoke test manuale** che tu stesso esegui (curl/browser headless/Playwright one-shot) prima di dichiararlo concluso.
6. **Non aggiungere dipendenze npm** senza giustificazione esplicita nel report finale.
7. **Non refactorare opportunisticamente.** Se vedi codice brutto fuori dal task corrente, segnalalo in una lista `TODO_POST_BETA.md` e vai avanti.
8. **Non toccare il middleware root** con dev bypass finché non sei nel Prompt 7 (hardening). Lì va reso sicuro ma non rimosso.

## Credenziali di seed (da usare per ogni smoke test)
- Coach: `coach@sdf.local` / password da seed (riportare nel report del Prompt 2)
- Client 1: `cliente1@sdf.local` / password da seed
- Client 2: `cliente2@sdf.local` / password da seed

## Stato avanzamento
- [x] Prompt 0 — Orientamento + sicurezza chiavi (completato)
- [x] Prompt 1 — Far partire il progetto in locale (completato)
- [ ] Prompt 2 — Seed realistico
- [ ] Prompt 3 — Inventario mock vs reale
- [ ] Prompt 4 — Conversione mock lato coach
- [ ] Prompt 5 — Conversione mock lato client + esecuzione sessione
- [ ] Prompt 6 — Feature flag
- [ ] Prompt 7 — Hardening minimo
- [ ] Prompt 8 — Smoke test finale + consegna beta
