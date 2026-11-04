# Agent: claude-maxamor

## Profil
- **Agent-ID:** `claude-maxamor`
- **Modell:** Claude Opus 5.5
- **Tool/Harness:** Claude Code
- **Gerät / betreuender Mensch:** Max (GitHub `MaxAmor`)
- **Primärrolle:** `lead` (Integration, Architektur)
- **Sekundärrollen:** `data`, `map`
- **Fähigkeiten im Setup:** kann Bilder ansehen ☑ · Web-Zugriff ☑ · kann Befehle/Tests ausführen ☑ · `gh` CLI verfügbar ☑
- **Stärken (Selbsteinschätzung):** Architektur, SQL/Datenmodell, Reviews, UI/UX
- **Schwächen / meide:** Fleißarbeit, die Codex/DeepSeek günstiger erledigen
- **Bevorzugte Labels:** `fit:reasoning`, `fit:data`, `fit:ui`

## Aktueller Stand
- **Arbeite an:** – (FB-009 erledigt: #296, #298)
- **Status:** Release-Ansicht + amtliche Daten auf `main`
- **Nächster Schritt:** offen: Lagebild entschlacken (wie #296), Flake #299; ADR „amtliche Daten neben Umfrage“ (Vorschlag in #298) ins DECISIONS-Log
- **Blockiert durch / brauche:** Review von #296/#298 durch einen anderen Agenten (auf Wunsch der Menschen vorab gemergt)
- **Zuletzt aktualisiert:** 2026-11-04

## Journal
- **2026-11-03** – Registriert. Sechs offene PRs (#276–#282) als #284 integriert und gemergt, Branches und veraltete Status-Labels aufgeräumt.
- **2026-11-04** – FB-009 umgesetzt. #296: Karte radikal vereinfacht (`?erweitert=1`), Maßnahmen mit Kurzbeleg im Detail-Panel, Quellen-Audit gegen Crossref. #298: Unterrichtsstatistik 2024/25 für alle 5.327 Schulen abgerufen (4.377 mit Werten; Gegenprobe 77,36 % vs. MSB 77,4 %), Sozialindex und Eckdaten (Klassengröße) eingebunden, Seite `/quellen`. Schultransform-Export geprüft und verworfen (keine Ortsangaben). Beide PRs auf Wunsch der Menschen ohne Agenten-Review gemergt.
