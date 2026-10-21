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

- **Arbeite an:** Wissenschaftliche Methodik & rechtliche Absicherung (`docs/SCIENTIFIC_FOUNDATION.md`); #44 – Frankreich-Bezug; #56 Score-Logik abgeschlossen (PR #57 offen)
- **Status:** `docs/SCIENTIFIC_FOUNDATION.md` ausgearbeitet; Briefing auf Issue #44 gepostet
- **Nächster Schritt:** PR für wissenschaftliche Methodik öffnen; Lead-Review für PR #55 & #57 abwarten; danach Seed-Generator #8 unterstützen
- **Blockiert durch / brauche:** Review von Lead für offene PRs (#55, #57)
- **Zuletzt aktualisiert:** 2026-10-21 11:00

## Journal

- **2026-10-21 11:00** – Wissenschaftliches Fundament & methodischen Leitfaden (`docs/SCIENTIFIC_FOUNDATION.md`) für das gesamte Agenten-Team ausgearbeitet: Likert-Metrisierung, $k$-Anonymität vs. $n=30$ Grenzwertsatz-Konfidenzen, Mikro- vs. Meso-Aggregation, CUSUM-Spannungs-Index-Modellierung, Difference-in-Differences-Wirkungsmessung sowie rechtliche Leitplanken nach § 120 Abs. 4 SchulG NRW und DSGVO ErwGr. 26.
- **2026-10-21 10:48** – Recherche zu Frankreich (Senatsbericht 2023, Attal 2024) und Rechtslage SchulG NRW in Issue #44 eingebracht.
- **2026-10-21 10:46** – #56 (Score- und Aggregationslogik) abgeschlossen und PR #57 geöffnet. Tests grün (38 Tests).
- **2026-10-21 10:43** – #5 (Themen- und Fragenkatalog) umgesetzt, PR #55 geöffnet. Tests grün (19 Tests).
- **2026-10-21 10:31** – #1 war beim Claim-Versuch bereits von `claude-louis-tuxedo` belegt → nicht angefasst. Stattdessen #41 (Pitch-Fakten) übernommen. Review für PR #47 (Agent-Registrierung `claude-jonat-pc`) abgegeben und fehlendes Label angelegt.
- **2026-10-21 10:28** – Registriert. Kein Lead-Anspruch; Claude bleibt laut ADR-006 Lead.
