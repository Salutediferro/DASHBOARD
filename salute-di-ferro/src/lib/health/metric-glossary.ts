/**
 * Plain-language descriptions and "how/when to measure" hints for the
 * biometric metrics the patient sees on the health page. Two surfaces
 * read from this:
 *
 *   - `description` is shown under the chart subtitle and as a hover
 *     tooltip on the rings, so a patient who's not sure what e.g.
 *     "HRV" or "FC riposo" actually means can read a one-liner without
 *     leaving the page.
 *   - `measure` is rendered as the small grey hint below the input in
 *     the "Aggiungi rilevazione" form. Use it for metrics whose number
 *     only makes sense if the measurement was taken correctly (e.g.
 *     blood pressure after 5 minutes of rest).
 *
 * Keys are BiometricLog primary-field names — same vocabulary as
 * `metric-direction.ts`.
 */

export type MetricGlossaryEntry = {
  description?: string;
  measure?: string;
};

export const METRIC_GLOSSARY: Record<string, MetricGlossaryEntry> = {
  weight: {
    description: "Peso corporeo totale.",
    measure:
      "Pesati al mattino, dopo il bagno e prima di colazione, scalzo e con abbigliamento minimo.",
  },
  bmi: {
    description: "Indice di Massa Corporea (BMI), calcolato come peso ÷ altezza².",
  },
  bodyFatPercentage: {
    description: "Percentuale di massa grassa rispetto al peso totale.",
    measure: "Da bilancia bioimpedenziometrica o plicometro.",
  },
  muscleMassKg: {
    description: "Massa muscolare scheletrica in chilogrammi.",
    measure: "Da bilancia bioimpedenziometrica.",
  },
  bodyWaterPct: {
    description: "Percentuale di acqua corporea totale.",
    measure: "Da bilancia bioimpedenziometrica.",
  },
  waistCm: {
    description: "Circonferenza vita — indicatore di rischio metabolico.",
    measure:
      "Misura sopra l'ombelico a fine espirazione, senza stringere il metro né trattenere il fiato.",
  },
  hipsCm: {
    description: "Circonferenza fianchi.",
    measure: "Misura nel punto più largo dei glutei, in piedi a piedi uniti.",
  },
  chestCm: {
    description: "Circonferenza torace.",
    measure: "Misura all'altezza dei capezzoli, a fine espirazione normale.",
  },
  armsCm: {
    description: "Circonferenza braccio (bicipite contratto o rilassato — sii coerente).",
    measure: "A metà fra spalla e gomito. Mantieni sempre la stessa modalità (rilassato o contratto).",
  },
  thighCm: {
    description: "Circonferenza coscia.",
    measure: "Misura a circa 10 cm dalla piega dell'inguine, in piedi.",
  },
  calvesCm: {
    description: "Circonferenza polpaccio.",
    measure: "Nel punto più largo, in piedi con peso distribuito.",
  },

  systolicBP: {
    description:
      "Pressione arteriosa sistolica (massima) — la pressione nei vasi quando il cuore si contrae.",
    measure:
      "Dopo 5–15 minuti di riposo, seduti, schiena appoggiata, braccio all'altezza del cuore. Non parlare durante la misurazione.",
  },
  diastolicBP: {
    description:
      "Pressione arteriosa diastolica (minima) — la pressione nei vasi tra un battito e l'altro.",
    measure:
      "Stessa misurazione della sistolica: 5–15 minuti di riposo, seduti, braccio all'altezza del cuore.",
  },
  restingHR: {
    description:
      "Frequenza cardiaca a riposo: battiti al minuto quando il corpo è rilassato.",
    measure:
      "Misura al mattino appena svegli, prima di alzarti dal letto, oppure dopo 10 minuti di riposo.",
  },
  spo2: {
    description: "Saturazione di ossigeno nel sangue arterioso.",
    measure:
      "Dito fermo nel pulsiossimetro per 30 secondi, mano calda e ferma. Aspetta che il valore si stabilizzi.",
  },
  hrv: {
    description:
      "Variabilità della frequenza cardiaca: la differenza fra un battito e il successivo. Un HRV alto indica buon recupero.",
    measure:
      "Misura al mattino appena svegli, in posizione supina, dopo qualche respiro lento. Da fascia toracica o smartwatch dedicato.",
  },

  glucoseFasting: {
    description: "Glicemia a digiuno — livello di zucchero nel sangue 8 ore dopo l'ultimo pasto.",
    measure: "Dopo almeno 8 ore di digiuno, al mattino prima di colazione.",
  },
  glucosePostMeal: {
    description: "Glicemia post-prandiale — livello di zucchero 2 ore dopo il pasto.",
    measure: "Esattamente 2 ore dopo l'inizio del pasto principale.",
  },
  ketones: {
    description: "Chetoni nel sangue — indice di chetosi (utile in dieta chetogenica).",
    measure: "Da chetonemetro a digiuno o secondo indicazioni del professionista.",
  },
  bodyTempC: {
    description: "Temperatura corporea.",
    measure: "Termometro auricolare o ascellare, sempre nello stesso modo.",
  },

  sleepHours: {
    description: "Ore totali di sonno della notte precedente.",
    measure:
      "Calcolato in automatico da 'A letto' e 'Sveglia' se le compili — oppure inseriscilo a mano.",
  },
  sleepQuality: {
    description: "Auto-valutazione qualità del sonno (1 = pessima, 10 = ottima).",
  },
  sleepAwakenings: {
    description: "Numero di risvegli durante la notte.",
  },

  steps: {
    description: "Passi totali nella giornata.",
    measure: "Da smartwatch / fitness tracker / app sul telefono.",
  },
  caloriesBurned: {
    description: "Calorie bruciate totali (metabolismo basale + attività).",
    measure: "Da smartwatch / fitness tracker.",
  },
  activeMinutes: {
    description: "Minuti di attività fisica medio-intensa nella giornata.",
    measure: "Da smartwatch / fitness tracker.",
  },
  distanceKm: {
    description: "Distanza percorsa in chilometri (camminata + corsa).",
    measure: "Da smartwatch / fitness tracker.",
  },
};

export function glossaryFor(primaryKey: string): MetricGlossaryEntry | undefined {
  return METRIC_GLOSSARY[primaryKey];
}
