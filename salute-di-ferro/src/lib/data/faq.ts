export type FaqCategory =
  | "ACCOUNT"
  | "BILLING"
  | "TRAINING"
  | "NUTRITION"
  | "TECHNICAL";

export type FaqItem = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  keywords: string[];
};

export const FAQS: FaqItem[] = [
  // ACCOUNT
  {
    id: "acc-1",
    category: "ACCOUNT",
    question: "Come cambio la password?",
    answer:
      "Vai su Profilo > Sicurezza > Cambia password. Inserisci la password attuale e poi quella nuova (minimo 8 caratteri, con almeno una maiuscola e un numero).",
    keywords: ["password", "cambio", "sicurezza", "modifica"],
  },
  {
    id: "acc-2",
    category: "ACCOUNT",
    question: "Come aggiorno i dati del mio profilo?",
    answer:
      "Vai su Profilo > Dati personali. Puoi modificare nome, data di nascita, peso, altezza e obiettivi. Le modifiche vengono sincronizzate col coach.",
    keywords: ["profilo", "dati", "aggiorna", "personali", "modifica"],
  },
  {
    id: "acc-3",
    category: "ACCOUNT",
    question: "Come cambio l'indirizzo email?",
    answer:
      "Profilo > Sicurezza > Cambia email. Riceverai un link di conferma al nuovo indirizzo: clicca entro 24 ore per completare il cambio.",
    keywords: ["email", "cambio", "indirizzo", "mail"],
  },
  {
    id: "acc-4",
    category: "ACCOUNT",
    question: "Ho dimenticato la password, come recupero l'accesso?",
    answer:
      "Dalla schermata di login clicca su 'Password dimenticata?' e inserisci la tua email. Ti invieremo un link per reimpostarla.",
    keywords: ["password", "dimenticata", "recupero", "accesso", "reset"],
  },
  {
    id: "acc-5",
    category: "ACCOUNT",
    question: "Come elimino il mio account?",
    answer:
      "Profilo > Impostazioni > Elimina account. L'eliminazione è definitiva dopo 14 giorni. In questo periodo puoi annullare la richiesta contattando il supporto.",
    keywords: ["elimina", "cancella", "account", "rimuovi"],
  },
  {
    id: "acc-6",
    category: "ACCOUNT",
    question: "Come aggiorno la foto profilo?",
    answer:
      "Profilo > tocca l'avatar in alto > Scegli foto. Supportiamo JPG e PNG fino a 5MB. Usa un ritratto frontale per riconoscerti meglio nei check-in.",
    keywords: ["foto", "avatar", "immagine", "profilo"],
  },

  // BILLING
  {
    id: "bil-1",
    category: "BILLING",
    question: "Come disdico il mio abbonamento?",
    answer:
      "Profilo > Abbonamento > Disdici. La disdetta sarà effettiva al termine del periodo già pagato, mantenendo l'accesso fino a quella data.",
    keywords: ["disdici", "cancella", "abbonamento", "disdetta", "annulla"],
  },
  {
    id: "bil-2",
    category: "BILLING",
    question: "Come cambio il piano di abbonamento?",
    answer:
      "Profilo > Abbonamento > Cambia piano. L'upgrade è immediato con conguaglio, il downgrade parte dal prossimo rinnovo.",
    keywords: ["piano", "abbonamento", "upgrade", "downgrade", "cambio"],
  },
  {
    id: "bil-3",
    category: "BILLING",
    question: "Dove trovo le mie fatture e ricevute?",
    answer:
      "Profilo > Abbonamento > Storico pagamenti. Puoi scaricare ogni fattura in PDF o riceverle via email.",
    keywords: ["fatture", "ricevute", "pagamenti", "storico", "pdf"],
  },
  {
    id: "bil-4",
    category: "BILLING",
    question: "Quando scade il mio abbonamento?",
    answer:
      "La data di scadenza è visibile in Profilo > Abbonamento. Riceverai una notifica 7 giorni prima del rinnovo automatico.",
    keywords: ["scade", "scadenza", "abbonamento", "rinnovo"],
  },
  {
    id: "bil-5",
    category: "BILLING",
    question: "Come richiedo un rimborso?",
    answer:
      "Entro 14 giorni dal primo pagamento puoi richiedere il rimborso completo scrivendo al supporto. Per rinnovi successivi valutiamo caso per caso.",
    keywords: ["rimborso", "refund", "soldi", "restituzione"],
  },
  {
    id: "bil-6",
    category: "BILLING",
    question: "Quali metodi di pagamento accettate?",
    answer:
      "Accettiamo carte Visa, Mastercard, American Express, Apple Pay, Google Pay e PayPal. Puoi aggiornare il metodo in Profilo > Abbonamento.",
    keywords: ["pagamento", "carta", "metodo", "paypal", "apple pay"],
  },

  // TRAINING
  {
    id: "tra-1",
    category: "TRAINING",
    question: "Come loggo un esercizio durante l'allenamento?",
    answer:
      "Apri la scheda del giorno, tocca l'esercizio e inserisci serie, ripetizioni e peso. Tocca 'Completa set' per passare al successivo.",
    keywords: ["logga", "esercizio", "allenamento", "registra", "set"],
  },
  {
    id: "tra-2",
    category: "TRAINING",
    question: "Dove vedo lo storico degli allenamenti?",
    answer:
      "Allenamento > Storico. Vedi tutti i workout completati con volume, durata e PR. Puoi filtrare per data o esercizio.",
    keywords: ["storico", "allenamenti", "passato", "cronologia"],
  },
  {
    id: "tra-3",
    category: "TRAINING",
    question: "Cosa significa RPE nelle mie schede?",
    answer:
      "RPE (Rate of Perceived Exertion) indica la difficoltà percepita su scala 1-10. RPE 8 = 2 reps in riserva, RPE 9 = 1, RPE 10 = massimale.",
    keywords: ["rpe", "sforzo", "intensità", "scala"],
  },
  {
    id: "tra-4",
    category: "TRAINING",
    question: "Quanto tempo di recupero devo fare tra le serie?",
    answer:
      "Il tempo di recupero è indicato sotto ogni esercizio. In generale: 2-3 min per forza, 60-90s per ipertrofia, 30-45s per condizionamento.",
    keywords: ["recupero", "pausa", "serie", "rest", "tempo"],
  },
  {
    id: "tra-5",
    category: "TRAINING",
    question: "Posso sostituire un esercizio se non ho l'attrezzo?",
    answer:
      "Sì. Tocca l'esercizio > 'Sostituisci' e scegli un'alternativa con lo stesso gruppo muscolare. Puoi anche chiedere all'AI Assistant.",
    keywords: ["sostituire", "esercizio", "alternativa", "attrezzo"],
  },
  {
    id: "tra-6",
    category: "TRAINING",
    question: "Dove vedo il mio allenamento di oggi?",
    answer:
      "Home > sezione 'Allenamento di oggi' oppure nella tab Allenamento. Se non è previsto nulla, compare 'Giorno di riposo'.",
    keywords: ["oggi", "allenamento", "programma", "workout"],
  },

  // NUTRITION
  {
    id: "nut-1",
    category: "NUTRITION",
    question: "Come sostituisco un alimento nel piano?",
    answer:
      "Nutrizione > tocca l'alimento > 'Sostituisci'. Ti proponiamo alternative con macro simili. Puoi anche chiedere all'AI Assistant.",
    keywords: ["sostituire", "alimento", "cibo", "alternativa"],
  },
  {
    id: "nut-2",
    category: "NUTRITION",
    question: "Dove vedo i macronutrienti giornalieri?",
    answer:
      "Nutrizione > intestazione mostra calorie, proteine, carboidrati e grassi totali del giorno con barra di avanzamento.",
    keywords: ["macro", "macronutrienti", "giornalieri", "calorie"],
  },
  {
    id: "nut-3",
    category: "NUTRITION",
    question: "Come sono calcolate le mie calorie giornaliere?",
    answer:
      "Il coach le imposta in base a peso, altezza, attività e obiettivo (definizione, mantenimento, massa). Vengono ricalcolate a ogni check-in.",
    keywords: ["calorie", "calcolo", "tdee", "fabbisogno"],
  },
  {
    id: "nut-4",
    category: "NUTRITION",
    question: "Posso aggiungere un cheat meal al diario?",
    answer:
      "Sì, tocca '+' nel pasto e scegli 'Pasto libero'. Registra comunque i macro stimati: serve al coach per valutare settimana e weekend.",
    keywords: ["cheat", "meal", "sgarro", "libero", "fuori"],
  },
  {
    id: "nut-5",
    category: "NUTRITION",
    question: "Gli integratori sono inclusi nel piano?",
    answer:
      "Gli integratori essenziali (proteine, creatina) sono suggeriti nel piano se utili al tuo obiettivo. Non sono obbligatori: parlane col coach.",
    keywords: ["integratori", "proteine", "creatina", "supplementi"],
  },
  {
    id: "nut-6",
    category: "NUTRITION",
    question: "Come segnalo allergeni o intolleranze?",
    answer:
      "Profilo > Preferenze alimentari > Allergeni. Il piano verrà filtrato automaticamente escludendo gli alimenti segnalati.",
    keywords: ["allergeni", "intolleranze", "allergia", "glutine", "lattosio"],
  },

  // TECHNICAL
  {
    id: "tec-1",
    category: "TECHNICAL",
    question: "L'app non si carica, cosa faccio?",
    answer:
      "Verifica la connessione, chiudi e riapri l'app. Se persiste, aggiorna all'ultima versione dallo store o reinstalla. Contatta il supporto se il problema continua.",
    keywords: ["app", "carica", "blocca", "non funziona", "crash"],
  },
  {
    id: "tec-2",
    category: "TECHNICAL",
    question: "Il video di un esercizio non parte",
    answer:
      "Verifica la connessione e che i cookie di terze parti siano abilitati. In modalità offline i video non sono disponibili: scaricali in anticipo dalla scheda.",
    keywords: ["video", "non parte", "riproduzione", "esercizio"],
  },
  {
    id: "tec-3",
    category: "TECHNICAL",
    question: "Non ricevo le notifiche push",
    answer:
      "Impostazioni app > Notifiche: verifica che siano attive. Su iOS controlla anche Impostazioni sistema > Notifiche > Salute di Ferro.",
    keywords: ["notifiche", "push", "avvisi", "silenzio"],
  },
  {
    id: "tec-4",
    category: "TECHNICAL",
    question: "Come collego il mio smartwatch?",
    answer:
      "Profilo > Integrazioni > scegli Apple Health, Garmin o Google Fit. Autorizza la lettura di passi, frequenza cardiaca e allenamenti.",
    keywords: ["smartwatch", "sync", "apple watch", "garmin", "integrazione"],
  },
  {
    id: "tec-5",
    category: "TECHNICAL",
    question: "Come segnalo un bug?",
    answer:
      "Profilo > Aiuto > Segnala un problema. Allega uno screenshot e descrivi cosa stavi facendo: il team tecnico risponde entro 48 ore.",
    keywords: ["bug", "problema", "errore", "segnala"],
  },
  {
    id: "tec-6",
    category: "TECHNICAL",
    question: "Come resetto la cache dell'app?",
    answer:
      "Profilo > Impostazioni > Svuota cache. I dati sincronizzati col server restano intatti, vengono rimossi solo i file temporanei.",
    keywords: ["cache", "reset", "svuota", "pulisci"],
  },
];

export function searchFaqs(query: string, limit = 5): FaqItem[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9àèéìòù]+/i)
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return [];

  const scored = FAQS.map((faq) => {
    const haystack =
      `${faq.question} ${faq.answer} ${faq.keywords.join(" ")}`.toLowerCase();
    let score = 0;
    for (const tok of tokens) {
      if (haystack.includes(tok)) score += 1;
    }
    return { faq, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.faq);

  return scored;
}
