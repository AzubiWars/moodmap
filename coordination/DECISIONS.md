# Entscheidungslog (ADR-light)

> Append-only. Neue Entscheidungen **unten** anhängen. Nur der Lead schreibt hier (andere schlagen per Issue mit Label `type:decision` vor).
> Was hier steht, gilt – nicht in Issues neu diskutieren. Revidieren = neuer Eintrag, der den alten ersetzt („ersetzt ADR-00x").

Format:
```markdown
## ADR-<nr> · <Titel>
- **Datum:** · **Status:** akzeptiert | ersetzt durch ADR-x
- **Kontext:** Warum mussten wir entscheiden?
- **Entscheidung:** Was gilt?
- **Konsequenzen:** Was folgt daraus?
```

---

## ADR-001 · Frontend-Stack: Vite + React + TypeScript SPA
- **Datum:** 2026-10-21 · **Status:** akzeptiert (vorläufig – Lead darf in der ersten Session per neuem ADR revidieren)
- **Kontext:** Hackathon, mehrere Agenten unterschiedlicher Modelle, PWA gewünscht, kein SEO-Bedarf.
- **Entscheidung:** Vite + React 18 + TypeScript (strict) + Tailwind + shadcn/ui + React Router + Zustand + TanStack Query. Details in `docs/ARCHITECTURE.md`.
- **Konsequenzen:** Kein Server-Rendering; alle Server-Logik in Supabase (DB-Funktionen, Edge Functions).

## ADR-002 · Karte: MapLibre GL mit GeoJSON-Choroplethen
- **Datum:** 2026-10-21 · **Status:** akzeptiert
- **Kontext:** Choroplethen auf 3 Ebenen + mehrere hundert bis tausende Schulmarker, flüssiges Zoomen auf Handy.
- **Entscheidung:** MapLibre GL JS via `react-map-gl/maplibre`, keyless Basiskarte (OpenFreeMap), Fallback ohne Basiskarte.
- **Konsequenzen:** Kein API-Key nötig; GeoJSON muss vereinfacht werden (< 1 MB).

## ADR-003 · Backend: Supabase + verpflichtender Mock-Modus
- **Datum:** 2026-10-21 · **Status:** akzeptiert
- **Kontext:** Live-Demo braucht Persistenz und Realtime; die Demo darf aber nie an Netz/Keys scheitern.
- **Entscheidung:** Supabase (Postgres, RLS, Realtime, Edge Functions). Alle UI-Teile nutzen ausschließlich das `DataSource`-Interface; `mockSource` ist Default und muss immer funktionieren.
- **Konsequenzen:** Jede Datenfunktion wird zweimal implementiert (Mock + Supabase); Score-Logik muss in TS und SQL identisch sein (Tests!).

## ADR-004 · Hosting: Vercel, verbunden mit GitHub
- **Datum:** 2026-10-21 · **Status:** akzeptiert (Vorgabe der Menschen)
- **Kontext:** Menschen wollen jeden Stand schnell auf dem Handy testen.
- **Entscheidung:** Vercel mit GitHub-Integration: `main` → Production, jeder PR → Preview-Deployment. SPA-Rewrite über `vercel.json`. Env-Variablen nur im Vercel-Dashboard.
- **Konsequenzen:** Agenten deployen nicht manuell; Preview-URL gehört in jede PR-Beschreibung.

## ADR-005 · Datenschutz: Mindestanzahl K_MIN = 10, keine Freitexte, keine öffentlichen Schulwerte
- **Datum:** 2026-10-21 · **Status:** akzeptiert
- **Kontext:** Minderjährige, Schulkontext, Jury-Fragen.
- **Entscheidung:** Siehe `docs/PRIVACY.md`.
- **Konsequenzen:** Graue „zu wenige Daten"-Darstellung ist Pflicht; Rollen-Umschalter steuert Sichtbarkeit der Schulebene.

## ADR-006 · Agenten-Team: Claude (Lead), Codex, DeepSeek
- **Datum:** 2026-10-21 · **Status:** akzeptiert (Vorgabe der Menschen)
- **Kontext:** Die Menschen setzen Claude, Codex und DeepSeek als Agenten ein.
- **Entscheidung:** Rollenverteilung laut `AGENTS.md` §3: Claude = Lead/Review/UI, Codex = Backend/Daten/Infra/Karte, DeepSeek = Algorithmen/Seed/Tests/Doku. Reviews werden zwischen Modellen gekreuzt.
- **Konsequenzen:** Visuelle Reviews nur durch Claude oder Menschen.

## ADR-007 · Pitch-Säule „Prävention durch Dialog – Politik und Schüler gemeinsam"
- **Datum:** 2026-10-21 · **Status:** akzeptiert (Vorgabe der Menschen, FB-002)
- **Kontext:** Das Team will im Pitch betonen, dass Moodmap Eskalationen wie zuletzt in Frankreich vorbeugen soll, indem Politik und Schüler:innen zusammenarbeiten.
- **Entscheidung:** Moodmap hat zwei Säulen: **Zuhören** (Mood-Check + Moodmap) und **Antworten** (Frühwarn-Radar + „Politik antwortet"). Neues Pflichtthema `voice` („Gehört werden"). Das Frühwarn-Radar ist ausdrücklich ein Dialog- und Unterstützungsinstrument, keine Überwachung (`docs/PRIVACY.md` §7).
- **Konsequenzen:** Neue Issues MM-42 bis MM-45 mit Priorität P1 in M3; Demo-Skript und Storyline in `docs/PITCH.md` angepasst; Frankreich-Bezug wird erst nach Recherche (MM-44) konkret benannt.
