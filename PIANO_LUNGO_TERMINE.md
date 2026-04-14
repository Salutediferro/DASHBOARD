# Piano Lungo Termine — Salute di Ferro Dashboard

Questo documento è la **North Star** del progetto a 12-24 mesi. Non è un piano operativo immediato: quello è `PIANO_PROMPT_CLAUDE_CODE.md`. Questo è la bussola strategica a cui tornare ogni volta che c'è una decisione architetturale da prendere o una tentazione tecnologica da respingere.

## La forma del prodotto a 18 mesi

Salute di Ferro è una SaaS verticale italiana per coach fitness, posizionata come prodotto premium per coach professionisti che gestiscono clienti con serietà (programmazione scientifica, tracking reale, progressioni, check-in). Non è un'app consumer di massa, non è enterprise con contratti custom. È un verticale B2B boutique che cresce da 1-2 beta a 10-20 pilota a 50-100 coach paganti nell'arco di 12-18 mesi. Vive o muore sulla qualità del prodotto e sulla fiducia del coach.

Questa forma dettata determina tutte le scelte sotto.

## Principi architetturali non negoziabili

**Stack fissato.** Next.js App Router + Prisma + Supabase + shadcn/ui + React Query + Zustand + Zod. Non si cambia finché non c'è un blocco reale dimostrato, non per moda. Ogni tentazione di migrare a Remix, Drizzle, Clerk, tRPC, GraphQL va respinta. Il costo di una migrazione di stack è 3-6 settimane di non-costruzione che il prodotto non può permettersi.

**Tre ambienti separati dal giorno uno.** `dev` (dove si rompe tutto), `staging` (dove si testa il deploy prima di farlo vero), `prod` (dove vivono i coach paganti, mai toccato a mano). Tre progetti Supabase distinti, tre ambienti Vercel distinti, variabili d'ambiente separate. Il piano free Supabase supporta due progetti, il terzo arriva con il Pro a 25$/mese nel momento in cui c'è il primo coach pagante.

**Tutto in git, inclusi schema e RLS.** Lo schema Prisma è già versionato. Le Row Level Security policy di Supabase vanno versionate come SQL migration in `supabase/migrations/`, mai cliccate nella dashboard. L'intero stato del database — schema + policy — deve essere riproducibile da zero su un ambiente vergine in meno di 10 minuti.

**Mai `prisma db push` in produzione.** Sempre `prisma migrate deploy` con migration versionate e testate in staging. Questa regola previene il 90% dei disastri dati.

**Dati sanitari trattati come categoria speciale.** Regione DB in UE fissata. Tabelle con dati sensibili (referti, check-in, biometriche) separate e con RLS dedicata. File sensibili (foto, PDF) su Supabase Storage in bucket privato con signed URL, mai pubblico. Log di accesso ai dati sanitari per rispondere a eventuali audit. Script di cancellazione utente (GDPR art. 17) pronto prima del primo cliente pagante.

**Osservabilità prima del bisogno.** Sentry attivo dal deploy in staging. Log strutturati nelle API route con contesto (userId, route, durata). Healthcheck endpoint. Cron settimanale con KPI base via email (coach attivi, sessioni workout chiuse, errori). Queste cose vanno messe prima che servano, non dopo.

## Cosa non fare, mai

Niente microservizi. Niente Kubernetes. Niente self-hosted database. Niente riscritture di stack. Niente app mobile nativa prima di 20 coach paganti (una PWA curata sul dashboard client copre 12-18 mesi). Niente AI feature come differenziatore primario nella beta (l'AI è un accelerator, non il prodotto). Niente test coverage obiettivo numerico: solo E2E sui flussi critici + unit test sui validator Zod.

## Roadmap indicativa a 12 mesi

**Mesi 0-1 — Beta locale workout** (piano corrente `PIANO_PROMPT_CLAUDE_CODE.md`). 1-2 coach, dati reali, zero mock, zero AI, zero deploy.

**Mese 2 — Fondamenta lungo termine.** Creazione progetti Supabase dev/staging/prod. Deploy Vercel preview/staging. Sentry attivo. Log strutturati. RLS versionate in `supabase/migrations/`. Healthcheck. `ADR.md` con le decisioni architetturali chiave.

**Mese 3 — Riaccensione moduli uno alla volta.** Check-in fotografici prima (alto valore per il coach, basso rischio tecnico), poi biometriche e progress chart, poi nutrizione. Ogni modulo passa attraverso lo stesso pattern: inventario mock → conversione Prisma → smoke test → feature flag ON.

**Mese 4 — Compliance GDPR seria.** Privacy policy scritta con taglio dati sanitari. DPA con Supabase e OpenAI firmati. Consenso esplicito in onboarding per dati di salute. Script di export e cancellazione utente. Informativa dedicata per i referti medici.

**Mese 5 — Stripe e monetizzazione.** Checkout, subscription, webhook idempotenti, dunning, gestione trial, export per fatturazione elettronica italiana. Pricing deciso con il primo pilota pagante.

**Mese 6 — Pilota 5-10 coach.** Apertura controllata con onboarding assistito. Raccolta feedback strutturato. Sentry attivo in produzione. Cron KPI settimanale funzionante.

**Mese 7-9 — Riaccensione AI con guardrail.** Generazione programmi via OpenAI con budget per organizzazione, cache, fallback, costi monitorati. Chat assistente client con rate limiting stretto.

**Mese 9-12 — Scale up.** Ottimizzazioni performance, audit sicurezza, ampliamento libreria esercizi con video, eventuale apertura self-service, referral program, contenuto di marketing.

**Mese 12+ — App mobile.** Solo se i numeri giustificano l'investimento. Altrimenti PWA.

## Le metriche che contano

Non guardare vanity metrics. Le tre che contano a ogni review mensile:

- **Coach attivi settimanalmente** (hanno loggato almeno una volta e creato/modificato almeno un template).
- **Sessioni workout chiuse dai clienti nella settimana** (proxy del valore reale generato).
- **Churn mensile coach** (coach che hanno smesso di usare il prodotto dopo averlo provato). Sotto il 5% mensile è buono, sopra il 10% è un problema di prodotto.

Tutto il resto è rumore.

## La regola finale

Ogni volta che sei tentato da una scelta tecnica "figa", torna su questo documento e chiediti: *questa cosa mi fa fare più coach attivi la settimana prossima?* Se la risposta è no, rimandala. Se la risposta è sì, fallo subito.
