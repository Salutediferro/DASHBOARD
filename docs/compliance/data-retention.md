# Data Retention Policy

> Quanto tempo teniamo cosa, quando cancelliamo, e perché. Richiamata
> dalla DPIA e dal Registro dei trattamenti. Da approvare dal DPO prima
> del lancio commerciale.

**Principio guida**: *minimizzazione temporale* — conserviamo i dati il
tempo minimo necessario a realizzare la finalità per cui sono stati
raccolti, tenendo conto degli obblighi di legge applicabili al settore
sanitario.

---

## Matrice retention

| Categoria dato | Conservazione | Motivazione | Automazione |
| --- | --- | --- | --- |
| Account attivo (profilo base) | Finché attivo | Finalità contrattuale | — |
| Account soft-deleted | 30 giorni → hard delete | Buffer per ripensamento + audit; poi cancellazione definitiva | Cron `hard-delete` (da implementare) |
| Biometria (`BiometricLog`) | Come account | Dato clinico in uso | Cascade on user delete |
| Check-in settimanali (`CheckIn`) | Come account | Dato clinico in uso | Cascade on user delete |
| Diario sintomi (`SymptomLog`) | Come account | Dato clinico in uso | Cascade on user delete |
| Farmaci (`Medication`) | Come account | Dato clinico in uso | Cascade on user delete |
| Referti medici (file + metadati) | **10 anni** (DM 14/02/1997) o durata account, *si applica il termine più breve tra i due se il paziente cancella prima* | Retention sanitaria art. 11 DM 14/02/1997 + tutela diritto oblio del paziente | Cancellazione automatica bucket al soft-delete; valutare con DPO se trattenere 10 anni post-delete in forma anonimizzata |
| Permessi sui referti (`ReportPermission`) | Come referto | Audit trail | Revoca automatica al cambio `CareRelationship` |
| Appuntamenti (`Appointment`) | Come account | Storico consulti | Cascade on user delete |
| Disponibilità professionisti (`AvailabilitySlot`) | Come account pro | Operativo | Cascade on user delete |
| Messaggi (`Message` + `Conversation`) | Come account | Storico comunicazioni | Cascade on user delete |
| Notifiche (`Notification`) | 12 mesi dalla creazione | Dopo 12 mesi la rilevanza operativa è nulla | Cron settimanale (da implementare) |
| Audit log (`AuditLog`) | **5 anni** | Accountability art. 5.2 GDPR + potenziale richiesta Garante / Autorità giudiziaria | Cron mensile (da implementare) |
| Inviti professionisti (`Invitation`) | Durata scadenza + 90 giorni | Debug invite flow | Cron giornaliero (esiste cleanup PENDING in `/api/invitations`) |
| Email transazionali — log Resend | 30 giorni | Default Resend | Automatico Resend |
| Rate limit (Upstash) | Finestra rolling minuti-ore | Operativo | Auto-eviction Redis |
| Error logs (Sentry) | 30 giorni | Default Sentry | Automatico Sentry |
| Analytics aggregati (Plausible) | 12 mesi | Aggregati, no PII | Automatico Plausible |
| Session cookie Supabase | Durata sessione (default Supabase ~7 gg rolling) | Operativo | Automatico Supabase |
| Consenso cookie (`sdf-consent` localStorage) | Fino a revoca dall'utente | Prova del consenso | Client-side, revoca via banner |

---

## Note operative

### Referti medici e art. 11 DM 14/02/1997

La normativa italiana prescrive 10 anni di conservazione per la
documentazione sanitaria generata da strutture sanitarie. **Salute di
Ferro non è una struttura sanitaria** ma una piattaforma: i referti
sono di proprietà del paziente, non documentazione generata dal
titolare. Il nostro ruolo rispetto al singolo referto è di
**responsabile del trattamento** (storage + accesso controllato), non
di autore del documento.

Implicazione: alla cancellazione account, **cancelliamo** tutti i
referti del paziente dal nostro bucket. Il paziente mantiene copia
(potendo scaricarla prima via dossier PDF) e può riconferirla a un
nuovo operatore.

**Da validare con DPO** — in particolare se il titolare acquisisce
status di struttura sanitaria o se il Direttore Sanitario produce
documentazione interna (in tal caso quella specifica documentazione
segue la retention 10 anni separatamente dalla cancellazione account).

### Audit log e diritto alla cancellazione

L'`AuditLog` contiene `actorId` che, dopo la cancellazione account,
riferisce a un `User.deletedAt != null`. Mantenere l'`actorId` è
**necessario** per la tracciabilità (art. 5.2 + art. 30).

Tuttavia:
- L'`actorId` è un UUID, non un dato direttamente identificativo
- Mantenendo `User` in soft-delete per 5 anni (= retention audit) si
  preserva il link; alternativa: sostituire l'id con hash o
  pseudonimo al momento della cancellazione definitiva

**Scelta attuale**: `User` soft-deleted viene hard-deleted a 30 gg.
L'`actorId` nell'audit log diventa dangling (resta UUID ma User non
esiste più). Questo è **accettabile**: il log è immutabile, e se serve
indagare un'azione basta il metadata JSON che contiene il contesto.

### Implementazioni cron richieste (backlog)

Attualmente il ciclo di hard-delete e la pulizia notifiche/audit non
sono implementati. Va creato un cron Vercel `/api/cron/retention` che:

1. Seleziona `User` con `deletedAt < now - 30d`, esegue il purge fisico
2. Seleziona `Notification` con `createdAt < now - 12m`, cancella
3. Seleziona `AuditLog` con `createdAt < now - 5y`, cancella (opzionale
   — se il titolare preferisce conservare a vita per forense è
   scelta legittima, da documentare)
4. Seleziona `Invitation` con `status IN (EXPIRED, ACCEPTED, REVOKED)` e
   `updatedAt < now - 90d`, cancella
5. Seleziona `MedicalReport` orfani (patient hard-deleted), cancella
   file bucket + riga

**Gating**: il cron richiede Vercel Pro per schedule orario; su Hobby
può girare al massimo daily (memoria: già noto). In dev-time si può
attivare via `/api/cron/retention` manuale.

### Sovrascrittura / rettifica

In caso di rettifica (art. 16) su un dato clinico — es. il paziente
corregge un peso sbagliato — **non** teniamo versioning della riga
cambiata. Il dato precedente è perso. Questo è intenzionale per
minimizzazione. Se in futuro serve versioning (es. per requisiti
legali specifici di Direttore Sanitario), va implementato come nuova
tabella `BiometricLogHistory` con retention a parte.

### Backup

Il backup Supabase automatico (quando attivo) ha retention propria:
- Free tier: daily backup per 7 gg
- Pro tier: PITR fino a 7 gg

Il backup manuale via `npm run db:backup` produce un dump SQL
conservato localmente (gitignorato). **Il titolare** è responsabile di
conservare i backup in vault sicuro e di cancellarli alla stessa
cadenza prevista per i dati vivi (30 gg max dopo retention policy).

### Portabilità

Indipendentemente dalla retention lato titolare, l'utente può in
qualsiasi momento:
- Scaricare JSON completo: `GET /api/me/export`
- Stampare dossier PDF: `/dashboard/patient/dossier`

Questi strumenti soddisfano l'art. 20 GDPR.

---

## Review

Questa policy va rivista:
- **Almeno annualmente** dal DPO
- Ad ogni introduzione di nuovi trattamenti / tabelle
- Ad ogni modifica normativa rilevante (es. linee guida Garante sui
  dati sanitari, nuove indicazioni EDPB)
- Dopo ogni incidente che abbia toccato la retention (es. conservazione
  prolungata per indagine)

**Prossima review pianificata**: entro 2027-04-18.
