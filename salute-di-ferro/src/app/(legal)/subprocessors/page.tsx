import {
  DATA_CONTROLLER,
  DATA_PROCESSORS,
  LEGAL_LAST_UPDATED,
} from "@/lib/legal/constants";

export const metadata = {
  title: "Sub-responsabili del trattamento — Salute di Ferro",
  description:
    "Elenco aggiornato dei responsabili del trattamento (art. 28 GDPR) a cui Salute di Ferro affida l'elaborazione di dati personali.",
};

export default function SubprocessorsPage() {
  return (
    <>
      <h1>Sub-responsabili del trattamento</h1>
      <p>
        Questa pagina elenca, ai sensi dell&apos;art. 28 GDPR e in
        applicazione del principio di trasparenza di cui all&apos;art.
        13, tutti i soggetti terzi che{" "}
        <strong>trattano dati personali per conto del Titolare</strong>{" "}
        nell&apos;erogazione del servizio Salute di Ferro.
      </p>
      <p className="text-muted-foreground text-sm">
        Ultimo aggiornamento: {LEGAL_LAST_UPDATED}
      </p>

      <h2>Titolare del trattamento</h2>
      <p>
        <strong>{DATA_CONTROLLER.name}</strong>
        <br />
        Contatti per l&apos;esercizio dei diritti:{" "}
        <a href={`mailto:${DATA_CONTROLLER.email}`}>
          {DATA_CONTROLLER.email}
        </a>
        {DATA_CONTROLLER.dpoEmail && (
          <>
            <br />
            Responsabile Protezione Dati (DPO):{" "}
            <a href={`mailto:${DATA_CONTROLLER.dpoEmail}`}>
              {DATA_CONTROLLER.dpoEmail}
            </a>
          </>
        )}
      </p>

      <h2>Elenco processori</h2>
      <p>
        Ogni processore di seguito elencato è stato selezionato sulla
        base di garanzie sufficienti per attuare misure tecniche e
        organizzative adeguate, ed è vincolato al Titolare da un{" "}
        <strong>Data Processing Agreement (DPA)</strong> ai sensi
        dell&apos;art. 28.3 GDPR.
      </p>

      <div className="not-prose mt-6 flex flex-col gap-4">
        {DATA_PROCESSORS.map((p) => (
          <div
            key={p.name}
            className="border-border bg-card flex flex-col gap-2 rounded-lg border p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold">{p.name}</h3>
              <a
                href={p.dpaUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary text-xs hover:underline"
              >
                Leggi il DPA →
              </a>
            </div>
            <dl className="text-muted-foreground grid grid-cols-1 gap-1 text-xs sm:grid-cols-[120px_1fr]">
              <dt className="font-medium">Finalità</dt>
              <dd>{p.purpose}</dd>
              <dt className="font-medium">Categorie dati</dt>
              <dd>{p.categories}</dd>
              <dt className="font-medium">Localizzazione</dt>
              <dd>{p.location}</dd>
            </dl>
          </div>
        ))}
      </div>

      <h2>Trasferimenti extra-UE</h2>
      <p>
        Alcuni processori elencati sopra hanno infrastruttura con sede
        negli Stati Uniti. In questi casi il trasferimento avviene sulla
        base delle <strong>Standard Contractual Clauses (SCC)</strong>{" "}
        adottate dalla Commissione Europea nel 2021, incluse come parte
        integrante del DPA firmato con ciascun processore. A ciò si
        aggiungono le seguenti misure supplementari:
      </p>
      <ul>
        <li>
          I dati clinici strutturati e i referti medici sono archiviati
          esclusivamente su Supabase in territorio UE (eu-north-1).
          Nessuna copia sincronica è trasferita fuori UE.
        </li>
        <li>
          I dati che transitano attraverso i processori USA (Vercel,
          Cloudflare, Resend, Sentry) sono limitati a quanto
          strettamente necessario per l&apos;erogazione della loro
          funzione specifica.
        </li>
        <li>
          Cloudflare è configurato in modalità DNS-only: il nostro
          traffico applicativo non passa dal loro proxy e non è
          ispezionabile lato Cloudflare.
        </li>
      </ul>

      <h2>Notifica di variazioni</h2>
      <p>
        In caso di modifica dell&apos;elenco (aggiunta / rimozione di un
        processore, cambio di finalità o localizzazione), questa pagina
        verrà aggiornata contestualmente al deploy del cambiamento. Se
        desideri ricevere una notifica proattiva delle modifiche, puoi
        scrivere a{" "}
        <a href={`mailto:${DATA_CONTROLLER.email}`}>
          {DATA_CONTROLLER.email}
        </a>
        .
      </p>

      <h2>Come esercitare i tuoi diritti</h2>
      <p>
        Puoi esercitare in qualsiasi momento i diritti previsti dagli
        artt. 15-22 GDPR — in particolare il diritto di accesso, di
        rettifica, di cancellazione e di opposizione al trattamento —
        scrivendo a{" "}
        <a href={`mailto:${DATA_CONTROLLER.email}`}>
          {DATA_CONTROLLER.email}
        </a>{" "}
        o utilizzando le funzioni self-service della dashboard (export
        dati, cancellazione account).
      </p>
      <p>
        Hai inoltre il diritto di proporre reclamo al{" "}
        <a
          href={DATA_CONTROLLER.supervisoryAuthority.website}
          target="_blank"
          rel="noreferrer"
        >
          {DATA_CONTROLLER.supervisoryAuthority.name}
        </a>
        .
      </p>
    </>
  );
}
