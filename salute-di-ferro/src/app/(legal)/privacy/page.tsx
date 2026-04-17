import {
  DATA_CONTROLLER,
  DATA_PROCESSORS,
  LEGAL_LAST_UPDATED,
} from "@/lib/legal/constants";

export const metadata = {
  title: "Informativa Privacy — Salute di Ferro",
  description:
    "Informativa sul trattamento dei dati personali ai sensi del Regolamento UE 2016/679 (GDPR).",
};

/**
 * Informativa privacy ai sensi degli artt. 13 e 14 GDPR + art. 9 per i
 * dati sanitari. Testo base fornito dal committente; estensioni per le
 * sezioni GDPR-obbligatorie mancanti (destinatari, trasferimenti extra
 * UE, DPO, Autorità di controllo, minori, decisioni automatizzate).
 *
 * ⚠️ REVIEW LEGALE RICHIESTA prima del go-live su utenti reali.
 */
export default function PrivacyPage() {
  return (
    <>
      <h1>Informativa Privacy</h1>
      <p>
        Informativa ai sensi degli artt. 13 e 14 del Regolamento UE
        2016/679 (&quot;GDPR&quot;) e della normativa italiana di
        riferimento, con specifico riguardo al trattamento di
        <strong> dati relativi alla salute </strong>
        (categoria particolare ex art. 9 GDPR).
      </p>
      <p className="text-muted-foreground text-sm">
        Ultimo aggiornamento: {LEGAL_LAST_UPDATED}
      </p>

      <h2>1. Titolare del trattamento</h2>
      <p>
        {DATA_CONTROLLER.name}
        <br />
        Email: <a href={`mailto:${DATA_CONTROLLER.email}`}>{DATA_CONTROLLER.email}</a>
        {DATA_CONTROLLER.dpoEmail && (
          <>
            <br />
            Responsabile della Protezione dei Dati (DPO):{" "}
            <a href={`mailto:${DATA_CONTROLLER.dpoEmail}`}>
              {DATA_CONTROLLER.dpoEmail}
            </a>
          </>
        )}
      </p>

      <h2>2. Dati raccolti</h2>
      <p>Raccogliamo le seguenti categorie di dati:</p>
      <ul>
        <li>
          <strong>Dati identificativi</strong>: nome, cognome, email,
          telefono, data di nascita, codice fiscale, indirizzo di
          emergenza.
        </li>
        <li>
          <strong>Dati relativi alla salute</strong> (art. 9 GDPR):
          parametri biometrici (peso, composizione corporea,
          circonferenze, pressione arteriosa, frequenza cardiaca, sonno,
          glicemia, ecc.), referti medici e documentazione sanitaria,
          condizioni mediche, allergie, farmaci assunti, infortuni,
          questionari di check-in periodici.
        </li>
        <li>
          <strong>Dati di utilizzo del servizio</strong>: accessi, log
          operativi, indirizzo IP, user agent, interazioni con l&apos;
          applicazione.
        </li>
        <li>
          <strong>Cookie tecnici</strong>: necessari al funzionamento
          dell&apos;applicazione (sessione, preferenze di interfaccia).
          Per i dettagli vedi la{" "}
          <a href="/cookie-policy">Cookie Policy</a>.
        </li>
      </ul>

      <h2>3. Finalità e basi giuridiche</h2>
      <ul>
        <li>
          <strong>Erogazione del servizio di coordinamento sanitario</strong>
          — gestione del percorso di cura fra paziente, medico e coach,
          archiviazione di referti, parametri biometrici e
          appuntamenti. <em>Base giuridica</em>: art. 6(1)(b) GDPR
          (esecuzione di un contratto / misure precontrattuali).
        </li>
        <li>
          <strong>Trattamento di dati relativi alla salute</strong>
          {" "}— <em>Base giuridica</em>: art. 9(2)(a) GDPR (consenso
          esplicito dell&apos;interessato) in combinato con art. 9(2)(h)
          (finalità di medicina preventiva, diagnosi e assistenza
          sanitaria, sotto la responsabilità di un professionista
          soggetto a segreto professionale).
        </li>
        <li>
          <strong>Sicurezza della piattaforma</strong> — log di
          accesso, rate limiting, audit delle azioni sensibili.
          {" "}<em>Base giuridica</em>: art. 6(1)(f) GDPR (legittimo
          interesse alla sicurezza e prevenzione di abusi) e art. 32
          GDPR (misure tecniche adeguate).
        </li>
        <li>
          <strong>Analisi aggregate e miglioramento del servizio</strong>
          — solo con il tuo consenso esplicito (vedi banner cookie).
          {" "}<em>Base giuridica</em>: art. 6(1)(a) GDPR.
        </li>
        <li>
          <strong>Obblighi di legge</strong> (fatturazione, conservazione
          fiscale, richieste di autorità). <em>Base giuridica</em>:
          art. 6(1)(c) GDPR.
        </li>
      </ul>

      <h2>4. Conferimento dei dati</h2>
      <p>
        Il conferimento dei dati identificativi e sanitari è necessario
        per erogare il servizio: un eventuale rifiuto comporta
        l&apos;impossibilità di accedere alle funzionalità cliniche
        della piattaforma. Il consenso a finalità analitiche è
        facoltativo e revocabile senza conseguenze sul servizio.
      </p>

      <h2>5. Destinatari dei dati</h2>
      <p>
        I tuoi dati sono accessibili solo al personale autorizzato
        (medici, coach e amministratori) con cui hai una relazione
        attiva sulla piattaforma. L&apos;accesso ai referti medici è
        granulare: ogni documento è visibile solo ai professionisti che
        hai esplicitamente autorizzato, con permessi revocabili in
        qualsiasi momento.
      </p>
      <p>
        I dati sono trattati tramite i seguenti responsabili del
        trattamento (art. 28 GDPR), vincolati da contratto di
        trattamento dati:
      </p>
      <ul>
        {DATA_PROCESSORS.map((p) => (
          <li key={p.name}>
            <strong>{p.name}</strong> — {p.purpose}. Localizzazione:{" "}
            {p.location}.{" "}
            <a href={p.dpaUrl} target="_blank" rel="noopener noreferrer">
              DPA
            </a>
          </li>
        ))}
      </ul>

      <h2>6. Trasferimenti verso Paesi extra-UE</h2>
      <p>
        Alcuni dei nostri fornitori (Vercel, Cloudflare) hanno sede
        negli Stati Uniti. I trasferimenti avvengono sulla base delle
        Clausole Contrattuali Standard approvate dalla Commissione
        Europea (art. 46 GDPR) e/o delle certificazioni EU-U.S. Data
        Privacy Framework, ove applicabili. I dati sanitari sono
        archiviati all&apos;interno dell&apos;Unione Europea (Supabase,
        region eu-north-1) e non sono trasferiti al di fuori dell&apos;UE
        per finalità di storage.
      </p>

      <h2>7. Conservazione dei dati</h2>
      <ul>
        <li>
          <strong>Account attivo</strong>: i dati sono conservati per
          tutta la durata del rapporto di servizio.
        </li>
        <li>
          <strong>Dati sanitari</strong>: conservati fino a revoca del
          consenso o cancellazione dell&apos;account, nel rispetto degli
          obblighi di conservazione previsti dalla normativa sanitaria
          italiana (in particolare, ove applicabili, i tempi minimi di
          conservazione per cartelle cliniche e referti previsti dal
          Codice Deontologico Medico e dalle linee guida del Garante).
        </li>
        <li>
          <strong>Log di accesso e audit</strong>: conservati per 12
          mesi per finalità di sicurezza, poi anonimizzati o cancellati.
        </li>
        <li>
          <strong>Dati contabili</strong>: 10 anni come da normativa
          civilistico-fiscale.
        </li>
      </ul>

      <h2>8. I tuoi diritti</h2>
      <p>Ai sensi degli artt. 15-22 GDPR hai diritto di:</p>
      <ul>
        <li>accedere ai tuoi dati personali (art. 15);</li>
        <li>rettificare dati inesatti (art. 16);</li>
        <li>
          ottenere la cancellazione dei tuoi dati (&quot;diritto
          all&apos;oblio&quot;, art. 17) — la funzione è attiva
          direttamente in app dall&apos;area Profilo;
        </li>
        <li>richiedere la limitazione del trattamento (art. 18);</li>
        <li>
          ricevere i tuoi dati in formato strutturato e leggibile da
          dispositivo automatico (&quot;portabilità&quot;, art. 20) —
          export JSON disponibile in app;
        </li>
        <li>opporti al trattamento fondato su legittimo interesse (art. 21);</li>
        <li>
          non essere sottoposto a decisioni automatizzate incidenti
          sulla tua persona (art. 22): la piattaforma non opera
          profilazioni automatizzate con effetti giuridici o rilevanti
          sulla tua salute;
        </li>
        <li>
          revocare in qualsiasi momento i consensi prestati, senza
          pregiudizio della liceità dei trattamenti effettuati in
          precedenza.
        </li>
      </ul>
      <p>
        Per esercitare i tuoi diritti scrivi a{" "}
        <a href={`mailto:${DATA_CONTROLLER.email}`}>{DATA_CONTROLLER.email}</a>
        . Ti risponderemo entro 30 giorni (prorogabili di ulteriori 60
        in casi complessi).
      </p>

      <h2>9. Reclamo all&apos;autorità di controllo</h2>
      <p>
        Se ritieni che il trattamento dei tuoi dati violi il GDPR hai il
        diritto di proporre reclamo al{" "}
        <a
          href={DATA_CONTROLLER.supervisoryAuthority.website}
          target="_blank"
          rel="noopener noreferrer"
        >
          {DATA_CONTROLLER.supervisoryAuthority.name}
        </a>
        , ferma restando ogni altra tutela amministrativa o
        giurisdizionale.
      </p>

      <h2>10. Sicurezza</h2>
      <p>
        Adottiamo misure tecniche e organizzative adeguate al rischio
        elevato tipico dei dati sanitari (art. 32 GDPR):
      </p>
      <ul>
        <li>crittografia delle connessioni (HTTPS obbligatorio, HSTS);</li>
        <li>
          crittografia dei dati a riposo a livello di database e storage;
        </li>
        <li>
          autenticazione a più fattori per gli account professionali
          (DOCTOR, COACH, ADMIN);
        </li>
        <li>
          accessi ai documenti clinici mediati da URL firmati a tempo
          limitato;
        </li>
        <li>
          audit log inalterabile di ogni azione sensibile (accessi,
          upload/visualizzazione referti, modifica permessi, export,
          cancellazione);
        </li>
        <li>
          backup automatici con point-in-time recovery e test periodici
          di restore;
        </li>
        <li>
          separazione rigorosa dei ruoli e principio del minimo
          privilegio.
        </li>
      </ul>

      <h2>11. Minori</h2>
      <p>
        Il servizio non è rivolto a minori di 16 anni. Per i minori tra
        14 e 18 anni il trattamento dei dati sanitari è lecito solo con
        il consenso prestato dall&apos;esercente la responsabilità
        genitoriale. Qualora venissimo a conoscenza di un account
        registrato da un minore senza tale consenso, procederemo alla
        sua cancellazione.
      </p>

      <h2>12. Modifiche all&apos;informativa</h2>
      <p>
        Possiamo aggiornare la presente informativa in caso di
        evoluzioni normative o del servizio. Le modifiche sostanziali
        ti saranno comunicate via email e tramite notifica in app prima
        di divenire efficaci.
      </p>
    </>
  );
}
