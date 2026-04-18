# DPIA — Valutazione d'Impatto sulla Protezione dei Dati

> **Stato**: bozza operativa. Da completare e firmare da un DPO prima
> del lancio commerciale. Il template è stato compilato con la
> descrizione tecnica reale della piattaforma al 2026-04-18; le
> valutazioni di rischio sono una prima passata che il DPO deve
> rivedere alla luce del contesto specifico del titolare.

## 0. Metadati

| Campo | Valore |
| --- | --- |
| Versione | 0.1 — bozza |
| Data prima stesura | 2026-04-18 |
| Autore bozza | Team tecnico Salute di Ferro |
| DPO revisore | _da nominare_ |
| Data firma DPO | _da compilare_ |
| Prossima revisione | entro 12 mesi o al verificarsi di cambiamenti sostanziali (nuovo processore, nuovo flusso di dati sensibili, incidente rilevante) |

## 1. Necessità della DPIA

La valutazione d'impatto è **obbligatoria** ai sensi dell'art. 35 GDPR
perché il trattamento:

1. Coinvolge dati appartenenti a categorie particolari (art. 9) — dati
   relativi alla salute
2. Viene effettuato su larga scala (piattaforma aperta alla cittadinanza)
3. Include monitoraggio sistematico dello stato di salute nel tempo
   (check-in settimanali, biometria, diario sintomi)

Si applicano almeno 3 dei criteri del WP29 (2017) — soglia di
obbligatorietà superata di gran lunga.

## 2. Descrizione sistematica del trattamento

### 2.1. Finalità

1. **Coordinamento sanitario paziente ↔ professionista**: consentire a
   un paziente di condividere informazioni cliniche (referti, biometria,
   check-in, sintomi) con medici e coach con cui ha un rapporto attivo,
   e di prenotare/gestire appuntamenti
2. **Comunicazione diretta** tramite messaggistica 1:1 protetta tra
   paziente e professionista
3. **Auto-monitoraggio** del paziente tramite strumenti di tracking
   (peso, misure, umore, energia, farmaci, appuntamenti)
4. **Adempimento obblighi legali** (audit log ex art. 30 GDPR,
   conservazione sanitaria)

### 2.2. Categorie di interessati

- Pazienti (maggiorenni; accesso minori non previsto in v1)
- Professionisti sanitari: medici iscritti all'Ordine, coach
- Personale amministrativo del titolare (ruolo ADMIN)

### 2.3. Categorie di dati trattati

**Dati personali ordinari (art. 6)**:
- Identificativi: nome, cognome, email, telefono, codice fiscale
- Anagrafici: data di nascita, sesso, altezza
- Contatto d'emergenza (testo libero con riferimento a terzo)
- Credenziali: hash password (gestito da Supabase Auth), factor TOTP
- Log tecnici: IP (tramite rate limiter), user-agent, timestamp

**Dati appartenenti a categorie particolari (art. 9)**:
- Stato di salute: patologie note, allergie, infortuni
- Farmaci in uso (struttura + free-text)
- Biometria clinica: peso, BMI, % grasso, circonferenze, pressione,
  frequenza cardiaca, SpO2, HRV, glicemia, temperatura, sonno, passi
- Check-in settimanali: peso, misure, foto corporee, note, rating
- Diario sintomi: umore, energia, qualità sonno, sintomi, note
- Referti medici: file PDF/immagine (analisi, visite, esami)
- Contenuto messaggi tra paziente e professionista
- Metadati appuntamenti (tipo, note)

### 2.4. Base giuridica

| Finalità | Base art. 6 | Base art. 9 |
| --- | --- | --- |
| Registrazione account | Esecuzione contratto (art. 6.1.b) | — |
| Trattamento dati clinici | Consenso esplicito (art. 6.1.a) | Consenso esplicito (art. 9.2.a) |
| Audit log | Obbligo legale (art. 6.1.c) | Art. 9.2.h (finalità di cura) |
| Rate limit / sicurezza | Legittimo interesse (art. 6.1.f) | — |
| Email transazionali | Esecuzione contratto (art. 6.1.b) | — |

Il consenso esplicito ex art. 9.2.a è raccolto al momento della
registrazione tramite checkbox separato dalla normale accettazione dei
termini (`acceptHealthDataProcessing`). Il consenso è revocabile in
qualsiasi momento attraverso la cancellazione dell'account (GDPR Art.
17) — che comporta soft-delete immediato + hard delete dopo 30 giorni.

### 2.5. Destinatari

**Interni al titolare**:
- Ruolo ADMIN: accesso amministrativo per supporto, audit, gestione
  utenti. Soggetto a logging e a obbligo di riservatezza
- Direttore Sanitario (quando nominato): responsabile clinico

**Responsabili del trattamento (art. 28) — vedi elenco completo in
[docs/DPA.md](./DPA.md) e in `src/lib/legal/constants.ts`**:
- Supabase (DB + Auth + Storage) — eu-north-1
- Vercel (hosting + CDN) — USA con SCC
- Cloudflare (DNS) — USA con SCC
- Upstash (rate limit) — eu-west-1
- Resend (email transazionali) — USA con SCC
- Sentry (error monitoring) — USA con SCC
- Plausible (analytics anonimi opt-in) — UE

**Soggetti autonomi**:
- Professionisti sanitari (DOCTOR/COACH) che il paziente autorizza
  espressamente — sono titolari autonomi per le finalità proprie della
  loro professione. La piattaforma agisce come strumento abilitante

### 2.6. Trasferimenti extra-UE

I processori Vercel, Cloudflare, Resend e Sentry hanno infrastruttura
anche negli USA. Il trasferimento avviene ex **art. 46 GDPR** con
Standard Contractual Clauses (SCC) aggiornate ai testi 2021 della
Commissione Europea, incluse come parte integrante dei DPA firmati
con ciascuno.

**Misure supplementari** adottate per mitigare il rischio di accesso
da parte di autorità extra-UE:
- Dati clinici strutturati e file referti **restano in Supabase
  eu-north-1** (no copia USA)
- Su Vercel i dati transitano solo in memoria durante l'elaborazione
  delle richieste (no persistenza)
- Cloudflare è in modalità DNS-only (no proxy del traffico → niente
  ispezione payload)
- Sentry è configurato `sendDefaultPii: false` e con client gate su
  consenso esplicito dell'utente

### 2.7. Flusso tecnico sintetico

```
Utente (browser / mobile)
    │ TLS 1.3
    ▼
Vercel Edge / Cloudflare DNS
    │
    ▼
Next.js App (Vercel Functions, iad1)
    │
    ├── Supabase Auth (aud)        [UE, eu-north-1]
    ├── Supabase Postgres (RLS)    [UE, eu-north-1]
    ├── Supabase Storage (privato) [UE, eu-north-1]
    ├── Upstash Redis (rate limit) [UE, eu-west-1]
    ├── Resend API (email)         [USA, SCC]
    └── Sentry API (errori)        [USA, SCC, gated]
```

### 2.8. Conservazione

Vedi [data-retention.md](./data-retention.md) per il dettaglio. In
sintesi:
- Account + dati clinici: fino alla cancellazione; soft-delete +30 gg
  di buffer per consentire ripensamento / audit
- Referti medici: 10 anni (DM 14/02/1997, retention sanitaria)
- Audit log: 5 anni (accountability art. 5.2 GDPR)
- Log tecnici (Sentry): 30 giorni
- Analytics (Plausible): 12 mesi, aggregati

## 3. Valutazione di necessità e proporzionalità

### 3.1. Minimizzazione

- Nessun dato viene richiesto in registrazione oltre al minimo
  necessario (email, nome, password). I dati clinici si inseriscono
  progressivamente e **a scelta dell'utente**
- Le API applicano RBAC stretto (middleware + service-level); la vista
  di un paziente è accessibile solo ai professionisti con
  `CareRelationship` ACTIVE
- I referti richiedono un **doppio check**: relazione attiva + permesso
  granulare `ReportPermission` sul singolo file, revocabile

### 3.2. Finalità specifica e non ulteriore

Ogni finalità è dichiarata esplicitamente all'utente. I dati non sono
usati per marketing, profilazione commerciale, training AI o
ricerca senza un consenso distinto e informato (oggi **non** attivo).

### 3.3. Esattezza

L'utente ha accesso diretto ai propri dati (self-service edit in
profilo, biometria, farmaci, diario). I professionisti non possono
editare i dati del paziente a sua insaputa (solo revisionare check-in).

### 3.4. Trasparenza

- Informativa pubblica su `/privacy`
- Cookie banner su primo accesso
- Consenso esplicito art. 9 separato in registrazione
- Lista pubblica dei sub-responsabili su `/subprocessors`
- Export completo dei dati tramite `GET /api/me/export` (diritto art. 15)
- Cancellazione self-service tramite `DELETE /api/me` (diritto art. 17)

## 4. Rischi per diritti e libertà degli interessati

Per ciascun rischio: **Probabilità** (1-5) × **Impatto** (1-5) =
severity, **pre-mitigazione**.

| # | Rischio | P | I | S | Note |
| --- | --- | --- | --- | --- | --- |
| R1 | Accesso non autorizzato al DB con esfiltrazione massiva dati sanitari | 3 | 5 | 15 | Scenario chiave per piattaforma sanitaria |
| R2 | Furto sessione professionista → accesso a cartelle pazienti | 4 | 5 | 20 | Alto se 2FA non obbligatorio |
| R3 | Compromissione credenziali paziente → lettura/modifica propri dati da terzi | 3 | 4 | 12 | Impatto limitato al singolo paziente |
| R4 | Fuga credenziali servizio (service-role Supabase, cron secret) | 2 | 5 | 10 | Env leak via repo / CI |
| R5 | Professionista che mantiene accesso dopo cessazione rapporto | 3 | 4 | 12 | Revoca `CareRelationship` deve propagarsi |
| R6 | Contenuto referto esposto a professionista non autorizzato | 3 | 5 | 15 | Richiede doppio check (relazione + permesso) |
| R7 | Messaggi tra paziente e pro letti da ADMIN | 2 | 4 | 8 | Ruolo ADMIN è wildcard |
| R8 | Log con PII in Sentry / Vercel logs | 3 | 3 | 9 | Stack trace potrebbero contenere dati |
| R9 | Rate limiter bypass → brute force login | 3 | 3 | 9 | Già mitigato tramite Upstash |
| R10 | Cancellazione dati incompleta (bucket file) | 2 | 4 | 8 | Pulizia bucket in GDPR delete |
| R11 | Errato trasferimento dati extra-UE senza SCC | 2 | 4 | 8 | Attualmente SCC in essere |
| R12 | Professionista non iscritto Ordine che accede | 2 | 5 | 10 | KYC prima del provisioning |
| R13 | Minore che si registra nonostante divieto in ToS | 2 | 4 | 8 | Verifica età non implementata |
| R14 | Regressione in update del codice che introduce bug di privacy | 3 | 4 | 12 | Code review + test |
| R15 | Data breach notificato in ritardo al Garante (>72h) | 2 | 5 | 10 | Richiede incident response plan |

**Alto rischio pre-mitigazione**: R1, R2, R6 → richiedono consultazione
Garante ai sensi dell'art. 36 se il rischio residuo rimane alto dopo
le misure di mitigazione.

## 5. Misure tecniche e organizzative di mitigazione

### 5.1. Tecniche

- **Cifratura in transito**: TLS 1.3 end-to-end (Vercel, Supabase)
- **Cifratura at-rest**: Postgres AES-256 lato Supabase; Storage bucket
  privato (signed URL 15 min per ogni download)
- **RLS (Row Level Security)** abilitata su tutte le 16 tabelle Prisma
  con default-deny. Il codice backend bypassa con ruolo `postgres` ma
  non sono esposti endpoint Supabase JS con chiave anon/authenticated
  verso dati clinici
- **2FA TOTP obbligatoria** per DOCTOR/COACH/ADMIN (gated da env
  `ENFORCE_2FA=1`, attivabile al completamento onboarding del team)
- **Audit log completo** (tabella `AuditLog`) su login/logout,
  registrazione, consensi, upload/accesso referti, modifica
  biometria, appuntamenti, modifica profilo, cancellazioni account
- **Rate limiter distribuito** Upstash Redis su endpoint sensibili
  (register, invitations, medical-reports)
- **Sessioni httpOnly** + `Secure` + `SameSite=Lax` per i cookie di
  autenticazione (default Supabase SSR)
- **RBAC a livello middleware** + check service-level per ogni API
  che accede a dati clinici
- **Permessi granulari sui referti**: `ReportPermission` per-file,
  revocabile, con logging della revoca
- **Soft-delete account + GDPR purge**: hard delete programmato a 30
  giorni; rimozione file bucket contestuale al soft-delete
- **Environment isolation**: secrets solo su Vercel env vars, mai nel
  repo (`.env.local` in gitignore)

### 5.2. Organizzative

- **Consenso esplicito art. 9** obbligatorio in registrazione
- **Informativa completa** con enumerazione finalità + sub-responsabili
- **DPA firmati** con tutti i processori (status tracciato in
  [DPA.md](./DPA.md))
- **KYC professionisti** prima del provisioning (iscrizione Ordine,
  PEC verificata)
- **Obbligo di riservatezza** contrattualizzato per ADMIN interni
- **Revoca automatica** dei permessi ai referti alla cancellazione
  del paziente (`ReportPermission.revokedAt`)
- **Archiviazione CareRelationship** a cessazione rapporto: stato
  `ARCHIVED` + fine dell'accesso del professionista
- **Incident response plan** documentato in
  [incident-response.md](./incident-response.md)
- **Formazione annuale** su privacy & sicurezza per team (da
  formalizzare)
- **Revisione DPIA** almeno annuale + ad ogni cambiamento sostanziale

## 6. Valutazione del rischio residuo

Da completare dal DPO dopo verifica delle misure. Indicativamente, le
misure elencate al §5 portano R1, R2, R6 da rischio alto a rischio
medio-basso, compatibile con trattamento ordinario senza necessità di
consultazione preventiva Garante (art. 36 GDPR).

## 7. Consultazione

- **DPO**: _nominare e consultare prima del lancio_
- **Interessati**: consultazione rappresentativa (es. focus group con
  5-10 pazienti-tipo) — pianificare in fase beta ristretta
- **Garante**: consultazione preventiva necessaria solo se il rischio
  residuo resta alto dopo le misure (da valutare con DPO)

## 8. Decisione finale e monitoraggio

- [ ] Firma DPO
- [ ] Firma Titolare del Trattamento
- [ ] Pubblicazione interna (vault legal)
- [ ] Review annuale pianificata (data: _____)
- [ ] Trigger di re-DPIA definiti e monitorati

## Allegati collegati

- [DPA.md](./DPA.md) — Data Processing Agreements con i processori
- [registro-trattamenti.md](./registro-trattamenti.md) — Art. 30 GDPR
- [data-retention.md](./data-retention.md) — Policy conservazione
- [incident-response.md](./incident-response.md) — Data breach workflow
