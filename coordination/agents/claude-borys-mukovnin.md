# Agent: claude-borys-mukovnin

## Profil
- **Agent-ID:** `claude-borys-mukovnin`
- **Modell:** Claude Opus 5.5
- **Tool/Harness:** Claude Code
- **Gerät / betreuender Mensch:** Windows-PC / Borys (GitHub: Borys-Mukovnin)
- **Primärrolle:** `data` – Backend & Daten
- **Sekundärrollen:** `map` (Geo-Daten, Choroplethen-Anbindung), Reviews mit Fokus Datenmodell/Datenschutz
- **Fähigkeiten im Setup:** kann Bilder ansehen ☑ · Web-Zugriff ☑ · kann Befehle/Tests ausführen ☑ · `gh` CLI verfügbar ☑
- **Stärken (Selbsteinschätzung):** Datenmodell, SQL/Postgres, Supabase RLS & RPCs, k-Anonymität, GeoJSON/Geodaten, TypeScript-Typen, Reasoning über Edge Cases
- **Schwächen / meide:** teures Modell → keine reine Fleißarbeit; kein Lead-Job
- **Bevorzugte Labels:** `fit:data`, `fit:reasoning`, `area:backend`

## Aktueller Stand
> Bei jedem Session-Ende überschreiben.

- **Arbeite an:** #161 „Meine Antworten löschen" (Branch `claude-borys-mukovnin/161-delete-own-response`); #158 nrw-Bugfix (PR #159)
- **Status:** #22 komplett (alle Teile gemerged + eingespielt); #161 fertig, PR offen
- **Nächster Schritt:** nach Merge #159/#161 → Migrationen einspielen. Bug: `submit_response` lehnt leere `answers` ab, der Mock erlaubt sie (eigenes Issue)
- **Blockiert durch / brauche:** Review #159, #161
- **Zuletzt aktualisiert:** 2026-10-21 15:30

## Journal
> Neue Einträge oben. Kurz: was erledigt, was gelernt, was der Nächste wissen muss.

- **2026-10-21 15:30** – #81 gemerged + eingespielt, #22 geschlossen. #158: SQL an `level: nrw` aus #147 angepasst. #161 (Wunsch Borys): eigene Antwort löschen, inkl. UI (mit Bestätigung), Screenshots 375 px per puppeteer-core lokal geprüft. Gelernt: `set -o pipefail`, sonst verschluckt `| tail` Fehler. `.env.local` mit Supabase-URL macht Freitext-Tests netzabhängig → `vi.stubEnv`.
- **2026-10-21 14:40** – #80 gemerged + eingespielt. Vercel-Rate-Limit gemeldet (#139). Feedback von Borys als #146 erfasst (Mood-Check: Auswahl sehen/ändern). #81: Tension + Policy-RPCs. Gelernt: In PL/pgSQL endet eine `IF`-Bedingung am ersten `THEN`, auch in einem `CASE`. In JS-`replace()` bedeutet `$$` im Ersatztext ein einzelnes `$`, also Funktions-Replacer nutzen.
- **2026-10-21 13:50** – #79 gemerged (Review deepseek-maxamor) und per `db push` eingespielt. #80: Trend über `aggregate_rows`, Verteilung mit K_MIN + Maskierung < 3. Gelernt: in `stable`-Funktionen keine Temp-Tabellen (Supabase führt stabile RPCs read-only aus) → CTEs.
- **2026-10-21 13:20** – #79: SQL rechnet wie MockDataSource (Paritätstest 150 Abfragen gegen echte `createMockSource`). `overallScore` in ganzen Zehnteln (reihenfolgeunabhängig, sonst nicht parity-fähig). Gelernt: SQL-Funktionen mit `set search_path` werden nicht inline ausgeführt; PGlite ist ~10× langsamer als natives PG → Test-Umfang knapp halten. Eigene `tsconfig.sqltest.json`, weil SQL-Tests App-Code (DOM, `import.meta.env`) importieren.
- **2026-10-21 12:30** – #93: Supabase-Org „AzubiWars" + Projekt `moodmap-nrw` (eu-central-1) angelegt, `db push --include-seed`. Echter Lauf auf PG 17.11 ohne Anpassungen. REST-Check als anon: RPCs ok, `join_code`/Rohdaten/Schreibzugriffe verweigert. Test-Antwort per `db query --linked` wieder gelöscht. Die CLI gibt `sb_secret_…` maskiert aus → für Admin-SQL `db query --linked` nutzen. Keys nur in `.env.local`.
- **2026-10-21 11:55** – #78: `submit_response`, `get_school_by_code`, `get_current_wave`. Wellen-Fixtures relativ zu `now()`, damit Tests nicht vom Kalender abhängen. Mutationstest: Hash-Formel und `on conflict` gezielt kaputt gemacht → jeweils genau der passende Test schlägt fehl.
- **2026-10-21 11:35** – #7 gemerged (#69). #22 in #77–#81 aufgeteilt, PGlite für SQL-Tests vom Lead freigegeben (#76 → ADR-010). #77: Schema + RLS + Grants. Wichtig gelernt: Supabase gibt neuen Objekten alle Rechte, und `EXECUTE` für PUBLIC ist ein *globaler* Default – per-Schema-Revoke reicht nicht (Test hat es gefunden). Lokale Prettier-Warnungen unter Windows = nur CRLF (`--end-of-line auto` prüfen).
- **2026-10-21 11:20** – #6 gemerged (#58). #7 umgesetzt: `npm run data:schools` → `public/data/schools.json` (300 Schulen, Verteilung nach Einwohnerzahl aus BKG VG250-EW, Punkte garantiert im eigenen Kreis, Demo-Schule `900000`/`DEMO42` in Düsseldorf). `geo:build` erzeugt dafür zusätzlich `scripts/data/nrw-gemeinden.json`. Nach `git pull` immer `npm ci`, sonst fehlen neue Dependencies (z. B. maplibre aus #13).
- **2026-10-21 10:55** – #6 umgesetzt: BKG VG250 (dl-de/by-2-0) → `npm run geo:build`, mapshaper 0.7.93 bewusst nicht als devDependency (läuft aus `.cache/geo`). RegBez per Dissolve aus den Kreisen → identische Grenzen. ~390 KB gesamt. Quellenvermerk muss an der Karte sichtbar sein (für #13).
- **2026-10-21 10:35** – Registriert als `data`. Lead ist `claude-louis-tuxedo`. #6 geclaimt (frei, `fit:data`, P0).
