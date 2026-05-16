# Agente di Ferro · Dashboard Live · Setup Production

> Stato: **dashboard proattiva pronta LIVE** · chat conversazionale **interna** in attesa di setup AI Gateway + audit log + DPA Anthropic + pen-test.
> Ultimo aggiornamento: 2026-05-16.

## Cosa va LIVE

La pagina `/dashboard/patient/agente` mostra all'utente loggato (PATIENT/ADMIN):

- Greeting personalizzato (template deterministico, MAI chiamate AI in questa fase)
- Mission del giorno
- Stats biometriche (peso, BP, sonno, energia)
- Action plan top 5 (Server Actions optimistic con cross-check ownership Prisma)
- Body system grid expandable (Recovery, Ormoni, Cardio, Metabolico, Energia)
- Placeholder "Hai una domanda?" con CTA verso il Coach umano

La sidebar mostra la voce "Agente di Ferro" tra Notifiche e Messaggi (gruppo Interazioni).

## Cosa resta interno

La chat conversazionale `/dashboard/patient/agente/chat`:

- Redirect a `/dashboard/patient/agente` se feature flag chat OFF
- I 3 chip suggested NON sono mostrati nell'AgentCTA quando chat OFF
- Chat sarà attivata dopo:
  - Setup AI Gateway zero-data-retention + `AI_GATEWAY_API_KEY` o `VERCEL_OIDC_TOKEN`
  - Migration Prisma per persistenza AuditLog `AI_MESSAGE` / `AI_BLOCKED`
  - Penetration test prompt injection con copertura jailbreak IT/EN
  - DPA Anthropic + SCC EU documentati in `Operations/`

## Variabili di ambiente production

Da settare su Vercel (Production environment):

### Obbligatorie

```bash
# Database (Supabase prod pooler)
DATABASE_URL=postgresql://postgres.[ref]:[password]@[host]:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.[ref]:[password]@[host]:5432/postgres

# Supabase (auth + storage)
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]   # server only, MAI esporre

# Feature flag dashboard proattiva (LIVE)
NEXT_PUBLIC_ENABLE_AGENTE_FERRO=1

# Forza fallback template per il greeting (no chiamate Anthropic)
MOCK_AGENTE=true
```

### Da NON settare in production (per ora)

```bash
# Chat AI conversazionale: lasciare assente o "0"
NEXT_PUBLIC_ENABLE_AGENTE_CHAT     # assente o "0" → chat disabilitata

# Auth AI provider: non servono finché chat OFF e MOCK_AGENTE=true
AI_GATEWAY_API_KEY
VERCEL_OIDC_TOKEN
ANTHROPIC_API_KEY

# Dev bypass: MAI in production
NEXT_PUBLIC_DEV_BYPASS              # assente o "0"
DEV_MOCK_USER_ID                    # solo dev/preview
```

### Quando attiveremo la chat (futuro)

```bash
NEXT_PUBLIC_ENABLE_AGENTE_CHAT=1
AI_GATEWAY_API_KEY=[gateway-token]   # o VERCEL_OIDC_TOKEN auto su Vercel
MOCK_AGENTE=false                    # opzionale: false per LLM reale, true per template
AGENTE_FERRO_MODEL=anthropic/claude-haiku-4.5   # default già impostato nel codice
```

## Comandi di deploy

Andrea / Simo (team `salute-di-ferros-projects` su Vercel):

```bash
# Pull env Production locali (per smoke test)
vercel pull --yes --environment=production

# Build prebuilt + deploy production
vercel build --prod
vercel deploy --prebuilt --prod
```

In alternativa, push su `main` triggera automaticamente la build + deploy se Git
integration è attiva (verificare in Project Settings → Git su Vercel).

## Smoke test post-deploy

```bash
# Dashboard proattiva
curl -I https://[prod-url]/dashboard/patient/agente
# Atteso: HTTP 302 → /login (se non auth) oppure HTTP 200 (se auth)

# Chat (deve redirect a /agente quando chat off)
curl -IL https://[prod-url]/dashboard/patient/agente/chat
# Atteso: HTTP 302 → /dashboard/patient/agente (chat off) oppure 200 (chat on)
```

Test manuali in browser con utente paziente reale:

- [ ] Sidebar contiene voce "Agente di Ferro"
- [ ] Click sulla voce porta a `/dashboard/patient/agente`
- [ ] Header pagina mostra h1 "Agente di Ferro" + greeting (template)
- [ ] Mission, stats strip, action plan, body system grid renderizzati
- [ ] Card "Hai una domanda?" mostra CTA "Parla con il Coach"
- [ ] Click su CTA porta a `/dashboard/patient/team`
- [ ] Tentativo navigare manualmente a `/dashboard/patient/agente/chat` → redirect a `/agente`
- [ ] Skip link "Salta al contenuto" raggiungibile premendo Tab da inizio pagina
- [ ] Disclaimer AI Act visibile in cima alla pagina

## Hardening security già applicato

- IDOR Server Actions: `userId` derivato server-side da Supabase auth, mai dal client.
- Cross-check ownership Prisma su `markTherapyTaken`, `dismissAction`, `completeCheckIn`.
- Next.js 16.2.6 (13 advisories HIGH chiuse).
- API handler `/api/agente-ferro` con role check `PATIENT`/`ADMIN`.
- Detector parole vietate: 16 pattern jailbreak IT/EN + emergency + clinical-action + output-side detection.
- A11y WCAG 2.2 AA: skip link, h1/h2/h3 hierarchy, aria-labelledby, aria-current step, live region Server Action announce, tono 3 livelli MAI red destructive su clinici.
- Disclaimer UE AI Act art. 50 (transparency) sempre visibile.

## Rollback

In caso di issue post-deploy:

```bash
# Disabilita la dashboard via env var (no rebuild necessario, solo redeploy)
vercel env rm NEXT_PUBLIC_ENABLE_AGENTE_FERRO production
vercel deploy --prod --force

# Oppure rollback al deployment precedente
vercel rollback
```

Senza `NEXT_PUBLIC_ENABLE_AGENTE_FERRO=1` la pagina `/dashboard/patient/agente`
fa redirect a `/dashboard/patient` e la voce sidebar resta visibile ma punta a
una rotta non più attiva (TODO: gating sidebar in patientNav su prossima sprint
se serve hide completo).
