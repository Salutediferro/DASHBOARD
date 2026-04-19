# DPA — Data Processing Agreements

> Art. 28 GDPR requires a Data Processing Agreement (DPA) with every
> external service that processes personal data on our behalf. For a
> health service handling Art. 9 data this is **not optional**: without
> signed DPAs we lose the lawful basis to use the processor at all, and
> any data leak turns into a direct finding for us.

## Status (fill in as you go)

| Processor       | DPA signed? | Date       | Stored where?        |
| --------------- | ----------- | ---------- | -------------------- |
| Supabase        | ☐           |            |                      |
| Vercel          | ☐           |            |                      |
| Cloudflare      | ☐           |            |                      |
| Upstash         | ☐           |            |                      |
| Resend          | ☐           |            |                      |
| Sentry          | ☐ (if used) |            |                      |
| Plausible       | ☐ (if used) |            |                      |

Store the signed PDFs in a **durable, access-controlled location**
(e.g. 1Password Business "Legal" vault, or a restricted Google Drive
folder). Do **not** commit them to this git repo.

## How to sign each

### 1. Supabase

- Log into supabase.com → your org.
- Settings → Legal → **Data Processing Agreement**.
- Click "Sign DPA"; fill in titolare, email, sede legale.
- Download the countersigned PDF they return.
- Reference: https://supabase.com/legal/dpa

### 2. Vercel

- Log into vercel.com → team `Salute di ferro's projects`.
- Settings → Security → **Sign DPA** (Pro / Enterprise only — on
  Hobby/Free it's auto-accepted via ToS; keep a PDF of the ToS page
  anyway).
- If/when you upgrade, re-sign on the paid plan — the Pro DPA has
  stronger commitments.
- Reference: https://vercel.com/legal/dpa

### 3. Cloudflare

- dash.cloudflare.com → profile → Legal → **Data Processing Addendum**.
- "Accept" with account details; PDF is emailed.
- Reference: https://www.cloudflare.com/cloudflare-customer-dpa/

### 4. Upstash

- console.upstash.com → Account → Billing → **DPA**.
- Countersigned PDF emailed.
- Reference: https://upstash.com/trust/dpa.pdf

### 5. Resend (when you start using it)

- resend.com → Settings → Compliance → **Data Processing Agreement**.
- Click "Request DPA"; they email back a signed copy.
- Reference: https://resend.com/legal/dpa

### 6. Sentry (if you turn on browser error capture)

- sentry.io → Organization → Settings → **Data Processing Agreement**.
- Free tier allows self-service sign.
- Reference: https://sentry.io/legal/dpa/

### 7. Plausible (if you activate analytics)

- Plausible.io DPA is pre-signed in the EU Terms. Download the PDF
  from the footer → Legal → DPA.
- No ceremony required; store the PDF.

## After signing

1. Update the table above with the date and storage location.
2. In `src/lib/legal/constants.ts`, verify the `DATA_PROCESSORS` entry
   for each — keep the DPA URLs pointing at the canonical public page.
3. If a processor is decommissioned (e.g. we stop using Cloudflare),
   remove it from both `DATA_PROCESSORS` and this checklist in the
   same commit.

## Annual review

Once a year (or when any processor changes its DPA materially), re-read
each document and re-sign if needed. Block an hour, work through the
list top-to-bottom. Update the "Date" column.

## Why each one is on the list

- **Supabase** — owns the patient database and the medical-reports
  storage bucket. Processes Art. 9 data. DPA is the single most
  important signature.
- **Vercel** — hosts the app; processes IPs and the bodies of every
  HTTP request that reaches a function. No persistent storage of
  patient data, but transient processing still triggers Art. 28.
- **Cloudflare** — resolves DNS for `my.salutediferro.com`; does not
  proxy our traffic today (DNS-only mode) so the exposure is minimal.
  Keep the DPA anyway in case proxying is enabled later.
- **Upstash** — stores rate-limit counters. No PII, just `scope:ip`
  counters, but IP is personal data under GDPR — DPA required.
- **Resend** — sends transactional emails. The email body contains
  the recipient's name and the name of the inviting professional;
  both are personal data.
- **Sentry** — error monitoring. We configure `sendDefaultPii: false`
  so no user IDs or bodies are forwarded, but stack traces can still
  contain fragments of data — DPA required.
- **Plausible** — cookieless, but the hashed IP-derived fingerprint
  is still personal data under GDPR recitals. DPA required (trivially
  signed via their legal page).
