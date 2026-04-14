# PROMPT 2.1 — LIBRERIA ESERCIZI COMPLETA
## Versione Adattata al Progetto SDF

---

## ISTRUZIONI PRELIMINARI

**Leggi prima di incollare in Claude Code:**

1. Questo progetto usa `src/app/dashboard/` (senza route groups con parentesi)
2. Prisma schema va migrato per aggiungere i campi di Exercise che mancano
3. I componenti vanno creati sotto `src/components/workout/` (non una folder separata)
4. I mock data vanno integrati in `src/lib/mock-workouts.ts`, non sostituiti
5. Usa il type system TypeScript esistente (MuscleGroup, Equipment)

---

## PROMPT PER CLAUDE CODE

```
🟢 PROMPT PER CLAUDE CODE — 2.1:

Implementa la libreria esercizi completa per la dashboard coach. Segui l'ordine esatto:

## FASE 1: SCHEMA DATABASE

1. Aggiorna il modello Exercise in prisma/schema.prisma:
   - Aggiungi campi: nameIt (String), description (String), secondaryMuscles (String array/JSON), 
     tips (String array/JSON), commonMistakes (String array/JSON), variants (String array/JSON), 
     steps (String array/JSON per istruzioni step-by-step)
   - Mantieni: id, name, slug, muscleGroup, equipment, videoUrl, thumbnailUrl, instructions, organizationId, isGlobal, createdAt
   - I campi array vanno salvati come JSON nel DB

2. Crea e applica la migration Prisma per questi campi

3. Aggiorna il type TypeScript ExerciseLibraryItem in src/lib/mock-workouts.ts:
   ```typescript
   export type ExerciseLibraryItem = {
     id: string;
     name: string;
     nameIt: string;
     muscleGroup: MuscleGroup;
     secondaryMuscles?: MuscleGroup[];
     equipment: Equipment;
     description?: string;
     steps?: string[];
     tips?: string[];
     commonMistakes?: string[];
     variants?: string[];
     videoUrl?: string;
     thumbnailUrl?: string | null;
   };
   ```

---

## FASE 2: SEED DATA ESERCIZI

1. Crea src/lib/data/exercises-seed.ts con 80+ esercizi organizzati per muscolo:

   PETTO (10): Bench Press, Incline Dumbbell Press, Dip (Chest), Cable Fly, Decline Press, 
               Push-up, Machine Chest Press, Pec Deck, Landmine Press, Smith Machine Bench Press
   
   SCHIENA (10): Lat Pulldown, Barbell Row, Deadlift, Pull-up, T-Bar Row, Pendulum Row, 
                 Chest Supported Row, Machine Row, Seal Row, Inverted Row
   
   SPALLE (8): Military Press, Lateral Raise, Face Pull, Reverse Pec Deck, Machine Shoulder Press, 
               Dumbbell Shoulder Press, Pike Push-up, Cable Lateral Raise
   
   BICIPITI (6): Barbell Curl, Dumbbell Curl, Hammer Curl, EZ-Bar Curl, Machine Curl, Cable Curl
   
   TRICIPITI (6): Triceps Pushdown, French Press, Dip (Triceps), Rope Pushdown, Overhead Extension, 
                  Kickback
   
   QUADRICIPITI (8): Back Squat, Leg Press, Leg Extension, Bulgarian Split Squat, Hack Squat, 
                     Smith Machine Squat, V-Squat, Belt Squat
   
   FEMORALI (6): Romanian Deadlift, Leg Curl, Stiff Leg Deadlift, Nordics, Machine Hamstring Curl, 
                 Good Mornings
   
   GLUTEI (6): Hip Thrust, Glute Bridge, Cable Kickback, Smith Machine Hip Thrust, 
                Sumo Deadlift, Pendulum Squat
   
   POLPACCI (4): Calf Raise Standing, Seated Calf Raise, Smith Machine Calf Raise, Donkey Calf Raise
   
   ADDOMINALI (8): Crunch, Plank, Leg Raise, Cable Crunch, Ab Wheel, Decline Sit-up, 
                   Machine Abs, Pallof Press
   
   CARDIO (6): Treadmill, Stationary Bike, Rowing Machine, StairMaster, Elliptical, Battle Ropes

   STRUTTURA di ogni esercizio:
   {
     id: "ex-XXX",
     name: "Exercise Name (English)",
     nameIt: "Nome Italiano",
     muscleGroup: "RELEVANT_MUSCLE_GROUP",
     secondaryMuscles?: ["MUSCLE1", "MUSCLE2"],
     equipment: "RELEVANT_EQUIPMENT",
     description: "Descrizione dettagliata dell'esercizio...",
     steps: [
       "Posizionamento iniziale...",
       "Fase di spinta/trazione...",
       "Fase di ritorno...",
       "Respirazione e controllo..."
     ],
     tips: [
       "Consiglio tecnico 1",
       "Consiglio tecnico 2",
       "Forma corretta..."
     ],
     commonMistakes: [
       "Errore comune 1",
       "Errore comune 2",
       "Non fare..."
     ],
     variants: [
       "Variante 1 (es. con manubri invece che bilanciere)",
       "Variante 2 (es. a una mano)"
     ],
     thumbnailUrl: null,
     videoUrl: null
   }

   ### LINEE GUIDA PER GENERAZIONE TESTI ITALIANI

   Genererai i contenuti di description/steps/tips/commonMistakes/variants in italiano completo.
   
   **CRITERI DI QUALITÀ:**
   
   **description** (1 paragrafo, 150-200 parole):
   - Spiega l'esercizio in italiano chiaro, tecnico ma accessibile
   - Includi: gruppo muscolare primario, secondari, attrezzatura richiesta
   - Esempio: "La panca piana è l'esercizio fondamentale per lo sviluppo della muscolatura pettorale. 
     Sollecita principalmente petto, spalle anteriori e tricipiti. È un movimento composto che permette 
     di sollevare carichi significativi, rendendolo ideale per la costruzione di forza e massa muscolare."

   **steps** (3-5 step, ognuno 1-2 frasi):
   - Posizionamento: descrivi la postura iniziale (piedi, schiena, presa)
   - Fase concentrica (sforzo): movimento di spinta/trazione
   - Fase eccentrica (ritorno): controllo e rallentamento
   - Respirazione: quando inspirare/espirare
   - Esempio per Bench Press:
     1. "Sdraiati sulla panca con schiena aderente, piedi a terra, scapole retratte."
     2. "Afferra il bilanciere alla larghezza delle spalle, scendi controllato fino al petto."
     3. "Spingi con forza esercitando il controllo, ritorna alla posizione iniziale."
     4. "Inspira durante la discesa, espira durante la spinta."

   **tips** (3-4 consigli, ognuno massimo 1-2 frasi):
   - Consigli tecnici per massimizzare l'esercizio
   - Focus su forma corretta, efficienza, sicurezza
   - Esempio:
     - "Mantieni le scapole retratte durante tutto il movimento per proteggere le spalle."
     - "Usa un range di movimento completo dalla spalla al petto, non mezza ripetizione."
     - "Se sei principiante, inizia con il bilanciere (20kg) senza aggiungere pesi."

   **commonMistakes** (3-4 errori, ognuno 1 frase):
   - Errori di forma che riducono efficacia o causano infortuni
   - Sii specifico e correttivo
   - Esempio:
     - "Scapole non retratte: il petto rimane inattivo, il carico va alle spalle."
     - "Gomiti troppo larghi: aumenta lo stress articolare senza maggior efficienza."
     - "Sollevare i piedi da terra: perdi stabilità e trasferisci male il carico."

   **variants** (2-4 varianti, ognuna 1 frase):
   - Variazioni dell'esercizio per adattarsi a livelli/attrezzature
   - Includi: con diversi attrezzi, unilaterale, su macchina, bodyweight
   - Esempio:
     - "Incline Press: aumenta l'isolamento dei fasci superiori del petto."
     - "Dumbbell Bench Press: richiede più stabilità e lavoro dei stabilizzatori."
     - "Push-up: variante a corpo libero per principianti o allenamento in casa."

   ### IMPORTANTE PER CLAUDE CODE:
   
   Usa il tuo ragionamento per generare questi testi, ma rispetta rigorosamente:
   - Italiano chiaro e tecnico (non semplicistico, non eccessivamente complesso)
   - Struttura: 3-5 steps, 3-4 tips, 3-4 commonMistakes, 2-4 variants
   - Coerenza: ogni testo deve riflettere le caratteristiche reali dell'esercizio
   - Varietà: non copiare lo stesso testo per esercizi simili; differenzia per attrezzatura/modalità
   - Se un esercizio è simile a uno precedente, menziona la relazione ("Come il Bench Press ma...") nei tips

   Procedi con i 80 esercizi in sequenza, categoria per categoria.

2. Integra questi esercizi nel LIBRARY array in src/lib/mock-workouts.ts 
   (non sostituire, aggiungere ai 16 esistenti)

3. Aggiorna la funzione getExerciseLibrary() per gestire il nuovo type

---

## FASE 3: PAGINA LIBRERIA (src/app/dashboard/coach/exercises/page.tsx)

Crea una pagina completa con:

1. LAYOUT PRINCIPALE:
   - Sidebar sinistra con filtri
   - Main area con griglia/lista esercizi

2. FILTRI SIDEBAR (src/components/workout/exercise-filters.tsx):
   - Search testo (input con debounce)
   - Filtro gruppo muscolare: dropdown multiselect (con "Tutti")
   - Filtro attrezzatura: dropdown multiselect (con "Tutte")
   - Bottone "Reset Filtri"

3. TOOLBAR PRINCIPALE:
   - Toggle vista griglia/lista (icone Grid e List di lucide-react)
   - Bottone "Aggiungi Esercizio Custom" (apre modal/dialog)
   - Mostri: "XX esercizi trovati"

4. GRID VIEW (src/components/workout/exercise-card.tsx):
   - Card per ogni esercizio con:
     * Thumbnail (placeholder con icona dumbbell se assente)
     * Nome esercizio
     * Muscolo primario (badge)
     * Attrezzatura (badge)
     * Bottone "Dettagli" → apre modal
   - Grid responsivo (2-3-4 colonne a seconda dello schermo)

5. LIST VIEW:
   - Tabella con colonne: Nome, Muscolo, Attrezzatura, Azioni
   - Riga cliccabile → apre modal dettagli

6. PAGINAZIONE:
   - Mostra 20 esercizi per pagina
   - Bottoni Prev/Next oppure numerati

---

## FASE 4: DETTAGLIO ESERCIZIO (Modal/src/components/workout/exercise-detail-modal.tsx)

Modal che mostra:

1. HEADER:
   - Nome esercizio (IT + EN)
   - Muscolo primario + secondari (badges)
   - Attrezzatura (badge)
   - Bottone close

2. VIDEO PLAYER:
   - <video> nativo con poster (placeholder se assente)
   - Controlli standard (play, volume, fullscreen)
   - Se videoUrl null, mostra: "Video non disponibile"

3. SEZIONI CONTENUTO (tabs o scroll):
   - **Descrizione**: testo della description
   - **Istruzioni**: lista numerata dei steps
   - **Tips**: lista puntata di consigli
   - **Errori Comuni**: lista puntata di errori
   - **Varianti**: lista di varianti suggerite

4. ACTION BUTTONS:
   - Bottone "Aggiungi a Workout" (apre select di workout a cui aggiungere)
   - Bottone "Modifica" (se esercizio custom dell'utente)
   - Bottone "Elimina" (solo per custom, con conferma)

---

## FASE 5: FORM CREAZIONE ESERCIZIO CUSTOM (src/components/workout/create-exercise-form.tsx)

Dialog con form per aggiungere esercizio custom:

1. CAMPI FORM:
   - Nome: text input (required)
   - Nome Italiano: text input (required)
   - Descrizione: textarea
   - Gruppo muscolare: select (required)
   - Muscoli secondari: multiselect (optional)
   - Attrezzatura: select (required)
   - Istruzioni: textarea (markdown-friendly, mostra live preview)
   - Tips: array di input (add/remove buttons)
   - Errori comuni: array di input (add/remove buttons)
   - Varianti: array di input (add/remove buttons)

2. UPLOAD MEDIA:
   - Upload video: input file (accetta .mp4, .webm, max 100MB)
   - Upload thumbnail: input file (immagini, max 5MB)
   - Mostra preview thumbnail se caricata

3. VISIBILITÀ:
   - Radio buttons: "Solo mio" (private), "Team" (organization), "Globale" (global)
   - Default: "Solo mio"

4. ACTIONS:
   - Bottone "Salva Esercizio": POST /api/exercises + upload file a Supabase Storage
   - Bottone "Annulla": chiude dialog
   - Validazione lato client con Zod

---

## FASE 6: API ROUTES

### GET /api/exercises
Query params: q (search), muscleGroup, equipment, page (default 1), limit (default 20)
Response: { exercises: ExerciseLibraryItem[], total: number, page: number }
Filtri fulltex su name + description, muscleGroup e equipment esatti

### POST /api/exercises
Body: ExerciseLibraryItem (senza id, che è generato)
- Crea record in DB
- Se uploadati file video/thumbnail, carica su Supabase Storage (bucket "exercise-videos")
- Aggiorna videoUrl e thumbnailUrl nel record
- Response: { success: boolean, exercise: ExerciseLibraryItem, error?: string }
- Auth required (solo coach/admin)

### GET /api/exercises/[id]
Response: ExerciseLibraryItem completo
Errore 404 se non trovato

### PUT /api/exercises/[id]
Body: Partial<ExerciseLibraryItem> (aggiorna solo campi inviati)
- Validazione ownership (solo chi lo creò o admin)
- Gestisce re-upload file se inviati nuovi
- Response: ExerciseLibraryItem aggiornato

### DELETE /api/exercises/[id]
- Validazione ownership
- Elimina il record (e file da Storage)
- Response: { success: boolean }

---

## FASE 7: INTEGRAZIONI

1. Aggiorna il file src/lib/mock-workouts.ts per esporre una funzione che torna 
   il seed data come ExerciseLibraryItem[]

2. Crea un hook custom (src/lib/hooks/use-exercises.ts):
   - useExercises(filters): query exercises con filtri, paginazione, search
   - useCreateExercise(): mutazione POST
   - useUpdateExercise(): mutazione PUT
   - useDeleteExercise(): mutazione DELETE

3. Usa React Query per caching e sincronizzazione

---

## CHECKLIST FINALE

- [ ] Migration Prisma applicata e schema aggiornato
- [ ] 80+ esercizi nel seed data con campi completi
- [ ] Pagina exercises con grid/list view, filtri, paginazione
- [ ] Modal dettaglio con video player e tabs contenuto
- [ ] Form creazione con validazione Zod
- [ ] API CRUD completa e testabile via curl
- [ ] Upload file a Supabase Storage funzionante
- [ ] Hooks React Query per gestire lo state
- [ ] Responsive design (mobile-first)
- [ ] Messaggi errore chiari via toast (Sonner)
```

---

## SPECIFICHE TECNICHE FINALI

**Supabase Storage — Upload Client-Side:**

1. **Bucket "exercise-videos":** 
   - Se non esiste, crealo manualmente in Supabase Dashboard (Storage → Create New Bucket)
   - Visibility: PUBLIC (leggi libre, upload protetto da RLS/auth)
   - Path upload: `/organization/{organizationId}/exercises/{exerciseId}/{type}/{filename}`
     Esempio: `/organization/org-123/exercises/ex-456/video/bench-press.mp4`

2. **Upload Strategy (NO Next.js route handler):**
   - Nel form (create-exercise-form.tsx), importa Supabase client: `import { createClient } from "@/lib/supabase/client"`
   - Usa `supabase.storage.from("exercise-videos").upload(path, file)` direttamente
   - Gestisci progress/errors nel component
   - Dopo upload successful, salva il `publicUrl` nel form, invialo al POST /api/exercises
   
3. **Security (RLS Policy su bucket):**
   - Solo utenti autenticati possono uploadare
   - CREATE POLICY per: `auth.uid() IS NOT NULL`
   - Questo protegge il bucket da upload anonimo

4. **Signed URLs (per file privati):**
   - Nelle API GET, genera signed URL se videoUrl presente: `supabase.storage.from("exercise-videos").getSignedUrl(path, { expiresIn: 3600 })`
   - Ritorna il signed URL al frontend invece del path raw

5. **Dimensioni file:**
   - Video: max 500MB (Supabase supporta fino a 5GB)
   - Thumbnail: max 10MB
   - Nel form, valida lato client prima di upload

**Validazione Zod:**
```typescript
const exerciseSchema = z.object({
  name: z.string().min(3).max(100),
  nameIt: z.string().min(3).max(100),
  muscleGroup: z.enum([...MuscleGroup]),
  equipment: z.enum([...Equipment]),
  description: z.string().optional(),
  steps: z.array(z.string()).optional(),
  tips: z.array(z.string()).optional(),
  commonMistakes: z.array(z.string()).optional(),
  variants: z.array(z.string()).optional(),
});
```

**Responsive Breakpoints (Tailwind):**
- Mobile: 1 colonna
- Tablet (md): 2 colonne
- Desktop (lg): 3 colonne
- Wide (xl+): 4 colonne

**Dark Mode:**
Usa Tailwind dark: classname per coerenza con il tema globale (dark default)

**Performance:**
- Immagini thumbnail: lazy loading
- Video player: non auto-load (play on demand)
- Search con debounce 300ms
- Infinite scroll OR pagination (scegli uno)
