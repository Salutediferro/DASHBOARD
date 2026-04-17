/**
 * Single source of truth for legal / privacy text shown to users.
 *
 * These values are deliberately hard-coded (not env) so they can't be
 * changed silently per-environment. When the titolare del trattamento
 * is formally constituted, update DATA_CONTROLLER below and bump
 * LEGAL_LAST_UPDATED.
 *
 * ⚠️ REVIEW LEGALE RICHIESTA: i testi delle pagine /privacy, /terms e
 * /cookie-policy sono un template di qualità ma NON sono stati validati
 * da un DPO / avvocato. Prima di esporre il servizio a un numero
 * significativo di pazienti reali, far revisionare l'impianto.
 */

export const LEGAL_LAST_UPDATED = "2026-04-18";

export const DATA_CONTROLLER = {
  /** Full legal name of the data controller. Placeholder until the
   *  legal entity is constituted. */
  name: "Salute di Ferro — Titolare del trattamento in corso di costituzione",
  /** Contact for the exercise of data-subject rights. */
  email: "info@salutediferro.com",
  /** Data Protection Officer contact. Leave null until one is appointed. */
  dpoEmail: null as string | null,
  /** Supervisory authority for complaints (Italy). */
  supervisoryAuthority: {
    name: "Garante per la Protezione dei Dati Personali",
    website: "https://www.garanteprivacy.it",
  },
} as const;

/**
 * Data processors (Art. 28 GDPR) we rely on. Declared so they can be
 * listed in the privacy policy without drift from the real stack.
 */
export const DATA_PROCESSORS = [
  {
    name: "Supabase (Supabase Inc.)",
    purpose:
      "Database PostgreSQL, autenticazione, storage file sanitari (bucket privato)",
    location: "UE (eu-north-1 / Stockholm)",
    dpaUrl: "https://supabase.com/legal/dpa",
  },
  {
    name: "Vercel (Vercel Inc.)",
    purpose: "Hosting dell'applicazione, CDN, function runtime",
    location: "Stati Uniti — trasferimento ex Art. 46 GDPR (SCC)",
    dpaUrl: "https://vercel.com/legal/dpa",
  },
  {
    name: "Cloudflare (Cloudflare Inc.)",
    purpose: "DNS e gestione certificati per my.salutediferro.com",
    location: "Stati Uniti — trasferimento ex Art. 46 GDPR (SCC)",
    dpaUrl: "https://www.cloudflare.com/cloudflare-customer-dpa/",
  },
  {
    name: "Upstash (Upstash, Inc.)",
    purpose: "Rate limiter distribuito (contatori HTTP, no PII)",
    location: "UE (eu-west-1 / Dublin)",
    dpaUrl: "https://upstash.com/trust/dpa.pdf",
  },
] as const;

/**
 * Cookie categories used by the banner. Only "necessary" cookies are
 * set by default; the banner handles user opt-in for the rest.
 */
export const COOKIE_CATEGORIES = [
  {
    id: "necessary",
    label: "Strettamente necessari",
    description:
      "Indispensabili per il funzionamento del servizio (autenticazione, sicurezza, preferenze tema). Non richiedono consenso ai sensi dell'art. 122 Codice Privacy.",
    alwaysOn: true,
  },
  {
    id: "analytics",
    label: "Analytics anonimi",
    description:
      "Metriche aggregate di utilizzo dell'applicazione (pagine viste, errori) senza profilazione. Vengono attivati solo con il tuo consenso.",
    alwaysOn: false,
  },
] as const;

export type CookieCategoryId = (typeof COOKIE_CATEGORIES)[number]["id"];
