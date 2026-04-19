import {
  COOKIE_CATEGORIES,
  DATA_CONTROLLER,
  LEGAL_LAST_UPDATED,
} from "@/lib/legal/constants";

export const metadata = {
  title: "Cookie Policy — Salute di Ferro",
  description:
    "Informativa sull'uso dei cookie e delle tecnologie simili.",
};

export default function CookiePolicyPage() {
  return (
    <>
      <h1>Cookie Policy</h1>
      <p>
        La presente Cookie Policy descrive l&apos;uso di cookie e
        tecnologie simili (localStorage, sessionStorage) sul sito{" "}
        <strong>my.salutediferro.com</strong>, ai sensi del
        provvedimento del Garante del 10 giugno 2021 e della Direttiva
        ePrivacy 2002/58/CE.
      </p>
      <p className="text-muted-foreground text-sm">
        Ultimo aggiornamento: {LEGAL_LAST_UPDATED}
      </p>

      <h2>Che cos&apos;è un cookie</h2>
      <p>
        Un cookie è un piccolo file di testo che il sito invia al tuo
        dispositivo per memorizzare informazioni utili al suo
        funzionamento (es. lo stato di login) o per analizzarne
        l&apos;utilizzo. I cookie possono essere di sessione (si
        cancellano alla chiusura del browser) o persistenti.
      </p>

      <h2>Cookie utilizzati</h2>
      {COOKIE_CATEGORIES.map((cat) => (
        <section key={cat.id}>
          <h3>
            {cat.label}
            {cat.alwaysOn && (
              <span className="text-muted-foreground ml-2 text-xs font-normal">
                (sempre attivi)
              </span>
            )}
          </h3>
          <p>{cat.description}</p>
          {cat.id === "necessary" && (
            <ul>
              <li>
                <code>sb-*-auth-token</code> — Supabase: mantiene la
                sessione autenticata.
              </li>
              <li>
                <code>theme</code> — preferenza modalità chiara/scura
                (localStorage).
              </li>
              <li>
                <code>sdf-consent</code> — memorizza le tue preferenze
                sui cookie.
              </li>
            </ul>
          )}
          {cat.id === "analytics" && (
            <p className="text-muted-foreground text-sm">
              Quando e se attiveremo strumenti di analytics, questa
              sezione elencherà i cookie relativi. Al momento nessun
              cookie analitico viene impostato.
            </p>
          )}
        </section>
      ))}

      <h2>Come gestire i cookie</h2>
      <p>
        Puoi modificare le tue preferenze in qualsiasi momento cliccando
        sul bottone <em>Gestisci cookie</em> presente nel footer del
        sito, oppure cancellando il cookie <code>sdf-consent</code> dal
        tuo browser per far ricomparire il banner. I cookie strettamente
        necessari non sono disattivabili perché indispensabili al
        funzionamento del servizio (art. 122 Codice Privacy).
      </p>

      <h2>Titolare del trattamento</h2>
      <p>
        {DATA_CONTROLLER.name}
        <br />
        Contatto: <a href={`mailto:${DATA_CONTROLLER.email}`}>{DATA_CONTROLLER.email}</a>
      </p>
      <p>
        Per maggiori dettagli sul trattamento dei tuoi dati consulta
        l&apos;<a href="/privacy">informativa privacy</a>.
      </p>
    </>
  );
}
