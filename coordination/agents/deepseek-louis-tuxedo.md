# Agent: deepseek-louis-tuxedo

## Profil
- **Agent-ID:** `deepseek-louis-tuxedo`
- **Modell:** DeepSeek V4.1 Flash
- **Tool/Harness:** OpenCode
- **Gerät / betreuender Mensch:** Louis' Laptop (Linux) / Louis (GitHub: LouisBokeloh)
- **Primärrolle:** `qa`
- **Sekundärrollen:** `data`, `backend` (nach Bedarf)
- **Fähigkeiten im Setup:** kann Bilder ansehen ☐ · Web-Zugriff ☑ · kann Befehle/Tests ausführen ☑ · `gh` CLI verfügbar ☑
- **Stärken (Selbsteinschätzung):** Logik, Algorithmen, Score-/Aggregationslogik, SQL/RLS-Grundlagen, Unit- und PGlite-Tests, deterministische Seeds, Doku
- **Schwächen / meide:** visuelle UI-Reviews, Screenshots, feines UI-Gespür
- **Bevorzugte Labels:** `fit:reasoning`, `fit:data`, `fit:fast`

## Aktueller Stand
> Bei jedem Session-Ende überschreiben.

- **Arbeite an:** nichts in Arbeit; Pitch-Hotfix abgeschlossen.
- **Status:** Lokales `main` auf `2c96299`. #312 (PR #317) gemergt: Swipe-Buttons fingen durch Pointer Capture auf dem Container alle Klicks/Taps ab; Handler liegen jetzt nur noch auf der Swipe-Karte. Hosted Supabase (`woglymwqlremrvkwhban`) hat wieder einen Teststandort: `pitch-test`, Name „Moodmap Demo-Schule“, Join-Code `DEMO42`, `is_test = true`. Production-E2E per Playwright verifiziert: `/check` → Demo-Schule → 11 Fragen inkl. 2 Swipe-Fragen → Freitext → Review → Danke-Seite. Testantworten danach mit `reset_pitch_test()` gelöscht (`get_pitch_aggregate()` wieder `n=0`). 687 Tests, Build und CI grün.
- **Nächster Schritt:** Pitch-Vorbereitung; offene Folge-Tickets #313 (dynamischer Demo-Code + Repair-Migration), #314 (`/demo` + `/demo/live` in Production), #315 (frozen Demo-/Live-Stand), #316 (Edge Functions 404).
- **Blockiert durch / brauche:** nichts akut; für #316 Deployment/Secrets der Edge Functions.
- **Zuletzt aktualisiert:** 2026-11-10 20:25

## Journal
> Neue Einträge oben. Kurz: was erledigt, was gelernt, was der Nächste wissen muss.

- **2026-11-10 20:25** – Pitch-Hotfix: Production-Mood-Check war über `/check` → `/s/DEMO42` tot, weil `DEMO42` nur im Mock-Seed existiert. Hosted DB per `configure_pitch_site(..., 'DEMO42')` um einen isolierten Teststandort ergänzt (`pitch-test`, `is_test`); keine Code-Änderung nötig. Beim E2E-Test zeigte sich ein zweiter P0-Bug: Pointer Capture auf dem gesamten `SwipeControls`-Container verschluckte Klicks/Taps auf „Trifft zu“, „Trifft nicht zu“ und „Überspringen“; der Flow blieb bei Frage 10/11 stehen. Fix in PR #317: Pointer-Handler nur auf die Swipe-Karte, Guard gegen Buttons/Links/Formelemente. Production-E2E bis Danke-Seite grün, Testantworten gelöscht. Folge-Tickets #313–#316 angelegt.
- **2026-11-10 09:35** – Session „Repo-Hygiene + Doku": `main` von `bbaed08` auf `5413a44` nachgezogen (2 Commits), Working Tree clean; format/lint/typecheck/687 Tests/build/E2E grün. Alte Branches aufgeräumt: 2 lokale und 11 remote gelöscht, `screenshots` als orphanes Archiv behalten (alte PRs verlinken darauf). Neue Issues #307/#308 angelegt und geclaimt: PR #309 entfernt Scratch-Datei, tote `Placeholder`-Komponente und Doppel-Re-Export; PR #310 aktualisiert README, ARCHITECTURE (§2/§3/§9), PRODUCT_SPEC, VISION und SUPABASE_SETUP auf ADR-017/021. Beide PRs CI-grün, warten auf Review.
- **2026-11-08 15:35** – Nach Server-Neustart und 12 Tagen: Lokales Repo auf `bbaed08` synchronisiert und vier veraltete Branches entfernt. Meine Oktober-PRs (#276/#277/#279/#280) wurden über #284 integriert; das Datenimport-Epic #264 ist über #291 umgesetzt (alle Untersissues außer #269 geschlossen). Neues P1-Ticket #299 übernommen: MapLibre-Buffer-Race beim Theme-Wechsel. Reproduziert mit 4/20 Single-Worker-Läufen (`Length of new data is … current length of 0`); Ursache: `schools`/`directorySchools`/`germany-*` wurden während des Style-Aufbaus gemountet. Fix in PR #305: alle Custom-Quellen hinter `styleReady`, MapLibre 6.15 → 6.17 (nur Lockfile). 2×20 Läufe grün, 687 Tests/Build grün. Epic #264 auf `status:blocked` gesetzt, offen nur #269.
- **2026-10-27 12:00** – Session „Projektüberblick + lokales Aufräumen“: `main` von `3bb3822` auf `db6505a` gebracht (87 Commits), veralteten Freitext-Zwischenstand (Backup unter `/tmp/opencode/moodmap-local-backup-20261027/`) und 10 gemergte lokale Branches entfernt. Datenimport als Epic #264 + #265–#274 angelegt (kanonisches Modell, Import-Adapter, Datenquellen, PRIVACY §9, menschliche Datenanfrage #269). #258/ADR-017 (PR #276) und #249/statische Schuldatei (PR #277) umgesetzt. Beim Testen P0-Bug #278 entdeckt: Mock-Seed endete fix mit W43, dadurch war der Mood-Check ab 26.10. komplett kaputt und der E2E-Smoke rot. Fix in PR #279 (dynamische aktuelle ISO-Woche + Fallback auf letzte Welle); E2E lokal wieder grün. Unabhängiges Infra-Ticket #275 für den Playwright-Installations-Timeout angelegt.

- **2026-10-21 13:55** – Lead-Vertretung fortgesetzt: #194 (Pitch-Aggregat + Freitext-Cluster im DataSource, Mock-PITCH), #191 (Mobile-Attribution), #192 (Lasttest-Runner), #182 (App-Icon Variante B), #195 (Publishable-Key nicht als Bearer, Edge-Deploy mit `--no-verify-jwt`) gemergt. #187 als durch #177 erledigt geschlossen; #188 als UX-Follow-up angelegt. Hosted-Smoke: Pitch-Aggregat/Teilnahme/Reset-Isolation geprüft, Testdaten entfernt. Offen: Function-Deployments/Secrets (#118), Vercel-Limit (#139), #116/#117, #185/#197.
- **2026-10-21 13:35** – Lead-Vertretung übernommen. #155/#126, #180/#23, #181/#20, #183/#170 und #186/#36 gemergt; Duplikat #184 geschlossen. Vier Migrationen auf dem gehosteten Supabase-Projekt eingespielt, PITCH-Site und NRW-Ausschluss per API-Smoke geprüft, Testdaten entfernt. Follow-up #188 für die `already_submitted`-UX angelegt. Feedback-Stände aktualisiert. Offen: Function-Deployments/Secrets (#118), #116/#117, #182/#185.
- **2026-10-21 12:40** – #126 umgesetzt: Migration `freetext_entries` (nur `cleaned`/`topics`/`cluster`/`concern`, Schule/Welle/Tag über `response_id`, keine Rohtext-Spalte), Edge Function `submit-freetext` (Teilnahme-Check vor dem LLM, ein Aufruf pro Teilnahme, fail-closed nur für den Freitext) und `get_freetext_clusters` (K_MIN, aktuelle Welle, `concern` ausgeschlossen, max. 3 Beispiele). `moderate-text` entfernt, damit es keinen frei aufrufbaren Kosten-Endpunkt mehr gibt. 40 neue Tests (gemocktes LLM + PGlite). Offen: `is_test`-Filter aus #113.
- **2026-10-21 12:27** – Registriert als eigener Agent von Louis (DeepSeek via OpenCode, Laptop `louisnb`). Board-Analyse: M0–M2 stehen, M3/Pitch-Live ist der Flaschenhals. #128 war bereits an `codex-yanic-mac` vergeben → #126 (P0, Freitext-Speicherung + Cluster-RPC) übernommen.
