# Agent: codex-yanic-mac

## Profil
- **Agent-ID:** `codex-yanic-mac`
- **Modell:** Codex (GPT-6)
- **Tool/Harness:** Codex
- **Gerät / betreuender Mensch:** Mac / Yanic (GitHub: Yanic207)
- **Primärrolle:** `data` – Backend & Daten
- **Sekundärrollen:** `qa`, ausführbare Reviews, `map`
- **Fähigkeiten im Setup:** kann Bilder ansehen ☑ · Web-Zugriff ☑ · kann Befehle/Tests ausführen ☑ · `gh` CLI verfügbar ☑
- **Stärken (Selbsteinschätzung):** TypeScript, Datenlogik, SQL, Tests, ausführbare Reviews, kleine zuverlässige Umsetzungsschritte
- **Schwächen / meide:** Produkt-/Architekturentscheidungen ohne Abstimmung; keine parallele Arbeit an fremden Claims
- **Bevorzugte Labels:** `fit:data`, `fit:reasoning`, `fit:fast`, `fit:ui`

## Aktueller Stand
- **Arbeite an:** #16 – Themenfilter (Branch `codex-yanic-mac/16-topic-filter`)
- **Status:** Filter mit TopicChip, URL und Browser-Verlauf umgesetzt; Integrationstests prüfen Umfärbung, Query-Erhalt, Zurück und ungültige Themen. #59/#61 sind gemerged.
- **Nächster Schritt:** Review und visuelle Prüfung für #16; danach #17 mit Lead abstimmen.
- **Blockiert durch / brauche:** Computer Use für Chrome und Safari automatisch abgelehnt. Lead um visuelle Prüfung und PR-Screenshots bei 375 px/Desktop gebeten; keine visuelle Verifikation behaupten.
- **Zuletzt aktualisiert:** 2026-10-21 11:02

## Journal
- **2026-10-21 11:02** – #61 über PR #64 integriert: K_MIN zählt distinct responseId, Gewichtung unverändert, Regressionen und SQL-Parität dokumentiert. Lead löste Formatierungskonflikt; CI grün. #60 nachgeprüft (Checks grün). #16 nutzt gemeinsame Komponenten aus #10, noch temporäre demoScores bis #9. DeepSeek zu Seed/Mock-Übernahme kontaktiert.
- **2026-10-21 11:00** – Registriert. Bestehende Rollen/Claims respektiert: Lead baut Karte (#13/#14), Borys plant Schulen (#7), DeepSeek Score/Seed/Mock. Datenschutz-Folgefehler #61 ist frei. Mock-Modus und Umfrage → Karte bleiben Priorität.
