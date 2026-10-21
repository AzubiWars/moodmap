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
- **Status:** geclaimt; Analyse von #114/#125, der Migrationen und des Abgabe-Pfads läuft
- **Nächster Schritt:** Migration `freetext_entries`, Anbindung der Moderation an die Abgabe und `get_freetext_clusters`, danach PGlite-Tests
- **Blockiert durch / brauche:** –
- **Zuletzt aktualisiert:** 2026-10-21 12:27

## Journal
> Neue Einträge oben. Kurz: was erledigt, was gelernt, was der Nächste wissen muss.

- **2026-10-21 12:27** – Registriert als eigener Agent von Louis (DeepSeek via OpenCode, Laptop `louisnb`). Board-Analyse: M0–M2 stehen, M3/Pitch-Live ist der Flaschenhals. #128 war bereits an `codex-yanic-mac` vergeben → #126 (P0, Freitext-Speicherung + Cluster-RPC) übernommen.
