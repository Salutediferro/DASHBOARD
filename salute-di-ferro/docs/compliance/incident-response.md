# Incident Response Plan — Data Breach

> Workflow operativo per rilevare, contenere, valutare e notificare un
> incidente di sicurezza dei dati personali. Il GDPR (art. 33)
> **obbliga** a notificare al Garante entro **72 ore** dalla scoperta
> ogni violazione che comporti rischio per i diritti e le libertà degli
> interessati. Per una piattaforma che tratta dati sanitari (art. 9)
> la soglia di rischio è bassa: nel dubbio, si notifica.

**Responsabile incident**: _da nominare (di solito il DPO o, se assente,
il legale rappresentante del titolare)_

**Team coinvolto**: titolare, DPO, referente tecnico, legale, comms.

---

## 0. Definizioni rapide

**Data breach** (art. 4.12 GDPR): violazione di sicurezza che comporta
accidentalmente o in modo illecito la distruzione, perdita, modifica,
divulgazione non autorizzata o accesso ai dati personali.

Tre categorie (WP29 Guidelines 01/2018):
- **Confidentiality breach** — divulgazione/accesso non autorizzato
- **Integrity breach** — modifica non autorizzata
- **Availability breach** — perdita o impossibilità di accesso

---

## 1. Detection — come scopriamo un incidente

Fonti di segnalazione:
- **Alert automatici**: Sentry (spike errori), uptime monitor
  (quando attivato), allarmi Supabase/Vercel
- **Audit log**: query periodiche sull'`AuditLog` (picchi anomali,
  accessi fuori pattern)
- **Segnalazioni utenti**: email a info@salutediferro.com, messaggi
  in-app, segnalazioni sui canali social
- **Segnalazioni processori**: Supabase/Vercel/etc. notificano
  data breach dal loro lato → noi siamo sub-titolari; ricevuta la
  notifica, si applica questo workflow con clock a partire dalla
  notifica ricevuta
- **Security researcher** / bug bounty (quando attivato)

## 2. Triage — è un breach?

Entro **1 ora** dalla segnalazione, il responsabile incident apre un
ticket interno e risponde a 5 domande:

1. Ci sono dati personali coinvolti? Se **no** → non è breach GDPR
   (ma potrebbe essere incidente di sicurezza non-GDPR da chiudere
   comunque)
2. Confidentiality, integrity o availability?
3. Numero approssimato di interessati coinvolti?
4. Ci sono dati art. 9 (sanitari) coinvolti? → escalation automatica a
   rischio alto
5. L'incidente è **confermato** o **sospetto**? Se sospetto, continua
   l'indagine ma non far partire il countdown delle 72h finché non è
   confermato

## 3. Contenimento — stop alla perdita

Priorità assoluta. Azioni possibili in ordine di escalation:

- **Revoca sessioni**: Supabase dashboard → Auth → Users → "Sign out
  all users" (o mirato per l'utente compromesso)
- **Rotazione secret**: se ci sono indicatori che le env var Vercel
  siano state esfiltrate, ruotare tutti i secret (service_role
  Supabase, CRON_SECRET, Upstash token, Resend key). La rotazione
  è manuale sulle dashboard + redeploy
- **Disabilitazione endpoint**: in caso estremo, passare l'app in
  maintenance mode via Vercel (redirect a una pagina statica)
- **Blocco IP**: Cloudflare firewall rules per IP che stanno
  attivamente abusando
- **Quarantena account**: impostare `deletedAt` su utente specifico o
  bloccare login via Supabase admin

Se l'incidente è su un **processore** (es. Supabase avvisa di un
breach), coordinarsi con il loro supporto seguendo le procedure del DPA.

## 4. Valutazione del rischio — calcolo rapido

Per decidere se notificare e chi notificare, usare la matrice:

| Tipo dati coinvolti | Numero interessati | Rischio |
| --- | --- | --- |
| Solo dati identificativi (nome, email) | Qualsiasi | Medio |
| Credenziali (password, token) | Qualsiasi | Alto |
| Dati sanitari (art. 9) | Anche 1 | **Molto alto** |
| Dati sanitari | > 100 | **Rischio elevato** — escalation immediata |

**Regola empirica**: qualsiasi breach che coinvolga dati art. 9 →
**sempre notifica al Garante + notifica agli interessati** se
coinvolge dati sanitari identificabili.

## 5. Notifica al Garante (entro 72h)

**Strumento**: [servizio online del Garante per notifica breach](https://servizi.gpdp.it/databreach/s/)

**Clock**: parte dal momento in cui il titolare ne è venuto a
conoscenza (non dal momento dell'incidente effettivo).

**Informazioni da includere** (art. 33.3):
1. Natura della violazione, categorie e numero approssimativo di
   interessati e di record coinvolti
2. Nome e dati di contatto del DPO o di altro punto di contatto
3. Probabili conseguenze
4. Misure adottate o proposte per contrastare la violazione e
   mitigarne i possibili effetti negativi

Se alcune informazioni non sono ancora disponibili entro 72h, inviare
una **notifica iniziale** con quel che si sa + impegno di integrazione
successiva (art. 33.4).

## 6. Notifica agli interessati (senza indebito ritardo)

Obbligatoria se la violazione **comporta un rischio elevato** per i
diritti e le libertà (art. 34). Per dati sanitari, il default è sì.

**Contenuto minimo** (art. 34.2):
- Natura della violazione, in linguaggio chiaro
- Nome e contatti DPO
- Probabili conseguenze
- Misure adottate / proposte

**Canali**: email a tutti gli interessati coinvolti. Se non praticabile
(es. numero enorme), comunicazione pubblica equivalente.

**Non obbligatoria** se:
- I dati erano **cifrati** e la chiave non è stata compromessa
- Sono state adottate misure che rendono improbabile l'alto rischio
- Richiederebbe sforzo sproporzionato (in tal caso: comunicazione
  pubblica)

## 7. Documentazione interna (art. 33.5)

Anche per breach che **non** vengono notificati, va tenuta traccia
interna di:
- Fatti relativi alla violazione
- Effetti
- Provvedimenti adottati

Formato: un documento per incidente, salvato nel vault legal (stesso
posto dei DPA firmati). Titolo: `breach-YYYYMMDD-<slug>.md`.

**Template minimo** — da duplicare per ogni incidente:

```markdown
# Breach 2026-MM-DD — <slug>

## Sommario
Una riga.

## Cronologia
- YYYY-MM-DD HH:MM — detection: <fonte>
- YYYY-MM-DD HH:MM — triage completato
- YYYY-MM-DD HH:MM — contenimento
- YYYY-MM-DD HH:MM — notifica Garante (se applicabile)
- YYYY-MM-DD HH:MM — notifica interessati (se applicabile)

## Tipo
- [ ] Confidentiality
- [ ] Integrity
- [ ] Availability

## Dati coinvolti
- Categorie: ...
- Art. 9: sì/no
- Numero interessati: ...
- Numero record: ...

## Causa radice
Analisi tecnica.

## Conseguenze potenziali
Per gli interessati.

## Misure adottate
- Contenimento: ...
- Mitigazione: ...
- Preventive: ...

## Notifiche
- Garante: [sì/no, data, n. protocollo]
- Interessati: [sì/no, data, canale]

## Lessons learned
- ...

## Azioni di follow-up
- [ ] Task 1 — owner — deadline
```

## 8. Post-mortem

Entro **2 settimane** dall'incidente:
- Meeting interno con team tecnico + DPO
- Identificare root cause (no blame, focus su sistema)
- Definire azioni preventive concrete con owner + deadline
- Aggiornare questa procedura se necessario (es. nuovo runbook)
- Se l'incidente rivela un gap nella DPIA → **triggerare re-DPIA**

## 9. Scenari runbook (per incidenti tipici)

### Scenario A — Credenziale admin compromessa

1. Supabase dashboard → Auth → user → "Sign out" + reset password
2. Invalidare tutti i refresh token dell'utente
3. Review audit log delle ultime 48h per l'`actorId` compromesso
4. Se ci sono accessi anomali a cartelle pazienti → quei pazienti sono
   interessati di un breach art. 9 → notifica
5. Rotazione 2FA (un-enroll + re-enroll)

### Scenario B — Leak env var Vercel

1. Ruotare immediatamente tutti i secret esposti:
   - Supabase service_role → Dashboard Project Settings → API
   - CRON_SECRET → nuovo random 64 byte
   - UPSTASH_REDIS_REST_TOKEN → dashboard Upstash
   - RESEND_API_KEY → dashboard Resend
2. Redeploy con le nuove env
3. Audit log: cercare utilizzi anomali degli endpoint protetti dai
   secret compromessi
4. Se il service_role è stato ruotato dopo essere uscito → presumere
   accesso completo al DB → notifica breach di **tutti** i dati
   contenuti

### Scenario C — SQL injection / RCE via dependency

1. Escalation tech immediata, rollback all'ultimo commit safe
2. Coordinare con Supabase support per verificare accessi sospetti
   al DB (log Postgres server-side)
3. Se confermata esfiltrazione → notifica Garante entro 72h

### Scenario D — Perdita cifratura bucket referti

1. Verifica URL pubblici: il bucket `medical-reports` deve essere
   **private**. Se risulta public → immediatamente fixare a private
2. Audit accessi pubblici nel periodo scoperto
3. Per ogni referto coinvolto, notificare il paziente proprietario

### Scenario E — Processore notifica breach (Supabase/Vercel/etc.)

1. Il clock 72h parte dal momento in cui **noi** riceviamo la notifica
2. Valutare se ai loro dati coinvolti corrispondono nostri utenti
3. Se sì, replicare notifica al Garante + interessati con
   riferimento all'incidente upstream
