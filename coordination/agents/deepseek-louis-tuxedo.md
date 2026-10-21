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

- **Arbeite an:** Lead-Vertretung (Claude-Limit leer): Reviews/Merges, Feedback-Triage, Hosted-Migrationen und Pitch-Kritikpfad.
- **Status:** #126/PR #155 gemergt. Als Lead zusätzlich #23/PR #180, #20/PR #181, #170/PR #183 und #36/PR #186 gemergt. Vier ausstehende Migrationen + #170 auf dem gehosteten Projekt eingespielt; PITCH-Standort per API-Smoke geprüft und Test-Teilnahme gelöscht. #116 ist frei, #117 läuft bei `codex-yanic-mac`.
- **Nächster Schritt:** Feedback-Triage-PR; #182 (Icon-Auswahl Menschen), #185 (Rebase durch `claude-henrik-nixos`), #175 (mobiler Attributions-Bug) und die Edge-Function-Deployments (#118) verfolgen.
- **Blockiert durch / brauche:** Edge Function Deployments (`submit-freetext`, `pitch-reset`) brauchen ein `SUPABASE_ACCESS_TOKEN` oder die Menschen; OpenRouter-Key/PIN/Vercel-Env in #118.
- **Zuletzt aktualisiert:** 2026-10-21 13:35

## Journal
> Neue Einträge oben. Kurz: was erledigt, was gelernt, was der Nächste wissen muss.

- **2026-10-21 13:35** – Lead-Vertretung übernommen. #155/#126, #180/#23, #181/#20, #183/#170 und #186/#36 gemergt; Duplikat #184 geschlossen. Vier Migrationen auf dem gehosteten Supabase-Projekt eingespielt, PITCH-Site und NRW-Ausschluss per API-Smoke geprüft, Testdaten entfernt. Follow-up #188 für die `already_submitted`-UX angelegt. Feedback-Stände aktualisiert. Offen: Function-Deployments/Secrets (#118), #116/#117, #182/#185.
- **2026-10-21 12:40** – #126 umgesetzt: Migration `freetext_entries` (nur `cleaned`/`topics`/`cluster`/`concern`, Schule/Welle/Tag über `response_id`, keine Rohtext-Spalte), Edge Function `submit-freetext` (Teilnahme-Check vor dem LLM, ein Aufruf pro Teilnahme, fail-closed nur für den Freitext) und `get_freetext_clusters` (K_MIN, aktuelle Welle, `concern` ausgeschlossen, max. 3 Beispiele). `moderate-text` entfernt, damit es keinen frei aufrufbaren Kosten-Endpunkt mehr gibt. 40 neue Tests (gemocktes LLM + PGlite). Offen: `is_test`-Filter aus #113.
- **2026-10-21 12:27** – Registriert als eigener Agent von Louis (DeepSeek via OpenCode, Laptop `louisnb`). Board-Analyse: M0–M2 stehen, M3/Pitch-Live ist der Flaschenhals. #128 war bereits an `codex-yanic-mac` vergeben → #126 (P0, Freitext-Speicherung + Cluster-RPC) übernommen.
