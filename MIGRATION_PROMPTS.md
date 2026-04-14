# Migrazione SDF → Health Service App
## Lista prompt sequenziali da incollare su Claude

**Istruzioni d'uso:** incolla un prompt alla volta, aspetta il completamento e verifica il risultato prima di passare al successivo. Non saltare step. Ogni prompt è autonomo e contiene il contesto necessario.

**Assunzioni confermate:**
- `sdf-mobile` → CONGELATO, non toccare
- Database Supabase → reset completo consentito (dati di test)
- Ruoli: `PATIENT`, `DOCTOR`, `COACH`, `ADMIN` (distinti)
- Progetto di lavoro: `salute-di-ferro/`

---

## PROMPT 0 — Setup branch e safety net

```
Stiamo iniziando la migrazione del progetto salute-di-ferro da fitness app a health service app. Prima di qualsiasi modifica:

1. Verifica che salute-di-ferro/ sia un repo git pulito (git status)
2. Crea un branch "migration/health-service" a partire dallo stato attuale
3. Crea un tag "pre-migration-snapshot" sul commit corrente di main/master come safety net
4. Mostrami il risultato

Non toccare sdf-mobile/. Lavoreremo solo dentro salute-di-ferro/.
```

---

## PROMPT 1 — Pulizia: rimozione modelli Prisma fitness

```
Siamo sul branch migration/health-service dentro salute-di-ferro/. 

Fase 1 di rimozione fitness: il database Prisma.

Modifica src/prisma/schema.prisma ed esegui queste operazioni:

RIMUOVI completamente questi modelli:
- WorkoutTemplate, WorkoutDay, WorkoutExercise, WorkoutAssignment
- WorkoutLog, WorkoutSetLog
- Exercise
- ProgressionSuggestion
- NutritionPlan, NutritionMeal, NutritionMealFood
- Food, NutritionLog, NutritionLogFood

RIMUOVI questi enum:
- WorkoutType, MuscleGroup, Equipment, Difficulty
- FoodUnit, FoodConfidence
- ProgressionAction

RIMUOVI dal model User tutte le relations verso i modelli cancellati (workoutTemplates, nutritionPlans, clientNutritionPlans, nutritionLogs, workoutLogs, ecc.).

MODIFICA l'enum UserRole: da [ADMIN, COACH, CLIENT] a [ADMIN, DOCTOR, COACH, PATIENT].

MANTIENI intatti per ora: User, Organization, CoachClient, BiometricLog, CheckIn, Appointment, MedicalReport, Notification, AiConversation, Subscription e relativi enum.

Dopo le modifiche:
1. Mostrami il diff dello schema
2. NON eseguire ancora prisma migrate — voglio rivederlo prima

Segnalami qualsiasi relation orfana o errore di riferimento.
```

---

## PROMPT 2 — Pulizia: rimozione file fitness (API, componenti, pagine)

```
Continuiamo la migrazione. Lo schema Prisma è già pulito.

Ora rimuovi tutti i file fitness/nutrition dal codice. Usa git rm per tracciare la rimozione.

API ROUTES da cancellare (cartelle intere):
- src/app/api/workouts/
- src/app/api/exercises/
- src/app/api/client/workout/
- src/app/api/nutrition/
- src/app/api/nutrition-logs/
- src/app/api/foods/
- src/app/api/coach/progression-suggestions/
- src/app/api/coach/clients/[id]/progression/
- src/app/api/ai/generate-program/
- src/app/api/ai/regenerate-day/
- src/app/api/ai/adjust-program/
- src/app/api/ai/analyze-food-photo/
- src/app/api/ai/analyze-checkin/ (lo rifaremo diverso)

PAGINE da cancellare:
- src/app/dashboard/coach/workouts/
- src/app/dashboard/coach/exercises/
- src/app/dashboard/coach/nutrition/
- src/app/dashboard/client/workout/
- src/app/dashboard/client/nutrition/

COMPONENTI da cancellare:
- src/components/workout/ (intera cartella)
- src/components/nutrition/ (intera cartella)
- src/components/coach/progression-suggestions.tsx
- src/components/coach/one-rm-chart.tsx
- src/components/coach/adherence-list.tsx

LIB da cancellare:
- src/lib/services/progression.ts
- src/lib/services/adherence.ts
- src/lib/ai/program-generator.ts
- src/lib/data/exercises-seed.ts
- src/lib/data/foods.ts
- src/lib/validators/workout.ts
- src/lib/validators/exercise.ts
- src/lib/validators/nutrition.ts
- src/lib/validators/nutrition-log.ts
- src/lib/validators/ai-program.ts
- src/lib/stores/exercise-filters.ts
- src/lib/hooks/use-exercises.ts
- src/lib/hooks/use-nutrition-logs.ts
- src/lib/mock-workouts.ts
- src/lib/mock-nutrition.ts
- src/lib/mock-client-workout.ts

Dopo la cancellazione:
1. Esegui `npx tsc --noEmit` e mostrami TUTTI gli errori di import rotti
2. NON riparare ancora gli import — mi serve la lista completa per decidere cosa sistemare e cosa eliminare ulteriormente
```

---

## PROMPT 3 — Ripara import rotti ed elimina riferimenti residui

```
Ho visto la lista di errori del tsc. Ora ripariamoli.

Strategia:
- Se un file importa qualcosa di fitness ed è UN COMPONENTE/PAGINA di navigazione (layout, nav-items, dashboard page), rimuovi l'import e l'elemento UI corrispondente
- Se un file importa qualcosa di fitness ed è un file che serve solo per quel flusso (es. una sotto-pagina), cancellalo
- Aggiorna src/lib/nav-items.ts rimuovendo tutte le voci menù workout/exercises/nutrition
- Aggiorna src/app/dashboard/coach/layout.tsx e src/app/dashboard/client/layout.tsx (sidebar) per rimuovere link morti
- Aggiorna src/app/dashboard/coach/page.tsx e src/app/dashboard/client/page.tsx (dashboard home) rimuovendo widget/card legati al fitness — lasciali temporaneamente vuoti o con un placeholder "Coming soon"
- Rimuovi src/lib/mock-client-dashboard.ts se referenzia workout/nutrition (o pulisci la parte fitness)

Obiettivo: `npx tsc --noEmit` deve passare pulito, `npm run build` deve compilare.

Quando hai finito:
1. Mostrami l'output di tsc (deve essere clean)
2. Mostrami l'elenco dei file modificati/cancellati
3. Fai commit con messaggio: "chore: remove fitness/nutrition legacy code"
```

---

## PROMPT 4 — Nuovo schema Prisma health service

```
Codebase ora pulito. Ora costruiamo il nuovo schema health-service.

Modifica src/prisma/schema.prisma aggiungendo/modificando questi modelli. Segui esattamente questa spec:

1. MODEL `User` (modifica esistente):
   - Conferma campi: id, email, firstName, lastName, sex, birthDate, heightCm, phone, avatarUrl, role (UserRole), organizationId, onboardingCompleted, createdAt, updatedAt
   - RIMUOVI i campi fitness-only se residui: primaryGoal, fitnessLevel, weeklyActivityHours
   - MANTIENI: medicalConditions, allergies, medications, injuries (utili in ambito clinico)
   - Aggiungi: taxCode (codice fiscale, String?, unique opzionale), emergencyContact (String?)

2. RINOMINA model `CoachClient` → `CareRelationship`:
   - Campi: id, professionalId (era coachId), patientId (era clientId), professionalRole (enum: DOCTOR | COACH), status, startDate, endDate, notes, createdAt, updatedAt
   - Unique: (professionalId, patientId, professionalRole)
   - RIMUOVI campi fitness: checkInFrequency, nextCheckInAt, lastCheckInAt, checkInReminderStage, lastLowAdherenceAlertAt, lastInactivityNudgeAt
   - Aggiorna le relations nel model User di conseguenza (professionalRelations, patientRelations)

3. MODEL `BiometricLog` → rinomina campo e mantieni tutto il resto:
   - Aggiungi `bmi Float?` (salvato calcolato dal server, non più runtime)
   - Tutti gli altri campi restano IDENTICI (sono già perfetti)
   - Rinomina relation da client→patient

4. MODEL `MedicalReport` → potenzia:
   - Campi esistenti: id, patientId (era clientId), uploadedById, fileUrl, fileName, mimeType, fileSize, title, notes, issuedAt, uploadedAt
   - Modifica enum MedicalReportCategory: [BLOOD_TEST, IMAGING, CARDIOLOGY, ENDOCRINOLOGY, GENERAL_VISIT, PRESCRIPTION, VACCINATION, SURGERY, OTHER]
   - RIMUOVI visibleToCoach (bool) e sostituisci con ReportPermission separato (vedi punto 5)

5. NUOVO MODEL `ReportPermission` (GDPR Art. 9 — permessi granulari):
   - id, reportId, granteeId (User che riceve il permesso), grantedAt, expiresAt (opzionale), revokedAt
   - Unique: (reportId, granteeId)
   - Relation: report (MedicalReport), grantee (User)

6. MODEL `Appointment` → aggiorna:
   - Campi: id, professionalId, patientId, professionalRole (DOCTOR|COACH), startTime, endTime, type, status, notes, meetingUrl, createdAt, updatedAt
   - Enum AppointmentType: [IN_PERSON, VIDEO_CALL, VISIT, FOLLOW_UP, COACHING_SESSION]
   - Enum AppointmentStatus: invariato
   - Relation: professional (User), patient (User)

7. NUOVO MODEL `AvailabilitySlot` (disponibilità medico/coach):
   - id, professionalId, dayOfWeek (0-6) o date (DateTime), startTime, endTime, isRecurring (bool)
   - Relation: professional (User)

8. MANTIENI IDENTICI: Organization, Notification, AiConversation, Subscription, CheckIn

9. Enum `UserRole`: [ADMIN, DOCTOR, COACH, PATIENT]
10. NUOVO Enum `ProfessionalRole`: [DOCTOR, COACH]

Consegna:
1. Scrivi lo schema completo
2. Mostrami il diff rispetto alla versione attuale
3. NON eseguire migrate ancora
```

---

## PROMPT 5 — Reset database e prima migration

```
Schema validato. Ora eseguiamo il reset completo del database Supabase e la prima migration pulita.

1. Verifica le env vars in .env / .env.local (DATABASE_URL, DIRECT_URL, Supabase keys) — mostrale mascherate
2. Esegui `npx prisma migrate reset --force` (cancella tutto e ricrea)
3. Crea la prima migration: `npx prisma migrate dev --name init_health_service`
4. Esegui `npx prisma generate`
5. Crea un nuovo src/prisma/seed.ts che popoli:
   - 1 Organization di test ("Salute di Ferro Clinic")
   - 1 ADMIN
   - 2 DOCTOR (con dati anagrafici finti)
   - 2 COACH
   - 5 PATIENT (con CareRelationship verso 1 doctor + 1 coach ciascuno)
   - 2-3 BiometricLog per paziente (dati realistici)
   - 1-2 MedicalReport per paziente (fileUrl placeholder)
   - Qualche Appointment futuro e passato
6. Esegui il seed
7. Mostrami un `prisma studio` snapshot dei conteggi per tabella

IMPORTANTE: non usare "coach" o "client" nei nomi di variabili nel seed — usa "doctor", "coach", "patient" per coerenza con il nuovo dominio.
```

---

## PROMPT 6 — Auth e middleware per 4 ruoli

```
DB pronto e seeded. Ora aggiorniamo il sistema di auth per gestire 4 ruoli: ADMIN, DOCTOR, COACH, PATIENT.

1. Aggiorna src/middleware.ts:
   - Route protection:
     * /dashboard/admin → ADMIN
     * /dashboard/doctor → DOCTOR
     * /dashboard/coach → COACH
     * /dashboard/patient → PATIENT
   - Redirect post-login in base al ruolo letto da app_metadata.role
   - Mantieni il DEV BYPASS ma aggiornalo con un ?role=doctor|coach|patient|admin in querystring per testare i 4 flussi in dev

2. Aggiorna src/lib/hooks/use-user.ts per esporre `role` tipizzato come UserRole enum

3. Crea src/lib/auth/require-role.ts: helper da usare nelle API route e nei server components:
   ```
   requireRole(req, allowedRoles: UserRole[]) → User o throw 403
   ```

4. Aggiorna src/app/api/auth/register/route.ts:
   - Accetta {email, password, firstName, lastName, sex, birthDate, role}
   - Solo ADMIN può creare DOCTOR/COACH (controllo server-side)
   - La registrazione pubblica crea solo PATIENT
   - Scrive il role in Supabase app_metadata via admin client
   - Crea la row User nel DB Prisma

5. Aggiorna src/lib/validators/auth.ts con gli schemi Zod corrispondenti

6. Testa con `npm run build` e correggi errori

Mostrami middleware + require-role + register route finali.
```

---

## PROMPT 7 — Struttura dashboard per i 4 ruoli

```
Auth aggiornata. Ora creiamo gli scheletri delle 4 aree dashboard.

Rinomina / crea:
- src/app/dashboard/coach/ → resta (ma con nuovo scope coaching salute, non fitness)
- src/app/dashboard/client/ → RINOMINA in src/app/dashboard/patient/
- src/app/dashboard/doctor/ → CREA EX-NOVO
- src/app/dashboard/admin/ → CREA EX-NOVO (o riutilizza se esiste)

Per ciascuna area crea/aggiorna:
1. layout.tsx con sidebar dedicata (riusa src/components/layout/*)
2. page.tsx (home dashboard) con placeholder delle sezioni che implementeremo

Aggiorna src/lib/nav-items.ts con 4 menu distinti:

**PATIENT menu:**
- Dashboard (/dashboard/patient)
- Profilo (/dashboard/patient/profile)
- Dati Salute (/dashboard/patient/health) — sottosezioni: Corporei, Circonferenze, Cardiovascolare, Metabolica, Sonno, Attività
- Cartella Clinica (/dashboard/patient/medical-records)
- Appuntamenti (/dashboard/patient/appointments)
- Notifiche (/dashboard/patient/notifications)

**DOCTOR menu:**
- Dashboard (/dashboard/doctor)
- I miei pazienti (/dashboard/doctor/patients)
- Referti (/dashboard/doctor/reports)
- Calendario (/dashboard/doctor/calendar)
- Disponibilità (/dashboard/doctor/availability)

**COACH menu:**
- Dashboard (/dashboard/coach)
- I miei assistiti (/dashboard/coach/patients)
- Monitoraggio (/dashboard/coach/monitoring)
- Calendario (/dashboard/coach/calendar)
- Disponibilità (/dashboard/coach/availability)

**ADMIN menu:**
- Dashboard (/dashboard/admin)
- Utenti (/dashboard/admin/users)
- Organizzazioni (/dashboard/admin/organizations)
- Audit log (/dashboard/admin/audit)

Tutte le pagine nuove: solo scaffold con titolo e "In costruzione". Nessuna logica ancora.

Fai passare `npm run build` e committa: "feat: scaffold 4-role dashboards".
```

---

## PROMPT 8 — Modulo A: Autenticazione e Profilo

```
Dashboard scaffold pronto. Ora implementiamo il Modulo A: Autenticazione & Profilo.

Obiettivi:
1. Pagina /register pubblica (solo PATIENT)
2. Pagina /login con redirect in base al ruolo
3. Pagina profilo per ogni ruolo: /dashboard/{role}/profile
   - Visualizza e modifica: firstName, lastName, sex, birthDate, heightCm, phone, taxCode, emergencyContact, avatarUrl
   - Per PATIENT: anche medicalConditions, allergies, medications, injuries (textarea)
   - Upload avatar su Supabase Storage (bucket "avatars")
4. API:
   - GET /api/me → profilo corrente (esiste già? adatta)
   - PATCH /api/me → aggiorna campi del profilo (usa Zod validator src/lib/validators/profile.ts — aggiornalo)
5. Form: react-hook-form + Zod, componenti shadcn/ui esistenti
6. Test manuale: registra un patient, fai login, modifica profilo, verifica DB con prisma studio

Riusa TUTTO quello che c'è già: supabase SSR, middleware, hooks, UI components.

Consegna: diff, lista file toccati, screenshot mentale del flusso. Committa: "feat: auth + profile module".
```

---

## PROMPT 9 — Modulo B: Monitoraggio Salute (dati biometrici)

```
Modulo A fatto. Modulo B: Monitoraggio Salute.

Il modello BiometricLog è già nel DB con TUTTI i campi necessari. Ora costruiamo UI + API.

1. API:
   - POST /api/biometrics → crea log (PATIENT only sui propri dati)
   - GET /api/biometrics → lista paginata (paziente vede i suoi; doctor/coach vedono quelli dei loro pazienti via CareRelationship)
   - GET /api/biometrics/[id] → dettaglio
   - PATCH/DELETE /api/biometrics/[id] → solo il paziente owner
   - GET /api/biometrics/summary?patientId=... → trend ultimi 30/90/365 giorni
   - Calcola BMI server-side su POST/PATCH usando weight + user.heightCm

2. Validator src/lib/validators/biometric.ts — un unico schema Zod con TUTTI i campi divisi in oggetti annidati:
   body, circumferences, cardiovascular, metabolic, sleep, activity
   Tutti i campi opzionali (il paziente compila quelli che vuole).

3. Pagine PATIENT:
   /dashboard/patient/health → tab per le 6 categorie (shadcn Tabs)
     - Ogni tab: form di inserimento + lista storica + grafico recharts
     - Dati Corporei: data, altezza (readonly da profilo), peso, BF%, MM, BMI (calc), acqua%
     - Circonferenze: vita, fianchi, petto, braccia, coscia, polpacci
     - Cardiovascolare: PA sist/diast, FC riposo, SpO2, HRV
     - Metabolica: glicemia dig/post, chetoni, temperatura
     - Sonno: ore, qualità 1-10, bedtime, waketime, risvegli
     - Attività: passi, kcal, minuti, km

4. Pagine DOCTOR/COACH:
   /dashboard/doctor/patients/[id]/health e /dashboard/coach/patients/[id]/health
   → stessa vista ma READ-ONLY con filtri data e export CSV

5. Componenti:
   - src/components/health/metric-form.tsx (generico, config-driven)
   - src/components/health/metric-chart.tsx (recharts line)
   - src/components/health/metric-card.tsx (ultimo valore + trend)
   - Riusa src/components/biometrics/metric-card.tsx se ancora presente

6. Hook: src/lib/hooks/use-biometrics.ts con React Query

Testa con il patient del seed. Committa: "feat: health monitoring module".
```

---

## PROMPT 10 — Modulo C: Cartella Clinica & Referti

```
Modulo B fatto. Modulo C: Cartella Clinica.

1. Setup Supabase Storage:
   - Bucket "medical-reports" privato
   - Policy: solo owner (patientId) + grantees attivi possono leggere
   - Path pattern: {patientId}/{uuid}.{ext}

2. API:
   - POST /api/medical-reports → upload (multipart) + crea MedicalReport row
     * Input: file (PDF/JPG/PNG, max 20MB), category, title, notes, issuedAt
     * Solo PATIENT può caricare SUI PROPRI dati, o DOCTOR può caricare per un paziente di cui ha CareRelationship attiva
   - GET /api/medical-reports → lista (patient vede i suoi; doctor vede i propri pazienti + quelli con permesso)
   - GET /api/medical-reports/[id] → signed URL del file (15 min)
   - DELETE /api/medical-reports/[id] → solo uploader o patient owner
   - POST /api/medical-reports/[id]/permissions → grant a un grantee (doctor/coach)
   - DELETE /api/medical-reports/[id]/permissions/[granteeId] → revoca
   - GET /api/medical-reports/[id]/permissions → lista permessi attivi

3. Validator src/lib/validators/medical-report.ts

4. Pagine PATIENT /dashboard/patient/medical-records:
   - Lista referti con filtri per categoria e data
   - Upload (drag&drop, preview)
   - Per ogni referto: view/download, gestione permessi (toggle visibilità per doctor/coach collegati via CareRelationship)
   - Componente permessi con lista grantees + revoke

5. Pagine DOCTOR /dashboard/doctor/patients/[id]/reports:
   - Vista referti del paziente (solo quelli con permesso attivo)
   - Upload referto a nome del paziente (auto-permission self)
   - Filtri categoria/data

6. Componenti:
   - src/components/medical-records/report-upload.tsx
   - src/components/medical-records/report-list.tsx
   - src/components/medical-records/report-viewer.tsx (PDF inline via <iframe signed-url>, immagini <img>)
   - src/components/medical-records/permission-manager.tsx

7. GDPR Art. 9:
   - Log di ogni accesso a referto (crea model AuditLog se utile, o nota testuale)
   - Sempre passare da signed URL, MAI fileUrl pubblico
   - Eliminazione hard sul bucket quando il paziente cancella

Testa: patient carica referto, concede permesso a doctor, doctor lo vede, patient revoca, doctor non lo vede più. Committa: "feat: medical records module with granular permissions".
```

---

## PROMPT 11 — Modulo D: Calendario Appuntamenti

```
Modulo C fatto. Ultimo modulo del core: Calendario.

1. API:
   - GET /api/appointments → filtrati per ruolo (patient vede i suoi; doctor/coach i propri)
   - POST /api/appointments → crea (patient prenota; doctor/coach possono creare manualmente)
   - PATCH /api/appointments/[id] → reschedule o update status
   - DELETE /api/appointments/[id] → cancel (soft: status=CANCELED)
   - GET /api/availability?professionalId=X&from=Y&to=Z → slot liberi calcolati da AvailabilitySlot - Appointment esistenti
   - POST /api/availability → DOCTOR/COACH crea slot (ricorrenti o una tantum)
   - DELETE /api/availability/[id]

2. Validators: src/lib/validators/appointment.ts, src/lib/validators/availability.ts

3. Pagine:
   **PATIENT /dashboard/patient/appointments:**
   - Vista calendario (mese/settimana) con i propri appuntamenti
   - Bottone "Prenota" → seleziona tipo (doctor/coach) → seleziona professional (dalla CareRelationship) → vede slot liberi → conferma
   - Lista prossimi appuntamenti + storico

   **DOCTOR /dashboard/doctor/calendar:**
   - Calendario agenda (giorno/settimana)
   - Click slot libero → crea appuntamento manualmente (seleziona paziente)
   - Click appuntamento → dettaglio + update status (COMPLETED, NO_SHOW)

   **DOCTOR /dashboard/doctor/availability:**
   - Gestione slot ricorrenti (es. Lun 9-12, Mar 14-18) + eccezioni

   **COACH /dashboard/coach/calendar e /availability:** stesse pagine del doctor

4. Componenti:
   - src/components/calendar/calendar-view.tsx (riusa o ricrea; può usare una lib tipo react-big-calendar oppure custom grid con Tailwind)
   - src/components/calendar/appointment-form.tsx (esiste già, adattalo)
   - src/components/calendar/availability-editor.tsx
   - src/components/calendar/slot-picker.tsx

5. Conflict check server-side: quando si crea un Appointment, verifica che non sovrapponga altri appuntamenti dello stesso professional.

6. Notifiche: alla creazione/reschedule/cancel, crea una Notification per patient e professional.

Testa full flow: patient prenota, doctor vede in agenda, doctor marca completed. Committa: "feat: appointments and calendar module".
```

---

## PROMPT 12 — Hardening: sicurezza, GDPR, audit, seed finale

```
I 4 moduli core sono pronti. Ora facciamo hardening prima di considerare la migrazione "completa".

1. Row-level authorization review:
   Per OGNI API route sotto src/app/api/, verifica:
   - C'è require-role check?
   - C'è ownership check (paziente può toccare solo i suoi dati)?
   - Doctor/Coach possono accedere solo ai pazienti con CareRelationship attiva?
   Genera un report: tabella route | metodo | ruoli permessi | ownership check presente? | note

2. Crea model AuditLog in schema.prisma:
   - id, actorId, action (String), entityType, entityId, metadata (Json), ipAddress, userAgent, createdAt
   - Migra e genera.
   Scrivi src/lib/audit.ts con helper `logAudit(...)` e chiamalo nelle API sensibili: upload/view referto, cambio permessi, update profilo, login-as-admin.

3. Rate limiting base:
   - Aggiungi src/lib/rate-limit.ts (in-memory per dev, nota per redis in prod)
   - Applica a /api/auth/register, /api/auth/login, /api/medical-reports (POST)

4. GDPR endpoint paziente:
   - GET /api/me/export → JSON completo dei propri dati (profilo + biometrics + reports + appointments)
   - DELETE /api/me → soft delete + schedule hard delete 30gg, revoca tutte le CareRelationship, elimina file bucket

5. Aggiorna seed con dati più ricchi e coerenti col nuovo schema

6. README.md: scrivi una nuova sezione "Health Service Architecture" con:
   - Ruoli e permessi
   - Flussi principali
   - Schema DB diagram (mermaid)
   - Env vars richieste
   - Come avviare in locale

7. `npm run build` deve passare pulito. `npx tsc --noEmit` clean.

Commit finale: "feat: hardening, audit log, GDPR endpoints". Mergia migration/health-service in main dopo review.
```

---

## PROMPT 13 — (opzionale) Riattivazione AI chat come assistente salute

```
Base solida. Vuoi riattivare la AI chat come "Assistente Salute"?

1. Mantieni src/app/api/ai/chat/route.ts ma cambia il system prompt: ora è un assistente informativo (NON diagnosi) che risponde su interpretazione base di dati biometrici, spiegazione termini medici, suggerimenti lifestyle generici, con disclaimer forte "non sostituisce il parere medico".
2. Rimuovi context "WORKOUT" dall'enum AiContext. Nuovo enum: [GENERAL, HEALTH_DATA, REPORT_EXPLANATION]
3. UI widget /dashboard/patient con chat floating
4. Escalation a doctor via /api/ai/escalate (crea Notification per doctor)
5. Log conversazioni in AiConversation (già presente)
6. IMPORTANTE: filtra risposte che suonano come diagnosi, aggiungi sempre footer disclaimer

Committa: "feat: health AI assistant".
```

---

## Checkpoint finali di validazione

Dopo ogni prompt controlla:
- `npm run build` passa
- `npx tsc --noEmit` clean
- `npx prisma validate` ok
- Git status pulito, commit descrittivi
- Il browser apre le 4 dashboard senza errori console

Se qualcosa rompe, NON passare al prompt successivo: chiedi a Claude di diagnosticare e fixare prima.
