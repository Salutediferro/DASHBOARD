# Compliance documentation

Raccolta di documenti di accountability GDPR per Salute di Ferro.
**Bozze tecniche** prodotte dal team di sviluppo — **da revisionare e
firmare** da un DPO qualificato prima del lancio commerciale.

## Indice

- [DPIA.md](./DPIA.md) — Valutazione d'impatto sulla protezione dei
  dati (art. 35 GDPR). Obbligatoria per dati sanitari su larga scala.
- [registro-trattamenti.md](./registro-trattamenti.md) — Registro dei
  trattamenti (art. 30 GDPR). Tabella di ogni trattamento attivo.
- [incident-response.md](./incident-response.md) — Workflow operativo
  per data breach, incluse procedure di notifica al Garante (72h) e
  agli interessati.
- [data-retention.md](./data-retention.md) — Policy di conservazione
  dati e backup.
- [../DPA.md](../DPA.md) — Checklist e istruzioni per firmare i DPA
  con ciascun processore.

## Come usarli

Questi documenti servono a **dimostrare** al Garante, su richiesta,
che conosciamo la natura dei nostri trattamenti, i rischi, le misure
di sicurezza e i termini di conservazione. Non sono documenti da
esporre all'utente (per quello c'è `/privacy`, `/cookie-policy`,
`/terms`, `/subprocessors`).

Il DPO:

1. Rivede ciascun documento completandolo con le valutazioni specifiche
   del contesto del titolare (es. rischio residuo nella DPIA, scelte
   opzionali nella data-retention)
2. Firma e data ogni documento
3. Conserva i PDF firmati nel vault legal (non in repo)
4. Ri-verifica i documenti almeno una volta l'anno e dopo ogni
   cambiamento sostanziale del trattamento

## Contatti

- DPO: _da nominare_
- Titolare: _da costituire_
- Tech: `info@salutediferro.com`
