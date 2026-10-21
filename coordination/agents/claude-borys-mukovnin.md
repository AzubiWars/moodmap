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

- **Arbeite an:** #22 (Eltern) – #77 im Review (PR #87), #78 fertig als Draft-PR gestapelt auf #77 (Branch `claude-borys-mukovnin/78-submit-response`)
- **Status:** #78 fertig, wartet auf Merge von #87, dann Rebase auf `main` und Draft → Ready
- **Nächster Schritt:** #79 (SQL-Score + `get_aggregates`, Paritätstest mit gemeinsamen TS/SQL-Fixtures – Bedingung aus #76)
- **Blockiert durch / brauche:** Review/Merge #87
- **Zuletzt aktualisiert:** 2026-10-21 11:55

## Journal
> Neue Einträge oben. Kurz: was erledigt, was gelernt, was der Nächste wissen muss.

- **2026-10-21 11:55** – #78: `submit_response`, `get_school_by_code`, `get_current_wave`. Wellen-Fixtures relativ zu `now()`, damit Tests nicht vom Kalender abhängen. Mutationstest: Hash-Formel und `on conflict` gezielt kaputt gemacht → jeweils genau der passende Test schlägt fehl.
- **2026-10-21 11:35** – #7 gemerged (#69). #22 in #77–#81 aufgeteilt, PGlite für SQL-Tests vom Lead freigegeben (#76 → ADR-010). #77: Schema + RLS + Grants. Wichtig gelernt: Supabase gibt neuen Objekten alle Rechte, und `EXECUTE` für PUBLIC ist ein *globaler* Default – per-Schema-Revoke reicht nicht (Test hat es gefunden). Lokale Prettier-Warnungen unter Windows = nur CRLF (`--end-of-line auto` prüfen).
- **2026-10-21 11:20** – #6 gemerged (#58). #7 umgesetzt: `npm run data:schools` → `public/data/schools.json` (300 Schulen, Verteilung nach Einwohnerzahl aus BKG VG250-EW, Punkte garantiert im eigenen Kreis, Demo-Schule `900000`/`DEMO42` in Düsseldorf). `geo:build` erzeugt dafür zusätzlich `scripts/data/nrw-gemeinden.json`. Nach `git pull` immer `npm ci`, sonst fehlen neue Dependencies (z. B. maplibre aus #13).
- **2026-10-21 10:55** – #6 umgesetzt: BKG VG250 (dl-de/by-2-0) → `npm run geo:build`, mapshaper 0.7.93 bewusst nicht als devDependency (läuft aus `.cache/geo`). RegBez per Dissolve aus den Kreisen → identische Grenzen. ~390 KB gesamt. Quellenvermerk muss an der Karte sichtbar sein (für #13).
- **2026-10-21 10:35** – Registriert als `data`. Lead ist `claude-louis-tuxedo`. #6 geclaimt (frei, `fit:data`, P0).
