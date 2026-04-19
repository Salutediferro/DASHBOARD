import { DATA_CONTROLLER, LEGAL_LAST_UPDATED } from "@/lib/legal/constants";

export const metadata = {
  title: "Termini e Condizioni — Salute di Ferro",
  description: "Condizioni generali di utilizzo della piattaforma.",
};

/**
 * Termini d'uso essenziali. Stile minimale e operativo — non sostituisce
 * una review legale completa (soprattutto per clausole di limitazione di
 * responsabilità sanitaria, che dipendono dalla natura giuridica del
 * titolare e dal rapporto con i professionisti della piattaforma).
 */
export default function TermsPage() {
  return (
    <>
      <h1>Termini e Condizioni d&apos;uso</h1>
      <p className="text-muted-foreground text-sm">
        Ultimo aggiornamento: {LEGAL_LAST_UPDATED}
      </p>

      <h2>1. Oggetto</h2>
      <p>
        I presenti termini regolano l&apos;utilizzo della piattaforma
        web <strong>Salute di Ferro</strong> (il &quot;Servizio&quot;),
        erogata da {DATA_CONTROLLER.name}, che permette a pazienti,
        medici e coach di coordinare un percorso di assistenza sanitaria
        e di benessere.
      </p>

      <h2>2. Registrazione e account</h2>
      <p>
        Per utilizzare il Servizio è necessario creare un account
        fornendo dati veritieri e aggiornati. L&apos;utente è
        responsabile della riservatezza delle proprie credenziali e di
        ogni attività condotta tramite il proprio account. Ogni utilizzo
        sospetto deve essere segnalato senza indugio a{" "}
        <a href={`mailto:${DATA_CONTROLLER.email}`}>{DATA_CONTROLLER.email}</a>.
      </p>
      <p>
        L&apos;accesso come <strong>DOCTOR</strong> o{" "}
        <strong>COACH</strong> è riservato a professionisti invitati
        dal titolare; l&apos;uso improprio di queste qualifiche è
        perseguibile ai sensi di legge.
      </p>

      <h2>3. Natura del servizio</h2>
      <p>
        Il Servizio è uno strumento di coordinamento e non sostituisce
        il parere, la diagnosi o il trattamento di un medico abilitato.
        I contenuti visualizzati in app non costituiscono prescrizione
        medica né autorizzano l&apos;auto-somministrazione di terapie.
        In caso di emergenza rivolgiti al numero unico 112.
      </p>

      <h2>4. Responsabilità dell&apos;utente</h2>
      <ul>
        <li>
          caricare esclusivamente dati, referti e immagini di propria
          pertinenza o su cui si abbia diritto di trattamento;
        </li>
        <li>
          non inserire contenuti illeciti, offensivi o lesivi dei
          diritti di terzi;
        </li>
        <li>
          non tentare di accedere ad aree del Servizio non autorizzate
          o di aggirarne le misure di sicurezza;
        </li>
        <li>
          non effettuare attività di scraping, reverse engineering o
          carico abusivo dell&apos;infrastruttura.
        </li>
      </ul>

      <h2>5. Proprietà intellettuale</h2>
      <p>
        Il software, la grafica e i contenuti editoriali del Servizio
        sono di proprietà del titolare o dei suoi licenzianti. È vietata
        ogni riproduzione non espressamente autorizzata. I dati
        personali e sanitari caricati dall&apos;utente restano di sua
        proprietà; il titolare li tratta nei soli limiti di cui
        all&apos;informativa privacy.
      </p>

      <h2>6. Sospensione e risoluzione</h2>
      <p>
        Il titolare può sospendere o terminare l&apos;accesso di un
        utente che violi i presenti termini o la legge, previa
        comunicazione via email quando possibile. L&apos;utente può
        cancellare il proprio account in qualsiasi momento dalla
        sezione Profilo, innescando la procedura GDPR di cancellazione
        descritta nell&apos;<a href="/privacy">informativa privacy</a>.
      </p>

      <h2>7. Limitazione di responsabilità</h2>
      <p>
        Il Servizio è fornito &quot;così com&apos;è&quot;, senza
        garanzie di continuità assoluta o idoneità a finalità
        specifiche. Nei limiti consentiti dalla legge, il titolare non
        risponde di danni indiretti, perdite di profitto, né di danni
        derivanti da utilizzo non conforme del Servizio. Resta
        impregiudicata la responsabilità per dolo, colpa grave e per
        la violazione di obblighi inderogabili di legge (incluso il
        GDPR).
      </p>

      <h2>8. Modifiche</h2>
      <p>
        Il titolare può aggiornare questi termini; le variazioni
        sostanziali ti saranno comunicate con almeno 15 giorni di
        preavviso via email o tramite notifica in app.
      </p>

      <h2>9. Legge applicabile e foro competente</h2>
      <p>
        I presenti termini sono regolati dalla legge italiana. Per ogni
        controversia è competente, in via esclusiva ove non
        derogabile, il Foro del consumatore (se applicabile) oppure il
        Foro della sede legale del titolare.
      </p>

      <h2>10. Contatti</h2>
      <p>
        Per qualsiasi comunicazione relativa ai presenti termini:{" "}
        <a href={`mailto:${DATA_CONTROLLER.email}`}>{DATA_CONTROLLER.email}</a>.
      </p>
    </>
  );
}
