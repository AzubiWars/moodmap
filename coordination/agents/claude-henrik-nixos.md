# Agent: claude-henrik-nixos

> Kopiere diese Datei nach `coordination/agents/<agent-id>.md`. **Nur du selbst** bearbeitest deine Datei.

## Profil
- **Agent-ID:** `claude-henrik-nixos`
- **Modell:** Claude Opus 5.5
- **Tool/Harness:** Claude Code
- **Gerät / betreuender Mensch:** Henriks Rechner (NixOS) / GitHub: thehenrikwoebel
- **Primärrolle:** `map` – Karte & Visualisierung
- **Sekundärrollen:** visuelle Reviews (Screenshots, Mobile 375 px, per Playwright + System-Chromium); `fe`
- **Fähigkeiten im Setup:** kann Bilder ansehen ☑ · Web-Zugriff ☑ · kann Befehle/Tests ausführen ☑ · `gh` CLI verfügbar ☑
- **Stärken (Selbsteinschätzung):** UI/UX, React/TypeScript, Komponenten-Design, Responsiveness, Barrierefreiheit, Reviews
- **Schwächen / meide:** teures Modell → keine Fleißarbeit (Daten-Import, SQL, Massen-Tests); kein Lead-Job (Lead ist `claude-louis-tuxedo`)
- **Bevorzugte Labels:** `area:map`, `fit:ui`, `fit:reasoning`

## Aktueller Stand
> Bei jedem Session-Ende überschreiben.

- **Arbeite an:** #17 – Drill-down NRW → RegBez → Kreis + Breadcrumb (PR #96, in Review)
- **Status:** PR #96 offen, CI + Vercel grün; #70 (Themenfilter) visuell reviewt (LGTM)
- **Nächster Schritt:** nächstes `area:map`-Issue (#18 Schul-Marker / #19 Detail-Panel, sobald #17 gemerged)
- **Blockiert durch / brauche:** Review von #96
- **Zuletzt aktualisiert:** 2026-10-21 11:40

## Journal
> Neue Einträge oben. Kurz: was erledigt, was gelernt, was der Nächste wissen muss.

- **2026-10-21 11:40** – Rolle auf Wunsch des Menschen von `fe` auf `map` gewechselt. #17 umgesetzt (URL-State `regbez`/`kreis`, Kamera folgt der URL, Breadcrumb) → PR #96. Tooltip-Bug gefixt (Popup schluckte Klicks nach Kamerafahrt). #82 als Duplikat von #75 geschlossen. Tipp: Headless-Chromium `--screenshot` rendert MapLibre unzuverlässig → `playwright-core` + System-Chromium (`--use-angle=swiftshader`) mit explizitem Warten nutzen. PR-Screenshots liegen auf Orphan-Branch `screenshots`.
- **2026-10-21 10:58** – Registriert als `fe` (Frontend & PWA). Lead ist `claude-louis-tuxedo`.
