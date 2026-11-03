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

- **Arbeite an:** #258 (PR #276), #249 (PR #277), #278 (PR #279) – alle in Review. Epic #264 (Datenimport) mit Untersissues #265–#274 angelegt.
- **Status:** Lokales Repo aufgeräumt (87 Commits nachgezogen, 10 alte Branches gelöscht, `npm ci` + 573 Tests grün). Datenimport-Architektur als Epic + 10 Untersissues dokumentiert. P0-Bug #278 gefunden und gefixt: Die Mock-Demo-Welle endete fest mit `2026-W43`; seit dem 26.10. brach der Mood-Check ab. Lokal 580 Tests + E2E grün, PR #279 CI/E2E grün.
- **Nächster Schritt:** Review/Merge von #276/#277/#279; danach #276/#277 auf den P0-Fix rebasen. Dann #267 (Datenquellen-Modell) und #268 (Import-CLI) starten, sobald gewünscht.
- **Blockiert durch / brauche:** LGTM/Merge für die drei PRs (kein anderer Agent aktiv); echte Beispieldaten + Datenwörterbuch in #269.
- **Zuletzt aktualisiert:** 2026-10-27 12:00

## Journal
> Neue Einträge oben. Kurz: was erledigt, was gelernt, was der Nächste wissen muss.

- **2026-10-27 12:00** – Session „Projektüberblick + lokales Aufräumen“: `main` von `3bb3822` auf `db6505a` gebracht (87 Commits), veralteten Freitext-Zwischenstand (Backup unter `/tmp/opencode/moodmap-local-backup-20261027/`) und 10 gemergte lokale Branches entfernt. Datenimport als Epic #264 + #265–#274 angelegt (kanonisches Modell, Import-Adapter, Datenquellen, PRIVACY §9, menschliche Datenanfrage #269). #258/ADR-017 (PR #276) und #249/statische Schuldatei (PR #277) umgesetzt. Beim Testen P0-Bug #278 entdeckt: Mock-Seed endete fix mit W43, dadurch war der Mood-Check ab 26.10. komplett kaputt und der E2E-Smoke rot. Fix in PR #279 (dynamische aktuelle ISO-Woche + Fallback auf letzte Welle); E2E lokal wieder grün. Unabhängiges Infra-Ticket #275 für den Playwright-Installations-Timeout angelegt.

- **2026-10-21 13:55** – Lead-Vertretung fortgesetzt: #194 (Pitch-Aggregat + Freitext-Cluster im DataSource, Mock-PITCH), #191 (Mobile-Attribution), #192 (Lasttest-Runner), #182 (App-Icon Variante B), #195 (Publishable-Key nicht als Bearer, Edge-Deploy mit `--no-verify-jwt`) gemergt. #187 als durch #177 erledigt geschlossen; #188 als UX-Follow-up angelegt. Hosted-Smoke: Pitch-Aggregat/Teilnahme/Reset-Isolation geprüft, Testdaten entfernt. Offen: Function-Deployments/Secrets (#118), Vercel-Limit (#139), #116/#117, #185/#197.
- **2026-10-21 13:35** – Lead-Vertretung übernommen. #155/#126, #180/#23, #181/#20, #183/#170 und #186/#36 gemergt; Duplikat #184 geschlossen. Vier Migrationen auf dem gehosteten Supabase-Projekt eingespielt, PITCH-Site und NRW-Ausschluss per API-Smoke geprüft, Testdaten entfernt. Follow-up #188 für die `already_submitted`-UX angelegt. Feedback-Stände aktualisiert. Offen: Function-Deployments/Secrets (#118), #116/#117, #182/#185.
- **2026-10-21 12:40** – #126 umgesetzt: Migration `freetext_entries` (nur `cleaned`/`topics`/`cluster`/`concern`, Schule/Welle/Tag über `response_id`, keine Rohtext-Spalte), Edge Function `submit-freetext` (Teilnahme-Check vor dem LLM, ein Aufruf pro Teilnahme, fail-closed nur für den Freitext) und `get_freetext_clusters` (K_MIN, aktuelle Welle, `concern` ausgeschlossen, max. 3 Beispiele). `moderate-text` entfernt, damit es keinen frei aufrufbaren Kosten-Endpunkt mehr gibt. 40 neue Tests (gemocktes LLM + PGlite). Offen: `is_test`-Filter aus #113.
- **2026-10-21 12:27** – Registriert als eigener Agent von Louis (DeepSeek via OpenCode, Laptop `louisnb`). Board-Analyse: M0–M2 stehen, M3/Pitch-Live ist der Flaschenhals. #128 war bereits an `codex-yanic-mac` vergeben → #126 (P0, Freitext-Speicherung + Cluster-RPC) übernommen.
