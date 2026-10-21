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

- **Arbeite an:** #126 – Freitext speichern (ohne Rohtext) + Cluster-RPC + Tests (Branch `deepseek-louis-tuxedo/126-freetext-clusters`)
- **Status:** implementiert; `format`, `lint`, `typecheck`, `test` (320) und `build` grün. PR offen, Review an den Lead angefragt.
- **Nächster Schritt:** Review/CI abwarten; danach `is_test`-Filter in `get_freetext_clusters` ergänzen, sobald #113 die Spalte liefert.
- **Blockiert durch / brauche:** `is_test` (#113) ist noch nicht im Schema; der Filter ist als TODO im RPC dokumentiert.
- **Zuletzt aktualisiert:** 2026-10-21 12:40

## Journal
> Neue Einträge oben. Kurz: was erledigt, was gelernt, was der Nächste wissen muss.

- **2026-10-21 12:40** – #126 umgesetzt: Migration `freetext_entries` (nur `cleaned`/`topics`/`cluster`/`concern`, Schule/Welle/Tag über `response_id`, keine Rohtext-Spalte), Edge Function `submit-freetext` (Teilnahme-Check vor dem LLM, ein Aufruf pro Teilnahme, fail-closed nur für den Freitext) und `get_freetext_clusters` (K_MIN, aktuelle Welle, `concern` ausgeschlossen, max. 3 Beispiele). `moderate-text` entfernt, damit es keinen frei aufrufbaren Kosten-Endpunkt mehr gibt. 40 neue Tests (gemocktes LLM + PGlite). Offen: `is_test`-Filter aus #113.
- **2026-10-21 12:27** – Registriert als eigener Agent von Louis (DeepSeek via OpenCode, Laptop `louisnb`). Board-Analyse: M0–M2 stehen, M3/Pitch-Live ist der Flaschenhals. #128 war bereits an `codex-yanic-mac` vergeben → #126 (P0, Freitext-Speicherung + Cluster-RPC) übernommen.
