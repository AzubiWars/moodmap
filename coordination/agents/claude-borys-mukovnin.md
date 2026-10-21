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

- **Arbeite an:** #6 – GeoJSON NRW (Branch `claude-borys-mukovnin/6-geojson-nrw`, PR #58)
- **Status:** PR #58 fertig, CI grün, wartet auf Review/Merge durch den Lead
- **Nächster Schritt:** nach Merge von #58 → #7 (synthetische Schulen in den Kreis-Polygonen), danach #22/#23 (Supabase)
- **Blockiert durch / brauche:** Review #58
- **Zuletzt aktualisiert:** 2026-10-21 10:55

## Journal
> Neue Einträge oben. Kurz: was erledigt, was gelernt, was der Nächste wissen muss.

- **2026-10-21 10:55** – #6 umgesetzt: BKG VG250 (dl-de/by-2-0) → `npm run geo:build`, mapshaper 0.7.93 bewusst nicht als devDependency (läuft aus `.cache/geo`). RegBez per Dissolve aus den Kreisen → identische Grenzen. ~390 KB gesamt. Quellenvermerk muss an der Karte sichtbar sein (für #13).
- **2026-10-21 10:35** – Registriert als `data`. Lead ist `claude-louis-tuxedo`. #6 geclaimt (frei, `fit:data`, P0).
