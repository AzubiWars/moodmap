# Agent: claude-jonat-pc

> Kopiere diese Datei nach `coordination/agents/<agent-id>.md`. **Nur du selbst** bearbeitest deine Datei.

## Profil
- **Agent-ID:** `claude-jonat-pc`
- **Modell:** Claude (Opus 5.5; Planung ggf. weitere Claude-Sessions auf demselben Rechner)
- **Tool/Harness:** Claude Code
- **Gerät / betreuender Mensch:** Windows-PC (`jonat`) / GitHub: Joni_Hoffi
- **Primärrolle:** `fe` – Frontend & PWA
- **Sekundärrollen:** visuelle Reviews (Screenshots, Mobile 375 px); `map`-UI, falls der Lead umverteilt
- **Fähigkeiten im Setup:** kann Bilder ansehen ☑ · Web-Zugriff ☑ · kann Befehle/Tests ausführen ☑ · `gh` CLI verfügbar ☐ (GitHub über MCP-Server)
- **Stärken (Selbsteinschätzung):** UI/UX, React/TypeScript, Komponenten-Design, Barrierefreiheit, Texte in Schüler-Sprache, saubere PR-Beschreibungen
- **Schwächen / meide:** teures Modell → keine Fleißarbeit (Daten-Import, SQL, Massen-Tests); kein Lead-Job
- **Bevorzugte Labels:** `fit:ui`, `area:survey`, `area:design`, `area:pwa`

## Aktueller Stand
> Bei jedem Session-Ende überschreiben.

- **Arbeite an:** #12 Mood-Check-Flow (PR offen, baut auf PR #122 / #11 auf)
- **Status:** #11 in Review (PR #122), #12 in Review
- **Nächster Schritt:** #29 Danke-Screen, dann #31 Swipe
- **Blockiert durch / brauche:** Review von #122 und #12 (danach #12 auf `main` rebasen)
- **Zuletzt aktualisiert:** 2026-10-21 12:30

## Journal
> Neue Einträge oben. Kurz: was erledigt, was gelernt, was der Nächste wissen muss.

- **2026-10-21 12:30** – #11 und #12 umgesetzt. `useParticipantStore` (`moodmap:participant:v1`) hält Schule + Stufe. Check-Flow: `selectQuestions` (9 Kernfragen, deterministisch), reiner Reducer `checkFlow.ts` (Karten = `Question[]`, #31 hängt `swipe` in `cardsOf` ein), `useCheckFlow` sendet über `getDataSource()`. Lokales Flag `moodmap:submitted:<waveId>`. `/check/done` ist Platzhalter bis #29. Lehre: `resetDemoData` kannte nur `moodmap.`-Keys, jetzt auch `moodmap:`.

- **2026-10-21 11:10** – #10 hat der Lead in #63 gebaut. Nachtrag: semantische Tokens (`surface/card/subtle/border/fg/muted/primary/accent`), Utilities `card` + `no-data`, Inter via Fontsource, Header-Slot `data-slot="header-actions"`. Für #35 nur Tokens unter `.dark` umdefinieren. Screenshots 375 px: headless Chrome hat Mindestbreite → playwright-core mit `channel: 'chrome'` nutzen.

- **2026-10-21 10:28** – Registriert als `fe` (Frontend & PWA). Lead ist ein anderer Agent.
