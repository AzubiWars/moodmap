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

- **Arbeite an:** Supporter / Scientific & Legal Researcher (Echte empirische Mood-Benchmarks recherchiert & kommuniziert; Seed-Validierung #128; Masken-Analyse #132)
- **Status:** PR #67 (`docs/SCIENTIFIC_FOUNDATION.md`) durch Lead gemerged! Echte empirische Studiendaten (Deutsches Schulbarometer 2026, GTO/IHPH-Klostudie, MSB-Unterrichtsstatistik NRW 24/25, Shell 2024, Bitkom 2025) für die Seed-Kalibrierung auf #120 und #128 bereitgestellt; technische Analyse für Masken-Bug #132 geliefert.
- **Nächster Schritt:** Weiteres wissenschaftliches und konzeptionelles Sparring für anstehende Aufgaben (#25 Lagebild NRW, #27 KI-Lagebericht, #43 Politik antwortet).
- **Blockiert durch / brauche:** –
- **Zuletzt aktualisiert:** 2026-10-21 12:15

## Journal

- **2026-10-21 12:15** – Echte empirische Mood-Daten recherchiert und für das Team auf #120 bereitgestellt: Schultoiletten-Studie der GTO/Uni Bonn (Note 4,4; 85 % Meidung), MSB-Unterrichtsausfallstatistik NRW (4,8 % landesweit, bis zu 11 % in Brennpunkten), Schulbarometer 2026 (25 % psychische Belastung, 33 % Mobbing, 50 % ohne Mitbestimmung).
- **2026-10-21 12:14** – PR #67 (`docs/SCIENTIFIC_FOUNDATION.md`) erfolgreich durch Lead gemerged. Alle 261 Vitest-Tests auf `main` grün.
- **2026-10-21 12:10** – Technische Ursachen-Analyse für MapLibre-Masken-Bug (#132) bereitgestellt (Symbol-Layer vs. GeoJSON-Order).
- **2026-10-21 12:05** – Fragenkatalog-Abgleich für #128 (Seed-Antworten & Swipe-Constraints) bereitgestellt.
- **2026-10-21 12:00** – Prompt-Engineering-Briefing für Freitext-Moderation & Clustering (#114, FB-006) ausgearbeitet: System-Prompt mit strikter Eigennamen-Entfernung, neutraler Schimpfwort-Umschreibung, Krisensignal-Detektion (`concern`), Abbildung auf die 8 Themen-Slugs und schnellem Latenz-/Kosten-Fokus (`gemini-2.0-flash` / `gpt-4o-mini`).
- **2026-10-21 11:55** – PR #110 (Schul-Marker & Clustering) aus kartographischer und statistischer Sicht geprüft: Flächenproportionale Flannery-Skalierung ($\sim \sqrt{n}$), $n$-gewichtete Cluster-Mittelwerte und $K_{\text{MIN}}$-Unterdrückung methodisch freigegeben.
- **2026-10-21 11:50** – GIS-Unterstützung für Issue #91 bereitgestellt: Aus 5 Regierungsbezirken per Außenkanten-Dissolve und RDP-Algorithmus einen bereinigten, breitenkorrigierten NRW-SVG-Pfad (44 Stützpunkte, dl-de/by-2-0) berechnet und gepostet.
- **2026-10-21 11:45** – PR #67 (`docs/SCIENTIFIC_FOUNDATION.md`) umfassend nach Vorgaben des Lead überarbeitet: Farbskala mit Wetter-Tokens harmonisiert, Hackathon-Zielbild-Legitimation geschärft, Anonymitätsaussagen nach ErwGr. 26 DSGVO vorsichtig gefasst, Frühwarn-Radar-Tonalität rein auf Dialog und Unterstützung ausgerichtet.
- **2026-10-21 11:38** – PR #100 (5.327 echte Schulen aus MSB INSPIRE OGC API) durch Lead gemerged.
- **2026-10-21 11:17** – #8 (Seed-Generator) nach Vorgabe von Lead (`claude-louis-tuxedo`) umgesetzt: deterministischer Generator mit 10 Wellen, Schulen aus `public/data/schools.json`, Story-Mustern (KI & Voice landesweit niedrig, Stress-Peaks in Oberstufe/Gymnasien, Ausfall-Hotspot Duisburg, Frühwarn-Spannungs-Hotspot Recklinghausen mit nachfolgender Politik-Antwort-Erholung) und Randfällen (< K_MIN).
- **2026-10-21 11:00** – Wissenschaftliches Fundament & methodischen Leitfaden (`docs/SCIENTIFIC_FOUNDATION.md`) für das gesamte Agenten-Team ausgearbeitet und PR #67 geöffnet.
- **2026-10-21 10:48** – Recherche zu Frankreich (Senatsbericht 2023, Attal 2024) und Rechtslage SchulG NRW in Issue #44 eingebracht.
- **2026-10-21 10:46** – #56 (Score- und Aggregationslogik) abgeschlossen und PR #57 geöffnet. Tests grün (38 Tests).
- **2026-10-21 10:43** – #5 (Themen- und Fragenkatalog) umgesetzt, PR #55 geöffnet. Tests grün (19 Tests).
- **2026-10-21 10:31** – #1 war beim Claim-Versuch bereits von `claude-louis-tuxedo` belegt → nicht angefasst. Stattdessen #41 (Pitch-Fakten) übernommen. Review für PR #47 (Agent-Registrierung `claude-jonat-pc`) abgegeben und fehlendes Label angelegt.
- **2026-10-21 10:28** – Registriert. Kein Lead-Anspruch; Claude bleibt laut ADR-006 Lead.
