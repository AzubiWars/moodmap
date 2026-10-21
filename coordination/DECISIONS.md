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
- **Entscheidung:** Vite + React + TypeScript (strict) + Tailwind + shadcn/ui + React Router + Zustand + TanStack Query. Details in `docs/ARCHITECTURE.md`, Versionen siehe ADR-008.
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

## ADR-008 · Nur der Lead merged; Stack-Versionen
- **Datum:** 2026-10-21 · **Status:** Punkt 1 ersetzt durch ADR-009, Punkt 2 gilt
- **Kontext:** Mehrere Agenten arbeiten parallel. Ein zentraler Merger verhindert Konflikte und hält `main` konsistent. Beim Scaffold waren neuere Hauptversionen verfügbar als in ADR-001 geplant.
- **Entscheidung:** (1) Nur der Lead `claude-louis-tuxedo` merged PRs nach `main` (Details `AGENTS.md` §5.5). (2) Stack-Versionen: React 19, Vite 8, Tailwind CSS 4 (CSS-first, Tokens in `src/index.css` per `@theme`), React Router 7, Vitest 5, ESLint 10, TypeScript **6.0** (nicht 7, weil typescript-eslint TS 7 noch nicht unterstützt). Pfad-Alias `@/` → `src/`.
- **Konsequenzen:** Agenten warten nach dem PR auf den Lead. Neue Abhängigkeiten passend zu diesen Versionen wählen; shadcn-Komponenten mit `npx shadcn@latest add <name>` hinzufügen (`components.json` liegt bereit).

## ADR-009 · Alle Agenten dürfen mergen (ersetzt ADR-008 Punkt 1)
- **Datum:** 2026-10-21 · **Status:** akzeptiert (Vorgabe der Menschen)
- **Kontext:** Ein einziger Merger wird bei mehreren parallelen Agenten zum Flaschenhals.
- **Entscheidung:** Jeder Agent darf PRs mergen, wenn die CI grün ist und ein anderer Agent ✅ LGTM gegeben hat. Der Lead bleibt Haupt-Merger und Reviewer und löst Merge-Konflikte.
- **Konsequenzen:** `AGENTS.md` §5.5 angepasst. Stack-Versionen aus ADR-008 gelten weiter.

## ADR-010 · PGlite für SQL-Tests; schwere Generator-Tools nur on demand
- **Datum:** 2026-10-21 · **Status:** akzeptiert (Lead, #76)
- **Kontext:** ADR-003 verlangt identische Score-Logik in TS und SQL – ohne Docker/Supabase-Projekt war SQL nicht testbar. Gleichzeitig blähen Werkzeuge mit nativen Abhängigkeiten (mapshaper → better-sqlite3, PWA-Icon-Generator → sharp) jedes `npm ci` in CI und auf Vercel auf.
- **Entscheidung:** (1) `@electric-sql/pglite` als devDependency für SQL-Tests der Migrationen (#22), mit gemeinsamen Fixtures für TS und SQL. (2) Generator-Tools, deren Ausgabe committet wird, sind **keine** Dependencies, sondern werden on demand mit gepinnter Version geladen (`npm run geo:build`, `npm run pwa:icons`).
- **Konsequenzen:** SQL-Tests laufen in Vitest/CI (Ziel < 60 s). Generierte Dateien (GeoJSON, Schulen, Icons) bleiben im Repo, ihre Reproduzierbarkeit sichern Tests bzw. Skripte.

## ADR-011 · 3D-Gebäude bei hohem Zoom und Deutschland-Maske
- **Datum:** 2026-10-21 · **Status:** akzeptiert (von den Menschen ausdrücklich gewollt, #85/#98, PR #89)
- **Kontext:** Auf Schulebene war die Karte zu grob (`maxZoom` 14). Die Menschen wollen Schulgelände detailliert sehen, außerdem soll der Blick auf NRW bleiben.
- **Entscheidung:** `maxZoom` 18, ab Zoom 15 **3D-Gebäude** aus dem vorhandenen OpenFreeMap-Source (`fill-extrusion`, keine neue Dependency, kein Key), automatischer Pitch 45°. Die Mood-Flächen blenden mit dem Zoom aus und kombinieren das mit dem Abblenden aus dem Drill-down (#17) in **einer** `fill-opacity`-Expression (`zoom` steht in MapLibre auf oberster Ebene). Außerhalb Deutschlands legt sich eine Maske aus Natural Earth (Public Domain) über die Karte.
- **Konsequenzen:** Der `BLANK_STYLE`-Fallback zeigt keine Gebäude. Das ist okay, die Mood-Flächen bleiben die Hauptinformation. Auf schwachen Handys 3D im Auge behalten. Schul-Marker (#18) müssen bei Pitch sichtbar bleiben (über den Gebäuden rendern).

## ADR-012 · Keine erfundenen Stimmungswerte an echten Schulnamen
- **Datum:** 2026-10-21 · **Status:** akzeptiert (Lead, Review #100) – Menschen bitte bestätigen
- **Kontext:** Mit #100 liegt das echte Schulverzeichnis NRW vor (5.327 Schulen, dl-de/by-2-0). Die Umfragewerte im Prototyp sind aber synthetisch. Würde die öffentlich erreichbare Demo echte, namentlich genannte Schulen mit erfundenen Werten zeigen („Städtische Gesamtschule X: ⛈️ sehr schlecht“), wären das falsche Aussagen über reale Einrichtungen. Das schadet Schulen und dem Pitch (Vertrauen, PRIVACY §4 „kein Pranger“).
- **Entscheidung:** Synthetische Stimmungswerte erscheinen **nur auf synthetischen Schulen** (`public/data/schools.json`, Demo-Schule `DEMO42`). Das echte Verzeichnis (`schools.real.json`) darf für Standorte, Anzahlen und Abdeckung genutzt werden (z. B. „5.327 Schulen in NRW“, Kartenpunkte ohne Wertung) oder mit Namen nur dann, wenn **echte** Antworten vorliegen. `DEMO42` wird im echten Datensatz nie vergeben. Aggregate auf Kreis-/Bezirksebene mit Demo-Daten bleiben ok (klar als Demo gekennzeichnet).
- **Konsequenzen:** #9 (MockDataSource) und #18 (Schul-Marker) nutzen für Werte die synthetischen Schulen. Ein Umschalten auf echte Schulen kommt erst mit echten Daten (Supabase-Modus).

## ADR-013 · Demo-Daten auf echten Standorten, ohne echte Schulnamen (präzisiert ADR-012)
- **Datum:** 2026-10-21 · **Status:** akzeptiert (Vorgabe der Menschen)
- **Kontext:** Die Menschen bestätigen ADR-012 im Kern: keine echten Schulnamen mit Demo-Werten. Gewünscht ist aber, dass die Demo **echte Schulstandorte** nutzt.
- **Entscheidung:** Demo-Schulen dürfen auf echten Standorten aus `schools.real.json` liegen (Koordinaten, Kreis, Schulform, Stadt, grobe Schülerzahl). Ihre **Namen werden anonymisiert** (z. B. „Gesamtschule · Düsseldorf #3“), Schulnummern und Join-Codes bleiben synthetisch. Echte Namen erscheinen nur mit echten Antworten. `DEMO42` bleibt die Demo-Schule mit synthetischem Namen.
- **Konsequenzen:** Den synthetischen Schul-Datensatz für Mock/Seed aus den echten Standorten ableiten (eigenes Issue). Bis dahin gelten die 300 synthetischen Schulen.

## ADR-014 · Agenten wählen ihre Aufgaben selbst
- **Datum:** 2026-10-21 · **Status:** akzeptiert (Vorgabe der Menschen)
- **Kontext:** Kurz testweise hat der Lead Issues aktiv zugewiesen (`coordination/PLAN.md`). Die Menschen bevorzugen den vorherigen Modus, „das lief gut“.
- **Entscheidung:** Die Agenten claimen selbst nach `AGENTS.md` §5. Der Lead reviewt, merged, löst Konflikte, triagiert Feedback und pingt nur, wenn der kritische Pfad liegen bleibt. `PLAN.md` entfällt.

## ADR-015 · Pitch-Live-Test auf eigenem Test-Standort außerhalb NRW
- **Datum:** 2026-10-21 · **Status:** akzeptiert (Vorgabe der Menschen, FB-006)
- **Kontext:** Im Pitch sollen 100–200 Personen live per QR-Code teilnehmen. Ihre Daten dürfen das NRW-Bild nicht verfälschen, und der Test muss wiederholbar sein.
- **Entscheidung:** Ein Test-Standort mit `is_test`-Flag außerhalb NRW (konfigurierbar) mit eigenem Join-Code. Er wird aus allen NRW-Aggregaten, dem Dashboard und dem Radar ausgeschlossen. Der Live-Test läuft über **Supabase** (der Mock kann nicht geräteübergreifend). Die Beamer-Ansicht pollt die Aggregate alle 2–3 s. Der Reset löscht nur Test-Daten und ist per PIN/Token über eine Edge Function geschützt.
- **Konsequenzen:** #23 (SupabaseDataSource) und #24 (Live) werden P0. Vor dem Pitch ist ein Lasttest mit 200 Abgaben Pflicht. Der Mock-Modus bleibt Fallback (Live dann nur über Tabs eines Geräts).

## ADR-016 · Freitext mit KI-Moderation über OpenRouter (ersetzt das Freitext-Verbot aus ADR-005)
- **Datum:** 2026-10-21 · **Status:** akzeptiert (Vorgabe der Menschen, FB-006)
- **Kontext:** Die Menschen wollen freie Eingaben testen, KI-geprüft: Themen clustern, Schimpfwörter und unpassende Jugendsprache entfernen.
- **Entscheidung:** Optionaler Freitext (≤ 280 Zeichen). Moderation in einer Supabase Edge Function über OpenRouter mit strukturiertem JSON (`allowed`, `cleaned`, `topics`, `cluster`, `concern`). Gespeichert wird nur das bereinigte Ergebnis, nie der Rohtext. Die Anzeige erfolgt clusterweise ab K_MIN. Fällt die KI aus, wird nur der Freitext verworfen, die Abgabe läuft durch. Die KI entfernt zusätzlich Namen und persönliche Angaben.
- **Konsequenzen:** PRIVACY §1.3/§6b und PRODUCT_SPEC §3.13 angepasst. Der OpenRouter-Key kommt von den Menschen und wird nur als Supabase-Secret gesetzt. Ein Echtbetrieb erfordert eine Prüfung der Drittverarbeitung.
