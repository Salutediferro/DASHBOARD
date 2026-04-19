# Salute di Ferro — Dashboard (monorepo)

Questo file vale per **entrambi** i progetti del monorepo:
- `salute-di-ferro/` — dashboard web (Next.js)
- `sdf-mobile/` — app mobile (Expo / React Native)

Per istruzioni tecniche specifiche di ciascun progetto, leggere anche il `CLAUDE.md` / `AGENTS.md` dentro la rispettiva cartella.

---

## Team

Progetto sviluppato da **Andrea Brognera** (`broger10`) e **Simo** (`simoneyCash`), co-founder di Leone. Entrambi possono toccare qualsiasi parte del codice — non ci sono aree di ownership esclusiva. Spesso si lavora in giorni alterni: quello che subentra deve poter leggere `main` e capire in che stato è il progetto.

## Workflow Git — obbligatorio

**Regola d'oro: non si lavora mai direttamente su `main`. Mai.**

Ogni volta che devi modificare codice:

1. **Allineati con `main`**
   ```bash
   git checkout main && git pull
   ```

2. **Crea un branch descrittivo** usando uno di questi prefissi:
   - `feat/...` → nuova funzionalità
   - `fix/...` → bug fix
   - `chore/...` → manutenzione, config, dipendenze
   - `refactor/...` → rifattorizzazione senza cambio di comportamento
   - `docs/...` → solo documentazione

   ```bash
   git checkout -b feat/nome-descrittivo-breve
   ```

3. **Lavora nel tuo branch.** Commit frequenti e piccoli. Usa [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat(auth): add 2FA recovery codes
   fix(mobile): crash on empty patient list
   chore(ci): bump node to 24
   ```
   Scope comuni: `auth`, `patient`, `doctor`, `coach`, `messages`, `mobile`, `ci`, `db`, `compliance`.

4. **Pusha e apri una Pull Request**
   ```bash
   git push -u origin <nome-branch>
   gh pr create --fill
   ```

5. **Aspetta la CI verde**, poi auto-merge (siamo due, lavoriamo asincroni — non bloccarsi aspettando review).

6. **Avvisa l'altro in chat** con una riga: "mergiato `feat/xxx`, riguarda se ti torna". Eventuali correzioni si fanno in PR successive.

### Linee guida PR

- **Piccole e frequenti** → max 1-2 giorni di lavoro per PR, così `main` avanza e i conflitti sono rari.
- **Titolo = messaggio di commit principale** (`feat(patient): add weight trend chart`).
- **Descrizione breve**: cosa cambia e perché. Link a eventuali schermate per modifiche UI.
- **Mai forzare il push su `main`**, mai `--no-verify`, mai skippare la CI.

### Se `main` è avanzato mentre lavoravi

Prima di aprire/mergere la PR:
```bash
git checkout main && git pull
git checkout <tuo-branch>
git merge main
# risolvi eventuali conflitti, committa, pusha
```

---

## Prompt di apertura per Claude Code

A inizio di ogni sessione di lavoro, se Claude Code non ha già letto questo file, incolla questo prompt:

> Prima di modificare codice crea un branch `feat/...`, `fix/...` o `chore/...` partendo da `main` aggiornato — mai lavorare su `main`. Commit con Conventional Commits. Quando ti dico "fatto", pusha il branch e apri la PR con `gh pr create`.

---

## Scadenze

- **Consegna dashboard**: fine maggio 2026. Priorità alla stabilità di `main`: meglio rallentare di un'ora che rompere il lavoro dell'altro.
