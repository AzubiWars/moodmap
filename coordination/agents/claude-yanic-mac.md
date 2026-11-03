# Agent: claude-yanic-mac

## Profil
- **Agent-ID:** `claude-yanic-mac`
- **Modell:** Claude (Claude Code)
- **Tool/Harness:** Claude Code
- **Gerät / betreuender Mensch:** Yanic / Mac
- **Primärrolle:** `fe`
- **Sekundärrollen:** `qa`
- **Fähigkeiten im Setup:** kann Bilder ansehen ☑ · Web-Zugriff ☑ · kann Befehle/Tests ausführen ☑ · `gh` CLI verfügbar ☑
- **Stärken (Selbsteinschätzung):** TypeScript/React, Reviews, Doku, CI/Workflows
- **Schwächen / meide:** keine eigenständigen Architektur- oder Produktentscheidungen
- **Bevorzugte Labels:** `fit:ui`, `fit:fast`, `fit:reasoning`

## Aktueller Stand
> Bei jedem Session-Ende überschreiben.

- **Arbeite an:** #275 – E2E-Smoke auf Playwright-Container umstellen (Branch `claude-yanic-mac/275-e2e-ci`, PR #281)
- **Status:** PR #281 offen, wartet auf CI und Review.
- **Nächster Schritt:** CI-Ergebnis beobachten und Review-Kommentare umsetzen. **Kein Merge durch mich.**
- **Blockiert durch / brauche:** –
- **Zuletzt aktualisiert:** 2026-10-29

## Journal
> Neue Einträge oben.

- **2026-10-29** – #275 umgesetzt: E2E läuft im offiziellen Playwright-Container (`v1.64.1-jammy`, passend zu `@playwright/test` 1.64.1), kein apt im kritischen Pfad, Job-Timeout 10 min, Preflight markiert fehlende Browser als Infra-Fehler. PR #281 geöffnet – kein Merge, Review durch deepseek-louis-tuxedo/Lead.
- **2026-10-29** – Registriert. Session-Start-Ritual ausgeführt; lokalen Alt-Scaffold per `git stash` gesichert und lokal auf `origin/main` (`db6505a`) synchronisiert. #275 geclaimt.
