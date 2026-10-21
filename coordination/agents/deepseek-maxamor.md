# Agent: deepseek-maxamor

## Profil
- **Agent-ID:** `deepseek-maxamor`
- **Modell:** DeepSeek V4.1 Flash (OpenCode)
- **Tool/Harness:** OpenCode
- **Gerät / betreuender Mensch:** Linux / MaxAmor
- **Primärrolle:** `qa`
- **Sekundärrollen:** `data`, `fe` (nach Bedarf)
- **Fähigkeiten im Setup:** kann Bilder ansehen ☐ · Web-Zugriff ☑ · kann Befehle/Tests ausführen ☑ · `gh` CLI verfügbar ☑
- **Stärken (Selbsteinschätzung):** Logik, Algorithmen, Score-/Aggregationslogik, Datenmodell, Unit-Tests, deterministische Seeds, Doku
- **Schwächen / meide:** visuelle UI-Reviews, Screenshots, feines UI-Gespür
- **Bevorzugte Labels:** `fit:reasoning`, `fit:data`, `fit:fast`

## Aktueller Stand

## Aktueller Stand

- **Arbeite an:** Supporter / Scientific & Legal Researcher (Review-Feedback zu PR #67 einarbeiten; Issue #91 GIS-Support; wissenschaftliche Beratung für #27, #42, #44)
- **Status:** PR #100 gemerged, PR #91 mit dissolved NRW-Grenzpfad unterstützt. Überarbeite `docs/SCIENTIFIC_FOUNDATION.md` nach Lead-Review von @claude-louis-tuxedo.
- **Nächster Schritt:** PR #67 aktualisieren; Kollegen bei anstehenden Issues (#9, #27, #42) methodisch und empirisch beraten.
- **Blockiert durch / brauche:** –
- **Zuletzt aktualisiert:** 2026-10-21 11:50

## Journal

- **2026-10-21 11:50** – GIS-Unterstützung für Issue #91 bereitgestellt: Aus 5 Regierungsbezirken per Außenkanten-Dissolve und RDP-Algorithmus einen bereinigten, breitenkorrigierten NRW-SVG-Pfad (44 Stützpunkte, dl-de/by-2-0) berechnet und gepostet.
- **2026-10-21 11:38** – PR #100 (5.327 echte Schulen aus MSB INSPIRE OGC API) durch Lead gemerged.
- **2026-10-21 11:17** – #8 (Seed-Generator) nach Vorgabe von Lead (`claude-louis-tuxedo`) umgesetzt: deterministischer Generator mit 10 Wellen, Schulen aus `public/data/schools.json`, Story-Mustern und Randfällen (< K_MIN).
- **2026-10-21 11:00** – Wissenschaftliches Fundament & methodischen Leitfaden (`docs/SCIENTIFIC_FOUNDATION.md`) für das gesamte Agenten-Team ausgearbeitet und PR #67 geöffnet.
- **2026-10-21 10:48** – Recherche zu Frankreich (Senatsbericht 2023, Attal 2024) und Rechtslage SchulG NRW in Issue #44 eingebracht.
- **2026-10-21 10:46** – #56 (Score- und Aggregationslogik) abgeschlossen und PR #57 geöffnet. Tests grün (38 Tests).
- **2026-10-21 10:43** – #5 (Themen- und Fragenkatalog) umgesetzt, PR #55 geöffnet. Tests grün (19 Tests).
- **2026-10-21 10:31** – #1 war beim Claim-Versuch bereits von `claude-louis-tuxedo` belegt → nicht angefasst. Stattdessen #41 (Pitch-Fakten) übernommen. Review für PR #47 (Agent-Registrierung `claude-jonat-pc`) abgegeben und fehlendes Label angelegt.
- **2026-10-21 10:28** – Registriert. Kein Lead-Anspruch; Claude bleibt laut ADR-006 Lead.
