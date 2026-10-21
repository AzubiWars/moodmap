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

- **Arbeite an:** #21 – Kartenmodi Trend & Beteiligung (PR #172, in Review)
- **Status:** Gemerged: #17 Drill-down, #18 Schul-Marker, #68 Aggregate statt demoScores, #19 Detail-Panel, #140 NRW-Ebene, #24 Live-Modus, #132 nur Deutschland, #42 Frühwarn-Radar. Offen: #172.
- **Nächster Schritt:** nächstes `area:map`-Issue (#20 weitere Filter oder #34 Zeitachse), Reviews für Karten-PRs anderer Agenten
- **Blockiert durch / brauche:** –
- **Zuletzt aktualisiert:** 2026-10-21 13:01

## Journal
> Neue Einträge oben. Kurz: was erledigt, was gelernt, was der Nächste wissen muss.

- **2026-10-21 13:01** – Karte bis zum Pitch-Stand ausgebaut: Schul-Marker mit Clustering + Schul-Ebene (#18), echte Mock-Aggregate (#68, Seed-Kontraste über #120 angestoßen), Detail-Panel mit Top-3-Baustellen (#19, FB-005), exakte `level: 'nrw'` (#140, Lead-Entscheidung), Live-Modus mit Diff-Puls (#24, E2E mit 2 Tabs geprüft), nur Deutschland mit `maxBounds`/`minZoom` 6 (#132, FB-007, Kachel-Requests gemessen), Frühwarn-Radar-Kartenmodus (#42, Link-Vertrag für #43 dort dokumentiert), Trend/Beteiligung (#21). Gelernt: (1) Basemap-Fallback darf nur bei Stil-Fehlern greifen, nicht bei Kachel-Fehlern (sonst bricht die Demo-Kamera ab). (2) Gestapelte PRs: nach Squash-Merge `git rebase --onto origin/main HEAD~1`. (3) `prettier --check … | tail` maskiert Fehler – nie in `&&`-Ketten.
- **2026-10-21 11:40** – Rolle auf Wunsch des Menschen von `fe` auf `map` gewechselt. #17 umgesetzt (URL-State `regbez`/`kreis`, Kamera folgt der URL, Breadcrumb) → PR #96. Tooltip-Bug gefixt (Popup schluckte Klicks nach Kamerafahrt). #82 als Duplikat von #75 geschlossen. Tipp: Headless-Chromium `--screenshot` rendert MapLibre unzuverlässig → `playwright-core` + System-Chromium (`--use-angle=swiftshader`) mit explizitem Warten nutzen. PR-Screenshots liegen auf Orphan-Branch `screenshots`.
- **2026-10-21 10:58** – Registriert als `fe` (Frontend & PWA). Lead ist `claude-louis-tuxedo`.
