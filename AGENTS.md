# AGENTS.md – Betriebsanleitung für das KI-Agenten-Team

> **Jeder KI-Agent liest diese Datei zu Beginn JEDER Session vollständig.**
> Sie ist die verbindliche Arbeitsgrundlage. Bei Widersprüchen gilt: `coordination/FEEDBACK.md` (Menschen) > `AGENTS.md` > `coordination/DECISIONS.md` > `docs/*`.

Wir sind ein verteiltes Team aus mehreren KI-Agenten (verschiedene Modelle, verschiedene Geräte) plus einem kleinen menschlichen Team.
Wir bauen in einem Hackathon **Moodmap** – eine Stimmungs-Umfrage-App für Schulen in NRW mit interaktiver Landkarte – und pitchen am Ende einen **funktionierenden Prototyp**.

Wir arbeiten wie ein echtes Softwareteam: **GitHub Issues sind unser Board, Pull Requests unser Review-Prozess, Markdown-Dateien unser Gedächtnis.**

---

## 1. Pflichtlektüre (in dieser Reihenfolge)

| Datei | Wozu |
|---|---|
| `AGENTS.md` | Diese Datei – Regeln, Rollen, Workflow |
| `coordination/FEEDBACK.md` | Neuestes Feedback der Menschen – **hat höchste Priorität** |
| `coordination/DECISIONS.md` | Getroffene Architektur-/Produktentscheidungen (nicht neu diskutieren!) |
| `coordination/agents/` | Wer ist im Team, wer macht gerade was |
| `docs/VISION.md` | Warum wir das bauen, für wen |
| `docs/PRODUCT_SPEC.md` | Was wir bauen (Features, Screens, Akzeptanzkriterien) |
| `docs/SURVEY_TOPICS.md` | Themen & Fragenkatalog |
| `docs/ARCHITECTURE.md` | Tech-Stack, Datenmodell, Score-Berechnung |
| `docs/DESIGN.md` | Look & Feel, Farbskala, Komponenten |
| `docs/PRIVACY.md` | Datenschutz-Leitplanken – **nicht verhandelbar** |
| `docs/ROADMAP.md` | Meilensteine & Start-Backlog |
| `docs/PITCH.md` | Pitch-Story & Demo-Skript |

Du musst nicht jedes Mal alle `docs/*` komplett lesen – aber immer die für dein aktuelles Issue relevanten.

---

## 2. Grundprinzipien

1. **Demo first.** Alles, was wir bauen, muss in der Pitch-Demo sichtbar oder für sie notwendig sein. Keine unsichtbare Perfektion.
2. **`main` ist immer lauffähig und deploybar.** Niemals direkt auf `main` pushen. Niemals einen PR mergen, dessen Build rot ist.
3. **Kleine Schritte.** Ein Issue = ein klar abgegrenztes Ergebnis, idealerweise < 2 Stunden Arbeit. Ein PR = ein Issue.
4. **Mock-Modus immer funktionsfähig.** Die App muss ohne Backend-Keys mit synthetischen Daten laufen (`VITE_DATA_MODE=mock`). Das ist unsere Versicherung für die Live-Demo.
5. **Transparenz.** Alles, was andere wissen müssen, steht in einem Issue-Kommentar, einem PR oder einer MD-Datei – nie nur "im Kopf" einer Session. Deine Session endet, das Repo bleibt.
6. **Nicht doppelt arbeiten.** Erst Issue claimen, dann arbeiten. Siehe §5.
7. **Entscheidungen nicht neu verhandeln.** Was in `DECISIONS.md` steht, gilt. Wer es ändern will, öffnet ein Issue mit Label `type:decision`.
8. **Datenschutz ist ein Feature.** Siehe `docs/PRIVACY.md`. Keine echten personenbezogenen Daten, nur synthetische Demo-Daten.
9. **Sprache:** UI-Texte auf Deutsch (Schüler-gerecht, du-Form). Code, Variablen, Commit-Messages auf Englisch. Doku & Issues auf Deutsch.

---

## 3. Team & Rollen nach Modellstärken

Jeder Agent hat eine **Primärrolle**, darf aber jedes Issue nehmen, wenn seine Rolle gerade nichts zu tun hat. Sind weniger Agenten als Rollen da, übernimmt ein Agent mehrere Rollen (Lead entscheidet).

### 3.1 Rollen

Unser Team besteht aus **Claude**, **Codex** und **DeepSeek** (ggf. mehrere Instanzen pro Modell auf verschiedenen Geräten).

| Rolle | ID-Kürzel | Verantwortung | Standard-Besetzung |
|---|---|---|---|
| **Lead / Architekt & Integrator** | `lead` | Triage von Feedback → Issues, Backlog-Priorisierung, Architekturentscheidungen, Code-Review & Merge, Konflikte auflösen, Repo-Setup | **Claude** (Opus, falls verfügbar) |
| **Frontend & PWA** | `fe` | Umfrage-Flow, App-Shell, Routing, PWA (Manifest, Service Worker, Installierbarkeit), Design-System-Komponenten | **Claude** (Sonnet) oder **Codex** |
| **Map & Data-Viz** | `map` | MapLibre-Karte, Choroplethen, Drill-down NRW → Kreis → Schule, Filter, Charts, Dashboard | **Claude** oder **Codex** (Screenshots prüfen können ist hier wichtig) |
| **Backend & Daten** | `data` | Datenmodell, Supabase-Schema/Migrations, Aggregations-Views, Import Schulverzeichnis & GeoJSON, CI | **Codex** |
| **Algorithmen, Seed & QA** | `qa` | Score-/Aggregationslogik + Unit-Tests, Seed-Generator für synthetische Daten, Testabdeckung, Bug-Hunting, Doku, Pitch-Fakten | **DeepSeek** |

Gibt es nur je einen Agenten pro Modell: **Claude = `lead` + `fe`/`map`**, **Codex = `data` + `map`**, **DeepSeek = `qa`** (Logik, Seed, Tests, Doku). Der Lead darf jederzeit umverteilen.

### 3.2 Modellprofile unseres Teams

Faustregeln aus Erfahrung, kein Dogma. Jeder Agent bewertet sich bei der Registrierung selbst ehrlich und korrigiert dieses Profil in seiner Agent-Datei, wenn es nicht passt.

| Modell | Stärken (nutzen!) | Schwächen / Vorsicht | Bevorzugte Labels |
|---|---|---|---|
| **Claude** (Claude Code) | Architektur, Reasoning über große Codebasen, sauberes Review, UI/UX-Gespür, gute Texte & Doku, kann Screenshots ansehen | Teuerstes Modell im Team → nicht für Fleißarbeit verbrennen | `fit:reasoning`, `fit:ui` |
| **Codex** (OpenAI Codex CLI) | Zuverlässige Umsetzung klar spezifizierter Tickets, führt Befehle/Tests selbstständig aus und iteriert bis grün, Scripts, SQL, CI, Refactorings | Braucht präzise Akzeptanzkriterien; bei vagen Produktfragen lieber nachfragen | `fit:data`, `fit:ui`, `fit:fast` |
| **DeepSeek** | Starkes logisches/mathematisches Reasoning zu niedrigen Kosten, Algorithmen, Datenlogik, Tests, Doku-Fleißarbeit | Kann je nach Setup **keine Bilder** ansehen (→ keine visuellen UI-Reviews), Web-Zugriff abhängig vom Tool, weniger UI-Feingefühl | `fit:reasoning` (Logik), `fit:data`, `fit:fast` |

**Konsequenzen für die Zusammenarbeit:**
- **Reviews kreuzen:** Code von Codex/DeepSeek reviewt bevorzugt Claude; Code von Claude reviewt bevorzugt Codex (prüft durch Ausführen) oder DeepSeek (prüft Logik/Edge Cases).
- **Visuelle Prüfung** (Screenshots, Mobile-Ansicht) übernimmt Claude oder ein Mensch.
- **Teure Modelle für teure Probleme:** Claude-Zeit für Architektur, Reviews, knifflige UI; Routine an Codex/DeepSeek.

### 3.3 Aufgaben-Eignung (Issue-Labels)

| Stärke | Typische Aufgaben | Issue-Label |
|---|---|---|
| Tiefes Reasoning, Architektur, Review, Edge Cases | Datenmodell, Score-Logik, Datenschutz-Logik (k-Anonymität), Reviews, schwierige Bugs | `fit:reasoning` |
| UI/UX-Umsetzung, visuelles Gespür, CSS | Screens, Animationen, Responsiveness, Design-System | `fit:ui` |
| Datenverarbeitung, großer Kontext, Geo | GeoJSON vereinfachen, Schul-CSV importieren, Seed-Daten, SQL | `fit:data` |
| Schnelle, klar umrissene Kleinaufgaben | Texte, Icons, Labels, kleine Fixes, Tests nachziehen, Doku | `fit:fast` |
| Recherche (Web) | Open-Data-Quellen finden & prüfen, Fakten für Pitch | `fit:research` |

**Regel:** Nimm bevorzugt Issues, deren `fit:*`-Label zu deinen Stärken passt. Ein `fit:reasoning`-Issue nimmt ein schwächeres/schnelleres Modell nur, wenn sonst niemand verfügbar ist – und dann mit besonders gründlichem PR-Text.

### 3.4 Registrierung (erste Session eines Agenten)

1. Wähle eine eindeutige **Agent-ID**: `<modell>-<gerät/person>`, z. B. `claude-louis-laptop`, `deepseek-anna-pc`, `codex-tom-mac`.
2. Kopiere `coordination/agents/_TEMPLATE.md` nach `coordination/agents/<agent-id>.md` und fülle sie aus (Modell, Stärken, Schwächen, Primärrolle).
3. Lege das GitHub-Label `agent:<agent-id>` an (Farbe egal):
   `gh label create "agent:<agent-id>" --color BFD4F2 --description "Arbeitet: <agent-id>"`
4. Commit über einen kleinen PR (`chore: register agent <agent-id>`) – oder, wenn das Repo noch leer ist und du der Lead bist, im Setup-PR.
5. Ist noch **kein Lead** registriert, und du bist das stärkste Reasoning-Modell im Raum (oder der Mensch sagt es dir), übernimmst du `lead`.

> **Wichtig:** Arbeiten mehrere Agenten unter **demselben GitHub-Account**, ist `assignee` nicht eindeutig. Die verbindliche Zuordnung ist deshalb **immer das Label `agent:<agent-id>`** plus Claim-Kommentar. Zusätzlich `--add-assignee @me` setzen schadet nicht.

---

## 4. Kommunikationskanäle

| Kanal | Wofür | Wer schreibt |
|---|---|---|
| **GitHub Issues** | Aufgaben, Fragen, Diskussion zu einer konkreten Sache | Alle Agenten, Menschen |
| **Issue-/PR-Kommentare** | Status-Updates, Rückfragen an andere Agenten (`@agent:<id>` im Text erwähnen), Übergaben | Alle |
| **Pull Requests** | Code + Beschreibung + Review | Alle Agenten |
| `coordination/agents/<id>.md` | Eigenes Profil + Arbeitsjournal + aktueller Stand + Übergabe-Notiz | **Nur** der jeweilige Agent (verhindert Merge-Konflikte) |
| `coordination/FEEDBACK.md` | Feedback & Wünsche der Menschen | **Nur Menschen** schreiben Einträge; Lead markiert sie als verarbeitet |
| `coordination/DECISIONS.md` | Entscheidungslog (ADR-light), append-only | Lead (andere schlagen per Issue vor) |
| `docs/*.md` | Lebende Spezifikation | Alle, per PR; größere Änderungen nur mit Lead-Review |

**Fragen an andere Agenten:** Kommentar im betroffenen Issue mit `@agent:<id>` + Label `needs:answer`. Gibt es kein passendes Issue: neues Issue mit Label `type:question`. Agenten prüfen bei Session-Start `gh issue list --label needs:answer`.

**Fragen an Menschen:** Issue mit Label `needs:human`. Nicht blockieren lassen – triff eine vernünftige Annahme, dokumentiere sie im Issue und arbeite weiter, wenn möglich.

---

## 5. Der Arbeitszyklus (verbindlich)

### 5.1 Session-Start-Ritual

```bash
git checkout main && git pull --rebase
gh issue list --state open --limit 50
gh issue list --label needs:answer
gh issue list --label "agent:<deine-id>"
gh pr list
```
Dann: `coordination/FEEDBACK.md` (neue Einträge?), `coordination/DECISIONS.md`, deine eigene Agent-Datei lesen.

**Priorität bei der Wahl der nächsten Aufgabe:**
1. Offene Review-Anfragen an dich / PRs, die auf Review warten (Reviews blockieren andere!)
2. Fragen an dich (`needs:answer` + deine ID)
3. Deine eigenen angefangenen Issues (`status:in-progress` + dein Label)
4. `prio:P0` → `prio:P1` → `prio:P2` mit `status:ready`, passend zu deinem `fit:*`
5. Lead zusätzlich: Feedback triagieren, Backlog pflegen

### 5.2 Ein Issue claimen (Race-Condition-sicher)

1. `gh issue view <nr>` – hat das Issue **kein** `agent:*`-Label und **nicht** `status:in-progress`? Abhängigkeiten (`Blocked by #x`) erledigt?
2. Claimen:
   ```bash
   gh issue edit <nr> --add-label "agent:<id>,status:in-progress" --remove-label "status:ready" --add-assignee @me
   gh issue comment <nr> --body "🤖 Claimed by **<id>**. Plan: <1–3 Sätze>. ETA: ~<x> min."
   ```
3. **Kurz verifizieren:** `gh issue view <nr> --comments` – hat ein anderer Agent *vor dir* geclaimt? Dann gewinnt der **frühere Kommentar**; zieh dich zurück (Label entfernen, Kommentar "Rückzug, #<nr> gehört <id>").
4. Maximal **2 Issues gleichzeitig** in `status:in-progress` pro Agent.

### 5.3 Selbstständig Issues anlegen

Jeder Agent darf und **soll** Issues anlegen, wenn er
- beim Arbeiten einen Bug findet,
- merkt, dass sein Issue zu groß ist (→ aufteilen, Eltern-Issue verlinken),
- eine Abhängigkeit/Vorarbeit entdeckt,
- eine Idee hat, die zur Vision passt (→ `prio:P2`, Lead priorisiert).

Nutze die Templates in `.github/ISSUE_TEMPLATE/`. Jedes Issue braucht: **Titel im Format `[area] Kurzbeschreibung`**, Kontext, Akzeptanzkriterien (Checkliste), Labels `type:*`, `area:*`, `prio:*`, `fit:*`, `size:*`.

```bash
gh issue create --title "[map] Schul-Marker clustern ab Zoom < 9" \
  --body-file /tmp/issue.md \
  --label "type:feature,area:map,prio:P1,fit:ui,size:S,status:ready"
```

### 5.4 Branch, Commits, PR

- **Branch:** `<agent-id>/<issue-nr>-<kurz-slug>` → z. B. `claude-louis-laptop/12-choropleth-kreise`
- **Commits:** Conventional Commits auf Englisch: `feat(map): color districts by mood score (#12)`
- **Vor dem PR:** `git fetch && git rebase origin/main`, dann `npm run lint && npm run typecheck && npm test && npm run build` – alles grün.
- **PR:** Template ausfüllen, `Closes #<nr>`, **Screenshot/GIF bei UI-Änderungen** (Mobile-Ansicht!), Label `status:review` am Issue setzen.
- **Halte PRs klein** (Richtwert < 400 geänderte Zeilen, Lockfiles/Daten ausgenommen).

### 5.5 Review & Merge

- Jeder PR braucht **1 Review durch einen anderen Agenten** (bevorzugt `lead` oder ein Agent mit `fit:reasoning`). Review-Anfrage als PR-Kommentar: `Review bitte: @agent:<id>`.
- Reviewer prüft: Akzeptanzkriterien erfüllt? Build grün? Mock-Modus läuft? Datenschutz-Regeln eingehalten? Mobile ok?
- Review-Ergebnis als PR-Kommentar: `✅ LGTM` oder `🔁 Changes requested: …`.
- **Merge:** Squash-Merge, Branch löschen. Der Autor merged nach LGTM selbst (`gh pr merge <nr> --squash --delete-branch`).
- **Hackathon-Ausnahme:** Wartet ein PR > 30 min auf Review und ist nur `size:S` + `fit:fast`, darf der Autor nach grünem Build selbst mergen und schreibt `⚡ Self-merged (kein Reviewer verfügbar)` in den PR.

### 5.6 Session-Ende-Ritual (auch bei Abbruch!)

1. Code committen und pushen (auch WIP: als Draft-PR).
2. Issue-Kommentar: Was ist fertig, was fehlt, wo genau weitermachen.
3. `coordination/agents/<id>.md` aktualisieren: Abschnitt „Aktueller Stand" + Journal-Eintrag mit Datum/Uhrzeit.
4. Wenn du ein Issue **nicht** weitermachen wirst: `agent:<id>` und `status:in-progress` entfernen, `status:ready` setzen, Übergabe-Notiz im Issue.

---

## 6. Labels (Lead legt sie beim Setup an)

| Gruppe | Labels |
|---|---|
| Typ | `type:feature` `type:bug` `type:chore` `type:docs` `type:decision` `type:question` `type:feedback` |
| Bereich | `area:survey` `area:map` `area:dashboard` `area:backend` `area:pwa` `area:design` `area:infra` `area:pitch` |
| Priorität | `prio:P0` (Demo kaputt ohne) `prio:P1` (wichtig für Pitch) `prio:P2` (nice to have) |
| Status | `status:ready` `status:in-progress` `status:review` `status:blocked` |
| Eignung | `fit:reasoning` `fit:ui` `fit:data` `fit:fast` `fit:research` |
| Größe | `size:S` (< 30 min) `size:M` (< 2 h) `size:L` (> 2 h → aufteilen!) |
| Kommunikation | `needs:answer` `needs:human` |
| Zuordnung | `agent:<agent-id>` (pro Agent) |

Setup-Snippet für den Lead:

```bash
for l in "type:feature:1D76DB" "type:bug:D73A4A" "type:chore:CCCCCC" "type:docs:0075CA" "type:decision:5319E7" "type:question:D876E3" "type:feedback:FBCA04" \
         "area:survey:C2E0C6" "area:map:C2E0C6" "area:dashboard:C2E0C6" "area:backend:C2E0C6" "area:pwa:C2E0C6" "area:design:C2E0C6" "area:infra:C2E0C6" "area:pitch:C2E0C6" \
         "prio:P0:B60205" "prio:P1:D93F0B" "prio:P2:FEF2C0" \
         "status:ready:0E8A16" "status:in-progress:FBCA04" "status:review:1D76DB" "status:blocked:000000" \
         "fit:reasoning:5319E7" "fit:ui:F9D0C4" "fit:data:BFDADC" "fit:fast:C5DEF5" "fit:research:D4C5F9" \
         "size:S:EDEDED" "size:M:BDBDBD" "size:L:7F7F7F" "needs:answer:E99695" "needs:human:FF0000"; do
  name="${l%:*}"; color="${l##*:}"; gh label create "$name" --color "$color" --force
done
```

---

## 7. Menschliches Feedback → inkrementelle Entwicklung

1. Menschen testen die deployte App (Handy + Desktop) und schreiben Feedback in `coordination/FEEDBACK.md` **oder** als Issue mit Label `type:feedback`.
2. Der **Lead** prüft bei jeder Session (und spätestens alle ~60 min) neues Feedback:
   - zerlegt es in konkrete Issues (mit Akzeptanzkriterien, Labels, Priorität),
   - verlinkt die Issues im Feedback-Eintrag und setzt den Status auf `🟢 verarbeitet`.
3. Feedback der Menschen schlägt den bestehenden Plan. Kollidiert es mit einer Entscheidung in `DECISIONS.md`, dokumentiert der Lead die neue Entscheidung.
4. Nach jedem Meilenstein: Lead schreibt in `coordination/FEEDBACK.md` unter „Bitte testen" kurz, was neu ist und wie man es ausprobiert.

---

## 8. Definition of Done

Ein Issue ist **done**, wenn:
- [ ] alle Akzeptanzkriterien erfüllt sind,
- [ ] `lint`, `typecheck`, `test`, `build` grün sind,
- [ ] die App im **Mock-Modus** weiterhin startet und die Kern-Demo (Umfrage → Karte) funktioniert,
- [ ] UI-Änderungen auf **375 px Breite (Handy)** und Desktop geprüft sind (Screenshot im PR),
- [ ] keine Secrets/Keys im Code sind (nur `.env.example`),
- [ ] der PR gemerged und das Issue geschlossen ist,
- [ ] relevante Doku (`docs/*`, README) angepasst ist.

---

## 9. Verbote & Leitplanken

- ❌ Kein Push auf `main`, kein Force-Push auf fremde Branches.
- ❌ Keine Secrets (Supabase-Keys, API-Keys) committen. `.env.local` ist in `.gitignore`.
- ❌ Keine neuen großen Dependencies / Frameworks ohne `type:decision`-Issue (Ausnahme: kleine Utility-Libs).
- ❌ Keine echten Personen-, Schüler- oder Lehrkräftedaten. Schulstammdaten aus Open Data sind ok.
- ❌ Keine Einzelantworten im UI anzeigen – nur Aggregate mit Mindestanzahl (siehe `docs/PRIVACY.md`).
- ❌ Keine Arbeit an Issues, die einem anderen Agenten gehören – frag stattdessen im Issue.
- ❌ Keine stillen Architekturänderungen (Ordnerstruktur, State-Management, Datenmodell) ohne Lead.

---

## 10. Wenn etwas schiefgeht

| Situation | Vorgehen |
|---|---|
| `main` ist kaputt | Sofort Issue `prio:P0` + `type:bug` anlegen. Wer es verursacht hat, fixt es; sonst der Lead. Ggf. `git revert` per PR. |
| Merge-Konflikt | Rebase auf `origin/main`, Konflikt lösen. Betrifft er fremden Code wesentlich: Autor im Issue fragen. |
| Zwei Agenten haben dasselbe gebaut | Lead entscheidet, welcher PR gemerged wird; der andere wird geschlossen mit Verweis. |
| Unklare Anforderung | Vernünftige Annahme treffen, im Issue dokumentieren, weiterarbeiten. Bei großer Tragweite `needs:human`. |
| Agent antwortet nicht (> 45 min kein Lebenszeichen am Issue) | Lead darf das Issue freigeben (`status:ready`) und neu vergeben. |
