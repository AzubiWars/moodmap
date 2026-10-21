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

- **Arbeite an:** #36 Offline-Puffer für Antworten (PR offen)
- **Status:** #36 in Review
- **Nächster Schritt:** #29 Danke-Screen, dann #31 Swipe
- **Blockiert durch / brauche:** Review von #36
- **Zuletzt aktualisiert:** 2026-10-21 13:40

## Journal
> Neue Einträge oben. Kurz: was erledigt, was gelernt, was der Nächste wissen muss.

- **2026-10-21 13:40** – #36 Offline-Puffer. `src/lib/outbox.ts` (`moodmap:outbox:v1`) puffert nur `ResponseInput`, nie Freitext. `useCheckFlow` puffert bei `navigator.onLine === false` oder wenn `submitResponse` wirft. Status `queued` zeigt den Hinweis, der live auf „Angekommen“ wechselt. `startOutbox()` läuft in `App.tsx` (`online`-Event + Backoff 2 s bis 5 min). `already_submitted` gilt als Erfolg. Nach 8 Server-`error` wird der Eintrag verworfen, Netzfehler zählen nicht. Lehre: Unter Windows bricht `main` lokal bei `MapSearch.tsx` gegen `mapSearch.ts` (Groß-/Kleinschreibung, Build + MapPage-Tests). Auf CI/Linux tritt das nicht auf.

- **2026-10-21 12:50** – #25 Lagebild NRW. Vertrag: `AggregateRow.distribution` (mood5-Zählwerte je Stufe, `null` unter K_MIN, nicht bei `topic: 'all'`). NRW-Werte kommen direkt aus `level: 'nrw'` (#140); `combineRows` in `features/dashboard/lagebild.ts` fasst nur noch Schulform-Zeilen zusammen. Prozente über Hare-Niemeyer, damit sie genau 100 ergeben. Die Verteilung zählt je Teilnahme und Frage höchstens eine Antwort. Lokal laufen PGlite- und Seed-Tests unter Volllast in Timeouts, deshalb `--maxWorkers=2` oder einzeln ausführen.

- **2026-10-21 (Session #32)** – `/privacy` in einfacher Sprache als sechs `<details>`-Akkordeons (Überschrift im `summary`), Hilfe-Hinweis 116 111 unten. Textgrundlage: `docs/PRIVACY.md` + Entwurf von MaxAmor (#32-Kommentar). Rechtsbezüge (SchulG NRW, „juristisch geprüft“) bewusst nicht übernommen, da nicht belegt. Lehre: Vitest-Läufe über `supabase/tests` schlagen ohne laufende DB fehl (Hook-Timeout), `npx vitest run src` ist der sinnvolle Check.

- **2026-10-21 12:30** – #11 und #12 umgesetzt. `useParticipantStore` (`moodmap:participant:v1`) hält Schule + Stufe. Check-Flow: `selectQuestions` (9 Kernfragen, deterministisch), reiner Reducer `checkFlow.ts` (Karten = `Question[]`, #31 hängt `swipe` in `cardsOf` ein), `useCheckFlow` sendet über `getDataSource()`. Lokales Flag `moodmap:submitted:<waveId>`. `/check/done` ist Platzhalter bis #29. Lehre: `resetDemoData` kannte nur `moodmap.`-Keys, jetzt auch `moodmap:`.

- **2026-10-21 11:10** – #10 hat der Lead in #63 gebaut. Nachtrag: semantische Tokens (`surface/card/subtle/border/fg/muted/primary/accent`), Utilities `card` + `no-data`, Inter via Fontsource, Header-Slot `data-slot="header-actions"`. Für #35 nur Tokens unter `.dark` umdefinieren. Screenshots 375 px: headless Chrome hat Mindestbreite → playwright-core mit `channel: 'chrome'` nutzen.

- **2026-10-21 10:28** – Registriert als `fe` (Frontend & PWA). Lead ist ein anderer Agent.
