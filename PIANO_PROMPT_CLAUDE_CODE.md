# Piano Prompt — Salute di Ferro Dashboard
## Da incollare su Claude Code, in ordine, uno alla volta

**Obiettivo finale:** rendere funzionante end-to-end il **solo modulo Workout** per 1–2 coach beta, in locale, con dati reali su Supabase. Tutto il resto viene nascosto via feature flag, non cancellato.

**Regole d'oro per tutti i prompt qui sotto:**
- Non passare al prompt successivo finché quello corrente non è verificato e funzionante.
- Dopo ogni prompt, fai un commit con messaggio chiaro.
- Se Claude Code propone di toccare moduli fuori scope (nutrizione, AI, check-in, appuntamenti, biometriche, admin, mobile), **fermalo**: risponde "fuori scope, feature-flagged, non toccare".
- Ogni prompt chiede esplicitamente a Claude Code di riportare cosa ha fatto e come verificarlo manualmente.

---

## PROMPT 0 — Orientamento e sicurezza (obbligatorio, 10 minuti)

```
Sei l'ingegnere principale che porta il progetto Salute di Ferro da prototipo a beta funzionante.

CONTESTO:
- Progetto Next.js 16 App Router + React 19 + Prisma + Supabase + Tailwind/shadcn.
- Obiettivo immediato: far funzionare end-to-end SOLO il modulo Workout, in locale, per 1-2 coach beta reali.
- Tutti gli altri moduli (nutrizione, check-in, biometriche, appuntamenti, AI, admin, mobile) restano nel codice ma verranno nascosti via feature flag.

PRIMO TASK — ORIENTAMENTO:
1. Leggi package.json, prisma/schema.prisma, src/app/layout.tsx, src/middleware.ts e src/lib/supabase/*.
2. Produci un documento ARCHITECTURE_NOTES.md nella root del progetto con:
   - Versioni esatte (Node, Next, React, Prisma, Supabase).
   - Lista delle entità Prisma rilevanti per il modulo Workout.
   - Lista delle route /api relative al workout.
   - Lista delle pagine coach e client relative al workout.
3. NON modificare ancora nessun file di codice.

SECONDO TASK — SICUREZZA CHIAVI:
1. Verifica se .env.local è tracciato da git (`git ls-files .env.local`).
2. Se sì: aggiungilo a .gitignore, rimuovilo dall'indice con `git rm --cached .env.local`, e avvisami esplicitamente che devo ruotare le chiavi Supabase dalla dashboard Supabase (non farlo tu).
3. Crea .env.example con i nomi delle variabili ma SENZA valori.

Riporta:
- Il contenuto di ARCHITECTURE_NOTES.md
- Lo stato di .env.local (tracciato sì/no, azione presa)
- Nessun altro cambiamento al codice.
```

**Verifica manuale:** apri `ARCHITECTURE_NOTES.md`, controlla che le entità e le route siano sensate. Vai su Supabase dashboard e ruota manualmente anon key e service role key. Aggiorna `.env.local` locale con le nuove chiavi.

---

## PROMPT 1 — Far partire il progetto in locale

```
CONTESTO: continuiamo il piano beta del modulo Workout di Salute di Ferro. Hai già prodotto ARCHITECTURE_NOTES.md.

TASK: portare il progetto a stato "gira in locale senza errori".

Procedura:
1. Installa le dipendenze (`npm install`). Se ci sono conflitti di peer deps, risolvili con la soluzione meno invasiva e documenta la scelta.
2. Verifica che .env.local esista localmente con credenziali Supabase valide. Se mancano variabili rispetto a .env.example, fermati e chiedi all'utente.
3. Esegui `npx prisma generate`.
4. Esegui `npx prisma migrate dev` per allineare il DB locale allo schema. Se ci sono drift o errori di migration, risolvili (drop + recreate del DB locale va bene, SIAMO in dev).
5. Esegui `npm run build` e riporta eventuali errori di TypeScript o lint bloccanti. Correggi SOLO gli errori bloccanti del build, non fare refactor opportunistici.
6. Avvia `npm run dev` e verifica che la home page risponda 200.

Riporta:
- Output di ogni comando (sintetico)
- Ogni errore incontrato e come l'hai risolto
- Stato finale: build OK / dev server OK / DB allineato

VINCOLI:
- Non toccare codice fuori dal necessario per far compilare.
- Non modificare file dentro src/app/(dashboard)/coach/nutrition, check-in, appointments, biometrics, ai, admin.
```

**Verifica manuale:** apri `http://localhost:3000`, vedi la landing/login senza errori in console.

---

## PROMPT 2 — Seed realistico per il modulo Workout

```
CONTESTO: progetto gira in locale. Ora serve un seed realistico per poter testare il flusso Workout end-to-end.

TASK: rivedere (o creare se mancante) prisma/seed.ts per popolare il DB con:
- 1 Organization "SDF Beta"
- 1 utente Coach (email: coach@sdf.local, password gestita via Supabase Auth admin API) con ruolo COACH
- 2 utenti Client (cliente1@sdf.local, cliente2@sdf.local) collegati al coach
- 25-30 Exercise della libreria globale, coprendo: squat, stacco, panca piana, military press, trazioni, rematore, affondi, hip thrust, leg press, leg curl, leg extension, calf, curl bicipiti, pushdown tricipiti, alzate laterali, crunch, plank, face pull, pulley basso, lat machine. Ognuno con nome italiano, muscle group, equipment, e istruzioni brevi.
- 2 WorkoutTemplate d'esempio ("Upper A" e "Lower A") con 5-6 esercizi ciascuno, serie/reps/rest compilati.
- 1 WorkoutAssignment che assegna "Upper A" al cliente1 a partire da oggi.

VINCOLI:
- Usa Supabase Auth Admin API per creare gli utenti auth (non inserire direttamente nella tabella auth.users).
- Lo script deve essere IDEMPOTENTE: se lanciato due volte non duplica dati, fa upsert.
- Aggiungi a package.json uno script "db:seed" se non esiste.
- Non toccare seed di moduli fuori scope (nutrizione ecc.): se esistono, lasciali ma commentali con TODO.

Dopo aver scritto il seed:
1. Esegui `npm run db:seed`.
2. Apri Prisma Studio (`npx prisma studio`) e conferma che i dati ci siano.
3. Riporta credenziali di login dei 3 utenti così posso provarli.
```

**Verifica manuale:** login come coach@sdf.local, vedi i 2 clienti nella lista, vedi i 2 template e l'assegnazione.

---

## PROMPT 3 — Inventario mock vs reale (solo modulo Workout)

```
CONTESTO: il DB è popolato, ora dobbiamo capire ESATTAMENTE dove ci sono ancora dati finti nel modulo Workout.

TASK: produci INVENTORY_WORKOUT.md nella root con una tabella per ogni:

A) Pagina lato COACH relativa al workout:
   - src/app/(dashboard)/coach/clients/** (lista e dettaglio cliente, sezioni workout)
   - src/app/(dashboard)/coach/workouts/** o equivalente (template, libreria)
   - src/app/(dashboard)/coach/exercises/** (libreria esercizi)

B) Pagine lato CLIENT relative al workout:
   - src/app/(dashboard)/client/** home (widget "workout di oggi")
   - src/app/(dashboard)/client/workout/** (sessione, storico, dettaglio)

C) Tutte le route src/app/api/** che riguardano: exercises, workouts, templates, assignments, sessions, sets.

Per ognuno indica in tabella:
| File | Tipo | Stato (REALE / MOCK / MISTO / PLACEHOLDER) | Note | Azione richiesta |

"REALE" = legge/scrive via Prisma sul DB.
"MOCK" = importa da src/lib/mock-*.ts o usa array hardcoded.
"MISTO" = parte reale e parte mock.
"PLACEHOLDER" = pagina vuota o "coming soon".

Cerca aggressivamente import da mock-*, usi di array hardcoded, fetch verso endpoint che restituiscono dati finti.

VINCOLI:
- NON modificare codice in questo step. Solo analisi.
- Ignora completamente nutrizione, check-in, biometriche, appuntamenti, AI, admin, mobile.

Al termine riporta:
- Numero totale di file analizzati
- Numero REALE / MOCK / MISTO / PLACEHOLDER
- Top 5 file più urgenti da convertire (quelli sul percorso critico del flusso beta)
```

**Verifica manuale:** apri `INVENTORY_WORKOUT.md`, leggi le top 5. Questa è la tua roadmap operativa per i prompt successivi.

---

## PROMPT 4 — Conversione mock → Prisma, lato COACH

```
CONTESTO: hai INVENTORY_WORKOUT.md. Ora convertiamo i mock a query Prisma reali, partendo dal lato COACH.

TASK: per OGNI file lato coach marcato MOCK o MISTO relativo a exercises, workout templates, clients list, assignment:
1. Sostituisci gli import da mock-* con query Prisma reali (server components) o chiamate API reali (client components).
2. Assicurati che le route /api corrispondenti esistano e facciano CRUD reale su Prisma, con validazione Zod già presente.
3. Se manca una route API necessaria, creala seguendo il pattern esistente nelle altre route funzionanti.
4. Gestisci errori e stati di caricamento con skeleton/empty state esistenti.
5. NON creare UI nuova. Solo cablaggio dati.

Flussi che devono funzionare al termine di questo prompt, provati MANUALMENTE da te con curl/Playwright/browser:
a. Login come coach@sdf.local
b. Vedere la lista dei 2 clienti (dati reali)
c. Aprire dettaglio cliente1 e vedere che ha "Upper A" assegnato
d. Aprire libreria esercizi e vedere i ~25 esercizi del seed
e. Creare un nuovo template "Upper B" con 4 esercizi e salvarlo → deve comparire nel DB (verifica Prisma Studio)
f. Assegnare "Upper B" al cliente2

VINCOLI:
- Un file alla volta, commit dopo ogni file con messaggio "feat(workout-coach): wire <file> to Prisma".
- Se un file richiede cambi di schema Prisma, FERMATI e chiedi conferma prima di creare migration.
- Non toccare il lato client in questo prompt.
- Non toccare moduli fuori scope.

Al termine: riporta la checklist a-f con esito, e lista dei file modificati.
```

**Verifica manuale:** fai tu i 6 step nel browser. Se uno si rompe, riapri il prompt con "step X è rotto, ecco l'errore, sistemalo".

---

## PROMPT 5 — Conversione mock → Prisma, lato CLIENT + esecuzione sessione

```
CONTESTO: il lato coach è funzionante. Ora il pezzo più delicato: il cliente deve poter eseguire un workout e loggare le serie, e il coach deve poterle rileggere.

TASK — parte A (lettura):
1. Sistema la home del client in modo che mostri il widget "workout di oggi" leggendo la WorkoutAssignment attiva per l'utente loggato.
2. Sistema /dashboard/client/workout (storico) per mostrare le sessioni passate reali.
3. Converti ogni mock residuo lato client a Prisma reale.

TASK — parte B (esecuzione e log, IL PEZZO CRITICO):
1. La pagina /dashboard/client/workout/session deve:
   - Caricare la WorkoutAssignment del giorno e il WorkoutTemplate collegato.
   - Mostrare ogni esercizio con serie/reps/peso target.
   - Pre-compilare il peso suggerito prendendo l'ultimo SetLog dello stesso esercizio dello stesso utente (se esiste), altrimenti il target.
   - Per ogni serie: input numerico peso, input numerico reps effettive, checkbox "completata", campo opzionale RPE e note.
   - Pulsante "chiudi sessione" che salva una WorkoutSession con tutti i SetLog collegati in una transaction Prisma.
2. Verifica che lo schema Prisma supporti tutto questo. Se manca un campo (es. RPE per set, nota per set), crea una migration con nome descrittivo e applicala.
3. Crea/aggiorna l'endpoint POST /api/workout-sessions che riceve il payload validato con Zod e persiste in transaction.

TASK — parte C (coach rilegge):
1. Nel dettaglio cliente lato coach, aggiungi (o sistema se già esiste) una sezione "Sessioni completate" che mostra la cronologia delle WorkoutSession del cliente, con possibilità di aprire una sessione e vedere i SetLog.

VINCOLI:
- Transaction Prisma obbligatoria per salvare Session + SetLog.
- Validazione Zod obbligatoria sugli input dell'endpoint.
- NON aggiungere AI, analisi automatiche, notifiche, email. Solo CRUD pulito.
- Non toccare moduli fuori scope.

Smoke test da eseguire TU al termine:
1. Login cliente1 → home mostra "Upper A oggi"
2. Apri sessione, compila 3 esercizi con pesi/reps realistici, chiudi
3. Verifica in Prisma Studio che WorkoutSession e SetLog esistano
4. Logout, login coach → dettaglio cliente1 → vedi la sessione appena registrata con i dati giusti

Riporta esito di ogni step dello smoke test. Se uno fallisce, correggi e riprova prima di dichiarare concluso il prompt.
```

**Verifica manuale:** rifai tu personalmente lo smoke test, da zero. Questo è il momento della verità.

---

## PROMPT 6 — Feature flag per nascondere tutto il resto

```
CONTESTO: il modulo Workout funziona end-to-end. Ora dobbiamo nascondere dalla UI tutto ciò che è fuori scope, senza cancellare il codice.

TASK:
1. Crea src/lib/feature-flags.ts che legge NEXT_PUBLIC_ENABLED_MODULES da env (comma-separated: "workout,nutrition,checkin,...") e esporta helper isModuleEnabled(name).
2. In .env.example e .env.local imposta NEXT_PUBLIC_ENABLED_MODULES="workout".
3. Nei componenti di navigazione (sidebar coach, sidebar client, mobile nav, dashboard home cards), filtra le voci di menu in base ai moduli abilitati. Le voci non abilitate spariscono.
4. Per le ROUTE fuori scope, aggiungi nei rispettivi layout.tsx (o page.tsx) un check che se il modulo non è abilitato, chiama notFound() di next/navigation. Questo copre l'accesso diretto via URL.
5. Moduli da disabilitare: nutrition, check-in (checkins), biometrics, appointments, ai-assistant, admin, reports, medical-reports, progression-suggestions.
6. Moduli da tenere attivi: workout, auth, onboarding essenziale, profilo base.

VINCOLI:
- NON cancellare file. Solo feature flag.
- NON toccare logica interna dei moduli disabilitati. Solo gate di accesso.
- Verifica che la navigazione coach e client, dopo il flag, mostri solo voci workout + profilo.

Smoke test:
1. Login coach: vedo solo Dashboard, Clienti, Libreria Esercizi, Template, Profilo. NIENTE nutrizione/check-in/AI/appuntamenti ecc.
2. Login client: vedo solo Home, Workout di oggi, Storico, Profilo.
3. Vado manualmente su /dashboard/coach/nutrition → 404.
4. Vado manualmente su /dashboard/client/check-in → 404.

Riporta esito.
```

**Verifica manuale:** i 4 step dello smoke test.

---

## PROMPT 7 — Hardening minimo pre-beta

```
CONTESTO: il beta è quasi pronto. Non facciamo enterprise hardening, solo il minimo indispensabile per non farci male.

TASK:
1. Errori e crash:
   - Verifica che esista un src/app/error.tsx e un src/app/global-error.tsx decenti (pagina pulita, bottone "riprova", niente stack trace in produzione).
   - Aggiungi un src/app/not-found.tsx se manca.
2. Logging minimo:
   - Nelle route API del modulo workout, aggiungi console.error con contesto (nome route + userId se disponibile) in ogni catch.
3. Auth guard:
   - Verifica che OGNI route /api/workout* e OGNI pagina /dashboard/** richieda sessione Supabase valida, altrimenti redirect a login o 401.
4. Isolation multi-tenant minima:
   - Ogni query Prisma nel modulo workout DEVE filtrare per organizationId dell'utente loggato. Audita e correggi.
5. .gitignore:
   - Verifica che .env*, node_modules, .next, prisma/*.db siano ignorati.
6. README operativo:
   - Crea/aggiorna README.md con: "come far partire in locale in 5 comandi", credenziali di seed, come resettare il DB, come runnare il seed.

VINCOLI:
- Nessun refactor di business logic.
- Niente test automatizzati in questo step (verranno dopo).
- Niente Sentry/PostHog/rate limiting/RLS fine-grained: fuori scope di questa fase.

Al termine riporta un diff ad alto livello delle aree toccate.
```

**Verifica manuale:** segui il README da zero su una cartella pulita e vedi se davvero riesci a far partire il progetto in 5 comandi.

---

## PROMPT 8 — Smoke test finale end-to-end e consegna beta

```
CONTESTO: tutti i prompt precedenti sono verdi. Ultimo passaggio: validazione end-to-end e consegna.

TASK:
1. Reset completo del DB locale: drop + migrate + seed.
2. Esegui questo scenario E2E nel browser (in modalità incognito, una finestra per volta):

   SCENARIO COACH:
   a. Vai su /login, entra come coach@sdf.local
   b. Crea un nuovo cliente "Mario Rossi" (mario@sdf.local) dalla UI coach
   c. Vai in Libreria Esercizi, crea un nuovo esercizio "Panca Inclinata Manubri"
   d. Crea un nuovo template "Upper Beta" con 5 esercizi (includendo quello nuovo)
   e. Assegna "Upper Beta" a Mario Rossi con data inizio oggi
   f. Logout

   SCENARIO CLIENT:
   g. Login come mario@sdf.local (imposta password se necessario via flow reset/onboarding)
   h. Vedi "Upper Beta - oggi" sulla home
   i. Apri la sessione, compila serie reali su 3 esercizi, segna RPE e una nota
   j. Chiudi la sessione
   k. Vai in Storico e vedi la sessione
   l. Logout

   VERIFICA COACH:
   m. Login come coach
   n. Vai nel dettaglio di Mario Rossi
   o. Sezione "Sessioni completate" mostra la sessione di Mario con i dati giusti
   p. Apri la sessione e vedi tutti i SetLog

3. Per ogni step da a) a p): screenshot o log esito PASS/FAIL. Se uno FAIL, NON dichiarare il beta pronto: correggi e ripeti lo scenario da capo.

4. Crea BETA_READY.md nella root con:
   - Data del test
   - Esito di ogni step
   - Credenziali di accesso per il coach beta
   - Istruzioni minime per il coach beta (mezza pagina, tono amichevole, in italiano)
   - Known limitations (moduli nascosti, no mobile, no pagamenti, beta locale)

Al termine riporta il contenuto di BETA_READY.md.
```

**Verifica manuale:** rifai tu lo scenario a-p personalmente. Se gira, **hai il beta**.

---

## Dopo il Prompt 8

Quando tutti e 8 i prompt sono verdi, hai un beta locale funzionante sul modulo Workout. Da qui si apre la fase 2 (che NON è oggetto di questo documento):

- Riaccensione graduale degli altri moduli, uno alla volta, seguendo lo stesso pattern (inventario mock → conversione → smoke test).
- Deploy su Vercel con progetto Supabase dedicato.
- Compliance GDPR seria (consensi, DPA, privacy policy).
- Stripe per i pagamenti.
- Test automatizzati Playwright.
- Sentry, rate limiting, monitoraggio costi AI.
- App mobile.

Ma una cosa alla volta. Adesso chiudi i primi 8.

---

## Cheat sheet: cosa fare tu (umano) in parallelo

Mentre Claude Code lavora sui prompt, ci sono cose che solo tu puoi fare. In ordine di urgenza:

1. **Ruota le chiavi Supabase** dalla dashboard del progetto Supabase (subito, dopo Prompt 0).
2. **Decidi se usare Supabase cloud dev o Docker locale** per il DB. Suggerimento: cloud dev dedicato, più veloce da far partire.
3. **Prepara mentalmente il coach beta** (tu stesso o chi per te) che lo userà: avvisa che è beta locale, che i dati possono essere persi, che serve consenso informale dei clienti.
4. **Tieni un diario dei bug** che trovi durante lo smoke test manuale. Ogni bug diventa un prompt correttivo mirato.

Buon lavoro.
