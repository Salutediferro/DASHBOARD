/**
 * Knowledge base placeholder · Agente di Ferro
 *
 * STATO: PLACEHOLDER. Contenuti definitivi attesi da:
 * - Matteo Trilli (Sales/Coach Manager): 5 esempi chat WhatsApp Coach SDF anonimizzati,
 *   top 3 obiezioni clienti, copy ufficiale tono brand.
 * - Giuseppe Maffucci (Operations): doc interno 9 pannelli con marker/prezzo lab/tempi/preparazione,
 *   lista Coach SDF nomi + specializzazioni per escalation umana.
 *
 * Le strutture qui sotto sono già nella forma giusta — basta sostituire i valori `placeholder: true`
 * con dati reali e l'Agente comincia a parlare con conoscenza SDF specifica.
 *
 * @see ../../../../99-EXTERNAL-INFO-NEEDED.md (handover folder Trilli) per checklist completa.
 */

// ============================================================
// 9 PANNELLI SDF · placeholder
// ============================================================

export type PanelInfo = {
  slug: string;
  nome: string;
  descrizione: string;
  markerInclusi: string[]; // nomi commerciali (testosterone totale, ALT, eGFR, ...)
  prezzoLabApproxEur: number | null;
  tempiConsegnaGiorni: number | null;
  preparazione: string; // es. "Digiuno 12h, prelievo mattino tra 7-9"
  placeholder: boolean; // true = dati ancora da confermare con Giuseppe
};

export const PANELS: PanelInfo[] = [
  {
    slug: "ferro-core",
    nome: "Ferro Core",
    descrizione: "Pannello base completo per chi inizia. Screening generale + testosterone.",
    markerInclusi: [
      "Testosterone totale",
      "Emocromo completo",
      "Glicemia",
      "Profilo lipidico",
      "Funzionalità epatica (ALT/AST)",
      "Funzionalità renale (creatinina, eGFR)",
      "TSH",
      "Vitamina D",
    ],
    prezzoLabApproxEur: null,
    tempiConsegnaGiorni: null,
    preparazione: "Digiuno 12 ore. Prelievo mattino preferibilmente tra 7-9 (per il testosterone).",
    placeholder: true,
  },
  {
    slug: "androgeno",
    nome: "Androgeno (Uomo Over 40)",
    descrizione: "Approfondimento ormoni maschili e parametri cardio-metabolici post-40.",
    markerInclusi: [
      "Testosterone totale e libero",
      "DHEA-S",
      "Estradiolo",
      "Prolattina",
      "PSA totale (>50 anni)",
    ],
    prezzoLabApproxEur: null,
    tempiConsegnaGiorni: null,
    preparazione: "Digiuno 12 ore. Mattino tra 7-9.",
    placeholder: true,
  },
  {
    slug: "cuore",
    nome: "Cuore",
    descrizione: "Marker cardiovascolari per chi si allena duro o ha familiarità.",
    markerInclusi: ["Profilo lipidico esteso", "Apolipoproteina B", "Lp(a)", "Omocisteina", "PCR ultrasensibile"],
    prezzoLabApproxEur: null,
    tempiConsegnaGiorni: null,
    preparazione: "Digiuno 12 ore.",
    placeholder: true,
  },
  {
    slug: "reni",
    nome: "Reni",
    descrizione: "Funzionalità renale dettagliata, importante per chi usa integratori proteici / sostanze.",
    markerInclusi: ["Creatinina", "eGFR", "Cistatina C", "Microalbuminuria", "Esame urine completo"],
    prezzoLabApproxEur: null,
    tempiConsegnaGiorni: null,
    preparazione: "Idratazione regolare. Niente integratori 48h prima per dato pulito.",
    placeholder: true,
  },
  {
    slug: "fegato",
    nome: "Fegato",
    descrizione: "Marker epatici per atleti, uso farmacologico o consumo alcol.",
    markerInclusi: ["ALT", "AST", "GGT", "Bilirubina diretta/indiretta", "Albumina", "Fosfatasi alcalina"],
    prezzoLabApproxEur: null,
    tempiConsegnaGiorni: null,
    preparazione: "Digiuno 12 ore. Niente alcol 48h prima.",
    placeholder: true,
  },
  {
    slug: "metabolico",
    nome: "Metabolico",
    descrizione: "Insulino-resistenza, controllo glicemico, marker metabolici.",
    markerInclusi: ["Glicemia a digiuno", "HbA1c", "Insulina basale", "HOMA-IR", "Profilo lipidico"],
    prezzoLabApproxEur: null,
    tempiConsegnaGiorni: null,
    preparazione: "Digiuno 12 ore.",
    placeholder: true,
  },
  {
    slug: "tiroide",
    nome: "Tiroide",
    descrizione: "Funzionalità tiroidea completa.",
    markerInclusi: ["TSH", "FT3", "FT4", "Anti-TPO", "Anti-TG"],
    prezzoLabApproxEur: null,
    tempiConsegnaGiorni: null,
    preparazione: "Mattino, prima dell'eventuale terapia tiroidea.",
    placeholder: true,
  },
  {
    slug: "recovery",
    nome: "Recovery",
    descrizione: "Marker recupero per atleti agonisti / overtraining check.",
    markerInclusi: ["Cortisolo mattutino", "DHEA-S", "Testosterone/Cortisolo ratio", "Ferritina", "Vitamina D", "PCR"],
    prezzoLabApproxEur: null,
    tempiConsegnaGiorni: null,
    preparazione: "Mattino tra 7-9. Non fare allenamento intenso 24h prima.",
    placeholder: true,
  },
  {
    slug: "donna",
    nome: "Donna",
    descrizione: "Profilo ormonale femminile, marker ferro, screening tiroide.",
    markerInclusi: ["FSH", "LH", "Estradiolo", "Progesterone", "Prolattina", "DHEA-S", "TSH", "Ferritina"],
    prezzoLabApproxEur: null,
    tempiConsegnaGiorni: null,
    preparazione: "Per ciclo regolare: prelievo 2°-5° giorno. Per menopausa: qualsiasi giorno. Mattino 7-9.",
    placeholder: true,
  },
];

// ============================================================
// PRICING SDF · 3 fatture (sito pubblico)
// ============================================================

export type PricingTier = {
  slug: string;
  nome: string;
  prezzoEur: number;
  periodicità: "una-tantum" | "mensile" | "annuale";
  descrizione: string;
  vantaggi: string[];
  link: string; // Stripe Payment Link
};

export const PRICING: PricingTier[] = [
  {
    slug: "consulenza",
    nome: "Consulenza singola + 1 mese membership",
    prezzoEur: 27,
    periodicità: "una-tantum",
    descrizione: "Ingresso più basso. Una chiamata 30 min con un Coach SDF + accesso 1 mese alla piattaforma.",
    vantaggi: [
      "Chiamata 30 minuti con Coach SDF",
      "Profilo personale + raccomandazioni pannelli",
      "1 mese di accesso piattaforma",
    ],
    link: "https://buy.stripe.com/5kQfZh3KY5wQ4Pj62o14400",
  },
  {
    slug: "membership-annuale",
    nome: "Membership annuale standard",
    prezzoEur: 197,
    periodicità: "annuale",
    descrizione: "Accesso completo 12 mesi. Equivalente €16,42/mese.",
    vantaggi: [
      "Accesso illimitato pannelli a prezzo lab convenzionato",
      "Coach SDF dedicato",
      "Reminder esami periodici personalizzati",
      "Coordinamento specialisti",
    ],
    link: "https://buy.stripe.com/3cIbJ12GU3oIgy18aw14401",
  },
  {
    slug: "founder-pass",
    nome: "Founder Pass · €119,88/anno (≈€9,99/mese) · 200 posti",
    prezzoEur: 119.88,
    periodicità: "annuale",
    descrizione: "Riservato ai primi 200 acquirenti. €119,88/anno (≈ €9,99/mese), prezzo BLOCCATO A VITA al rinnovo, pagabile in 3 rate con Klarna. Risparmio ~39% vs annuale regolare.",
    vantaggi: [
      "Tutti i vantaggi della membership annuale",
      "Prezzo bloccato a vita ai rinnovi successivi (€9,99/mese per sempre)",
      "Pagamento dilazionato in 3 rate con Klarna",
      "Status Founder visibile al Coach SDF",
      "Solo 200 posti totali (poi torna a €197/anno)",
    ],
    link: "https://buy.stripe.com/5kQ6oHgxKe3mftXbmI14402",
  },
];

// ============================================================
// FAQ · placeholder, top 5 domande Matteo (in attesa)
// ============================================================

export type FaqItem = {
  domanda: string;
  risposta: string;
  placeholder: boolean;
};

export const FAQ: FaqItem[] = [
  {
    domanda: "Salute di Ferro è una clinica?",
    risposta:
      "No. SDF è un Performance Health System: coordiniamo l'accesso a pannelli ematici e specialisti qualificati che parlano la lingua dell'atleta.",
    placeholder: false,
  },
  {
    domanda: "Quanto tempo per ricevere i referti?",
    risposta:
      "I tempi variano per pannello, generalmente 3-7 giorni lavorativi dal prelievo. Per i pannelli con esami ormonali specifici fino a 10 giorni. Il tuo Coach SDF ti aggiorna sullo stato.",
    placeholder: true,
  },
  {
    domanda: "Posso fare il pannello se uso o ho usato sostanze?",
    risposta:
      "Sì, anzi è ancora più importante monitorare. SDF lavora senza giudizio. I marker che includiamo nei pannelli androgeno, cuore, fegato e reni ti danno il quadro reale del tuo stato.",
    placeholder: false,
  },
  {
    domanda: "C'è un pannello dedicato per donne?",
    risposta:
      "Sì, il pannello DONNA include FSH, LH, Estradiolo, Progesterone, Prolattina, DHEA-S, TSH e Ferritina. Coordinato con specialisti che capiscono il ciclo, la menopausa e l'allenamento femminile.",
    placeholder: false,
  },
  {
    domanda: "Posso disdire la membership in qualsiasi momento?",
    risposta:
      "Sì, gestisci tutto dal Customer Portal Stripe. Per il Founder Pass annuale (€119,88/anno): il prezzo è pagato upfront o in 3 rate Klarna, non si rateizza il rimborso. Per la membership mensile (€24,99/mese): disdici quando vuoi, l'accesso resta fino a fine periodo già pagato.",
    placeholder: true,
  },
];

// ============================================================
// OBIEZIONI · placeholder, top 3 da Matteo (in attesa)
// ============================================================

export type Objection = {
  obiezione: string;
  risposta: string;
  placeholder: boolean;
};

export const OBJECTIONS: Objection[] = [
  {
    obiezione: "Costa troppo",
    risposta:
      "Costa troppo? 9,99€/mese con Founder Pass è quello che spendi in 2 caffè a settimana. Qui ti danno un Coach, pannelli mirati, tariffe scontate nei laboratori convenzionati per 12 mesi e prezzo bloccato A VITA. In più, accesso a una rete di Medici di Ferro che capiscono chi si allena. Ora chiediti: è ancora troppo? I posti sono 200, finiscono presto.",
    placeholder: false,
  },
  {
    obiezione: "Non capisco la differenza fra i pannelli",
    risposta:
      "Normale, sono 9 e dipendono dal tuo profilo. Fai il Test di Ferro (gratuito, 2 minuti) e ti suggeriamo automaticamente quello giusto. Oppure prenotati una consulenza €27 e te lo spiega un Coach in 30 minuti.",
    placeholder: true,
  },
  {
    obiezione: "Ho paura del prelievo / non ho tempo",
    risposta:
      "Il prelievo dura 5 minuti, fatto in laboratorio convenzionato vicino a te. SDF ti dice esattamente dove andare e quando. Per la paura: è normale, durante la prenotazione il Coach ti dà i dettagli e puoi anche venire accompagnato.",
    placeholder: true,
  },
];

// ============================================================
// REGOLE LINGUISTICHE BRAND
// ============================================================

export const BRAND_LANGUAGE_RULES = {
  evitareTermini: [
    "esami diagnostici", // → usa "esami del sangue"
    "percorso diagnostico", // → usa "percorso di analisi"
    "domanda clinica", // → usa "obiettivo di salute"
    "diagnosticare", // mai usare con utente
    "patologia", // ammesso solo in contesto educational generico
  ],
  formulazioniPreferite: [
    "i tuoi valori non rientrano nel range oggettivo", // invece di "sei malato"
    "questo dato richiede attenzione di un medico", // invece di "hai X malattia"
    "ne parliamo con un Coach SDF", // sempre quando dubbio clinico
  ],
};

// ============================================================
// ESCALATION COACH · placeholder, lista nomi+specializzazioni da Giuseppe
// ============================================================

export const COACH_ESCALATION_HINT =
  "Ti metto in contatto con un Coach SDF specializzato. Aprirò un ticket interno e ti contattano entro 24h via WhatsApp o email.";

// ============================================================
// SUMMARY per system prompt (concentrato lossless)
// ============================================================

export const KNOWLEDGE_BASE_SUMMARY = `
PANNELLI SDF (9 totali, alcuni dettagli ancora placeholder):
${PANELS.map((p) => `- ${p.nome} (${p.slug}): ${p.descrizione} Marker chiave: ${p.markerInclusi.slice(0, 4).join(", ")}.`).join("\n")}

PRICING (3 fatture sito):
${PRICING.map((t) => `- ${t.nome}: €${t.prezzoEur} ${t.periodicità}. ${t.descrizione}`).join("\n")}

FAQ TOP:
${FAQ.map((f) => `- Q: ${f.domanda}\n  A: ${f.risposta}`).join("\n")}

OBIEZIONI COMUNI:
${OBJECTIONS.map((o) => `- "${o.obiezione}" → ${o.risposta}`).join("\n")}

REGOLE LINGUISTICHE:
- Evitare: ${BRAND_LANGUAGE_RULES.evitareTermini.join(", ")}.
- Preferire: ${BRAND_LANGUAGE_RULES.formulazioniPreferite.join(", ")}.

ESCALATION COACH:
${COACH_ESCALATION_HINT}
`.trim();
