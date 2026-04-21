# Registro dei trattamenti (art. 30 GDPR)

> Documento di accountability. Serve a dimostrare al Garante, su
> richiesta, che sappiamo esattamente quali dati trattiamo, perché, per
> quanto tempo e con quali misure. Da aggiornare ad ogni modifica del
> codice che introduca / cambia / rimuova un trattamento.

**Titolare**: _da definire alla costituzione soggetto legale_
**DPO**: _da nominare_
**Ultimo aggiornamento**: 2026-04-18

## Trattamenti attivi

Ogni riga = un trattamento distinto. Il riferimento tecnico indica la
tabella Prisma / endpoint che implementa il trattamento.

---

### T1 — Gestione account utente (registrazione e login)

| Campo | Valore |
| --- | --- |
| Finalità | Creare e mantenere un account per accedere ai servizi della piattaforma |
| Base giuridica | Art. 6.1.b GDPR — esecuzione contratto |
| Categorie interessati | Pazienti, professionisti (medici, coach), personale amministrativo |
| Categorie dati | Email, password (hash), nome, cognome, ruolo, data creazione, factor TOTP, IP di login |
| Art. 9? | No |
| Destinatari | Supabase (Auth + DB), Vercel, Upstash |
| Trasferimenti extra-UE | Vercel (USA, SCC) — dati transitano in memoria |
| Conservazione | Fino a cancellazione account + 30 gg buffer + conservazione audit log (5 anni) |
| Misure sicurezza | TLS 1.3, password hash Supabase, 2FA TOTP opt-in/obbligatoria per pro, rate limiter login |
| Riferimento tecnico | Tabella `User`, `/api/auth/register`, Supabase Auth |

### T2 — Gestione profilo paziente (dati anagrafici e clinici generali)

| Campo | Valore |
| --- | --- |
| Finalità | Contestualizzare le prestazioni sanitarie e i tracking clinici |
| Base giuridica | Art. 6.1.a + Art. 9.2.a — consenso esplicito al trattamento di dati sanitari |
| Categorie interessati | Pazienti |
| Categorie dati | Data nascita, sesso, altezza, telefono, codice fiscale, contatto emergenza, patologie note, allergie, farmaci (free-text), infortuni, peso obiettivo |
| Art. 9? | Sì |
| Destinatari | Supabase, professionisti autorizzati dal paziente |
| Trasferimenti extra-UE | No |
| Conservazione | Fino a cancellazione account + 30 gg buffer |
| Misure sicurezza | TLS, cifratura at-rest, RLS, RBAC middleware, permessi CareRelationship |
| Riferimento tecnico | Tabella `User` (campi clinici), `/api/me` PATCH |

### T3 — Tracking biometrico continuo

| Campo | Valore |
| --- | --- |
| Finalità | Monitoraggio clinico quantitativo (peso, pressione, glicemia, sonno, attività) |
| Base giuridica | Art. 6.1.a + Art. 9.2.a |
| Categorie interessati | Pazienti |
| Categorie dati | Peso, BMI, % grasso, circonferenze, pressione, FC riposo, SpO2, HRV, glicemia, chetoni, temperatura, sonno, passi, data/ora registrazione |
| Art. 9? | Sì |
| Destinatari | Supabase, professionisti autorizzati del paziente |
| Trasferimenti extra-UE | No |
| Conservazione | Fino a cancellazione account + 30 gg buffer |
| Misure sicurezza | Come T2 |
| Riferimento tecnico | Tabella `BiometricLog`, `/api/biometrics` |

### T4 — Check-in settimanali

| Campo | Valore |
| --- | --- |
| Finalità | Invio periodico di un report corporeo + soggettivo da parte del paziente al professionista di riferimento |
| Base giuridica | Art. 6.1.a + Art. 9.2.a |
| Categorie interessati | Pazienti |
| Categorie dati | Peso, misure corporee, foto corporee (3 angoli), note testuali libere, rating 1-5, feedback professionista |
| Art. 9? | Sì |
| Destinatari | Supabase (incl. Storage per foto), professionista target del check-in |
| Trasferimenti extra-UE | No |
| Conservazione | Come T3 |
| Misure sicurezza | Come T2 + bucket privato con signed URL 15 min |
| Riferimento tecnico | Tabella `CheckIn`, `/api/check-ins` |

### T5 — Diario sintomi giornaliero

| Campo | Valore |
| --- | --- |
| Finalità | Self-tracking umore / energia / sonno / sintomi quotidiani |
| Base giuridica | Art. 6.1.a + Art. 9.2.a |
| Categorie interessati | Pazienti |
| Categorie dati | Rating 1-5 di mood/energy/sleep, array sintomi (testo libero), note |
| Art. 9? | Sì |
| Destinatari | Supabase, professionisti autorizzati |
| Trasferimenti extra-UE | No |
| Conservazione | Come T3 |
| Misure sicurezza | Come T2 |
| Riferimento tecnico | Tabella `SymptomLog`, `/api/symptom-logs` |

### T6 — Terapia farmacologica strutturata

| Campo | Valore |
| --- | --- |
| Finalità | Registrazione e monitoraggio dei farmaci assunti dal paziente |
| Base giuridica | Art. 6.1.a + Art. 9.2.a |
| Categorie interessati | Pazienti |
| Categorie dati | Nome farmaco, dose, frequenza, date inizio/fine, note, stato (attivo/archiviato) |
| Art. 9? | Sì (indiretto: rivela patologia) |
| Destinatari | Supabase, professionisti autorizzati |
| Trasferimenti extra-UE | No |
| Conservazione | Come T3 |
| Misure sicurezza | Come T2 |
| Riferimento tecnico | Tabella `TherapyItem` (kind=SELF per supplementi, kind=PRESCRIBED per indicazioni del medico), `/api/therapy` |

### T7 — Cartella clinica (referti medici)

| Campo | Valore |
| --- | --- |
| Finalità | Archiviazione e condivisione controllata di referti (analisi, visite, imaging) |
| Base giuridica | Art. 6.1.a + Art. 9.2.a + Art. 9.2.h (finalità di cura) |
| Categorie interessati | Pazienti |
| Categorie dati | File (PDF/immagini, max 20MB), titolo, categoria (BLOOD_TEST, IMAGING, VISIT, OTHER), data referto, note, permessi granulari |
| Art. 9? | Sì |
| Destinatari | Supabase Storage privato, professionisti **autorizzati esplicitamente sul singolo referto** tramite `ReportPermission` |
| Trasferimenti extra-UE | No |
| Conservazione | **10 anni** (DM 14/02/1997 per documentazione sanitaria) o fino a cancellazione account se antecedente ai 10 anni (a scelta del titolare — valutare con DPO) |
| Misure sicurezza | Bucket privato Supabase Storage, signed URL 15 min, doppio check (relazione ACTIVE + permesso attivo), audit log di ogni accesso |
| Riferimento tecnico | Tabelle `MedicalReport` + `ReportPermission`, `/api/medical-reports` |

### T8 — Appuntamenti e disponibilità

| Campo | Valore |
| --- | --- |
| Finalità | Prenotare consulti tra paziente e professionista |
| Base giuridica | Art. 6.1.b (esecuzione contratto) per il paziente; Art. 9.2.h per i dati clinici nelle note |
| Categorie interessati | Pazienti, professionisti |
| Categorie dati | Data/ora inizio-fine, tipo (VIDEO_CALL, VISIT, CHECK_IN), stato, note libere (possono contenere dati clinici), URL meeting |
| Art. 9? | Eventualmente (note libere) |
| Destinatari | Supabase, Resend (email reminder) |
| Trasferimenti extra-UE | Resend (USA, SCC) per reminder email |
| Conservazione | Fino a cancellazione account |
| Misure sicurezza | Come T2, rate limit su creazione |
| Riferimento tecnico | Tabelle `Appointment` + `AvailabilitySlot`, `/api/appointments` |

### T9 — Messaggistica diretta 1:1

| Campo | Valore |
| --- | --- |
| Finalità | Comunicazione protetta tra paziente e professionista con rapporto attivo |
| Base giuridica | Art. 6.1.a + Art. 9.2.a |
| Categorie interessati | Pazienti, professionisti |
| Categorie dati | Contenuto messaggi (testo), timestamp, metadati (letto/non letto) |
| Art. 9? | Sì (possibile contenuto clinico) |
| Destinatari | Supabase (incl. realtime channel) |
| Trasferimenti extra-UE | No |
| Conservazione | Fino a cancellazione account |
| Misure sicurezza | RLS, check `CareRelationship` ACTIVE al momento dell'invio, admin wildcard loggato |
| Riferimento tecnico | Tabelle `Conversation`, `ConversationMember`, `Message`, `/api/conversations` |

### T10 — Notifiche in-app

| Campo | Valore |
| --- | --- |
| Finalità | Informare l'utente di eventi rilevanti (appuntamento, check-in da revisionare, messaggio nuovo) |
| Base giuridica | Art. 6.1.b (esecuzione contratto) |
| Categorie interessati | Pazienti, professionisti |
| Categorie dati | Titolo, corpo (può contenere frammenti clinici), tipo, stato letto, URL azione |
| Art. 9? | Talvolta (contenuto feedback check-in, nome paziente) |
| Destinatari | Supabase |
| Trasferimenti extra-UE | No |
| Conservazione | 12 mesi dalla creazione |
| Misure sicurezza | RLS, `Notification.userId` obbligatorio |
| Riferimento tecnico | Tabella `Notification`, `/api/notifications` |

### T11 — Email transazionali

| Campo | Valore |
| --- | --- |
| Finalità | Reminder appuntamenti, conferma registrazione, invito ai pazienti da parte del pro |
| Base giuridica | Art. 6.1.b (esecuzione contratto) |
| Categorie interessati | Pazienti, professionisti |
| Categorie dati | Email, nome, messaggio contestuale |
| Art. 9? | No (non vengono inviati contenuti clinici per email) |
| Destinatari | Resend |
| Trasferimenti extra-UE | Resend (USA, SCC) |
| Conservazione | Log email conservati 30 gg da Resend |
| Misure sicurezza | SPF/DKIM/DMARC configurati su dominio salutediferro.com |
| Riferimento tecnico | `src/lib/email/send.ts`, template in `src/lib/email/templates.ts` |

### T12 — Invito paziente (link di registrazione)

| Campo | Valore |
| --- | --- |
| Finalità | Permettere a un professionista di invitare un paziente con link monouso |
| Base giuridica | Art. 6.1.f (legittimo interesse del pro a facilitare onboarding) |
| Categorie interessati | Pazienti (prima della registrazione) |
| Categorie dati | Email (opzionale), nome/cognome (opzionale), token crittografico, scadenza |
| Art. 9? | No |
| Destinatari | Supabase, Resend |
| Trasferimenti extra-UE | Resend (SCC) |
| Conservazione | Fino a scadenza (default 14 gg) o accettazione, poi marcato ACCEPTED/EXPIRED |
| Misure sicurezza | Token CSPRNG 32 byte, rate limit 20/h per pro |
| Riferimento tecnico | Tabella `Invitation`, `/api/invitations` |

### T13 — Audit log accessi e operazioni critiche

| Campo | Valore |
| --- | --- |
| Finalità | Accountability art. 5.2 GDPR + sicurezza forense in caso di breach |
| Base giuridica | Art. 6.1.c (obbligo legale) + Art. 6.1.f (interesse legittimo) |
| Categorie interessati | Tutti gli utenti registrati |
| Categorie dati | Azione (LOGIN, LOGOUT, REPORT_VIEW, ecc.), attore, entità coinvolta, metadata JSON, IP, user-agent, timestamp |
| Art. 9? | Indiretto (accesso a dati sanitari tracciato) |
| Destinatari | Supabase (interno), ADMIN per visualizzazione |
| Trasferimenti extra-UE | No |
| Conservazione | **5 anni** dalla registrazione (retention accountability) |
| Misure sicurezza | Append-only dal punto di vista applicativo, accessibile solo ad ADMIN |
| Riferimento tecnico | Tabella `AuditLog`, `src/lib/audit.ts` |

### T14 — Rate limiting (sicurezza)

| Campo | Valore |
| --- | --- |
| Finalità | Proteggere endpoint da abuso / brute force |
| Base giuridica | Art. 6.1.f (interesse legittimo alla sicurezza) |
| Categorie interessati | Tutti |
| Categorie dati | Chiave (es. `scope:ip`), contatore richieste, finestra temporale |
| Art. 9? | No |
| Destinatari | Upstash Redis |
| Trasferimenti extra-UE | No (eu-west-1) |
| Conservazione | Finestra rolling (minuti-ore) — auto-eviction |
| Misure sicurezza | TLS verso Upstash, token REST lato server only |
| Riferimento tecnico | `src/lib/rate-limit.ts` |

### T15 — Error monitoring (Sentry)

| Campo | Valore |
| --- | --- |
| Finalità | Rilevare e risolvere errori applicativi |
| Base giuridica | Art. 6.1.f (interesse legittimo alla qualità del servizio) |
| Categorie interessati | Utenti che incontrano un errore |
| Categorie dati | Stack trace, URL, user-agent, (opzionale) user id se configurato |
| Art. 9? | Improbabile ma non escluso (stack trace potrebbero sfiorare payload) |
| Destinatari | Sentry |
| Trasferimenti extra-UE | Sentry (USA, SCC) |
| Conservazione | 30 gg (default Sentry free/team) |
| Misure sicurezza | `sendDefaultPii: false`, client gated su consenso cookie banner, nessun `session.replay` |
| Riferimento tecnico | `instrumentation.ts` + `instrumentation-client.ts` |

### T16 — Analytics aggregati (Plausible, opt-in)

| Campo | Valore |
| --- | --- |
| Finalità | Misurare uso aggregato della piattaforma (pagine viste, origini traffico) |
| Base giuridica | Art. 6.1.a (consenso cookie banner) |
| Categorie interessati | Visitatori che hanno dato consenso |
| Categorie dati | Hash giornaliero IP-derived (no PII diretto), pagina, referrer, geo country |
| Art. 9? | No |
| Destinatari | Plausible |
| Trasferimenti extra-UE | No (infra UE) |
| Conservazione | 12 mesi, aggregati |
| Misure sicurezza | Gated su consenso, no cookie persistenti |
| Riferimento tecnico | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` + consent gate in `CookieBanner` |

## Trattamenti non attivi / pianificati

Da compilare quando attivati — esempi:
- Videoconsulto (quando integrato)
- Stripe billing (quando passato a live mode)
- OCR referti (quando implementato)

## Esercizio dei diritti degli interessati

Esposti all'utente via self-service (no mediazione operativa salvo
richiesta esplicita):

| Diritto | Endpoint / UI |
| --- | --- |
| Accesso (art. 15) | `GET /api/me/export` — dump JSON |
| Rettifica (art. 16) | Profilo in-app, tutti i campi editabili |
| Cancellazione (art. 17) | `DELETE /api/me` via DangerZone UI |
| Limitazione (art. 18) | Contatto info@salutediferro.com |
| Portabilità (art. 20) | Export JSON + dossier PDF |
| Opposizione (art. 21) | Cancellazione account |
| Revoca consenso (art. 7.3) | Cancellazione account (revoca effettiva = revoca permessi pro + soft-delete) |
| Reclamo al Garante | https://www.garanteprivacy.it |
