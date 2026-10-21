# Roadmap & Start-Backlog

> Der **Lead** legt aus diesem Backlog in seiner ersten Session GitHub Issues an (mit Labels laut `AGENTS.md` §6) und hakt hier ab, welche angelegt wurden (`→ #nr`). Danach sind die **Issues die Quelle der Wahrheit**, nicht diese Datei.
> Die Reihenfolge der Meilensteine ist bindend: Erst muss der dünne Durchstich funktionieren, dann wird es schön.

## Meilensteine

| # | Meilenstein | Ziel / Demo-fähig wenn … |
|---|---|---|
| **M0** | Fundament | Repo-Scaffold steht, CI grün, Vercel-Deploy live, Mock-Daten + Typen vorhanden, alle Agenten registriert |
| **M1** | Walking Skeleton | Mood-Check ausfüllbar → Antwort landet im Store → NRW-Karte mit eingefärbten Kreisen (Mock) |
| **M2** | Moodmap komplett | Drill-down bis Schule, Themenfilter, Detail-Panel, Legende, mobile Bottom-Sheet |
| **M3** | Pitch-Features | Supabase + Live-Update, Dashboard mit Hotspots, **Frühwarn-Radar + „Politik antwortet"**, KI-Lagebericht, PWA installierbar, Danke-Screen „Schule vs. NRW" |
| **M4** | Polish & Pitch | Echte Schuldaten (falls verfügbar), Zeitachse, Dark Mode, Demo-Skript geprobt, Fallback-Video, Pitch-Folien-Inhalte |

**Faustregel Zeitverteilung** (bei z. B. 24–48 h Hackathon): M0+M1 ≈ 25 %, M2 ≈ 30 %, M3 ≈ 25 %, M4 ≈ 20 %. Spätestens bei 80 % der Zeit: **Feature Freeze** – nur noch Bugfixes und Pitch.

---

## Start-Backlog

Format: `ID · [area] Titel` — Labels — Abhängigkeiten — Akzeptanzkriterien (Kurzform)

### M0 – Fundament

- [ ] **MM-01 · [infra] Projekt-Scaffold** — `type:chore, area:infra, prio:P0, fit:reasoning, size:M` — keine
  Vite + React + TS (strict) + Tailwind + shadcn/ui + React Router + ESLint/Prettier + Vitest; Ordnerstruktur laut `docs/ARCHITECTURE.md` §2; Scripts `dev, build, lint, typecheck, test`; `.env.example`; `.gitignore`; `vercel.json` (SPA-Rewrite).
- [ ] **MM-02 · [infra] GitHub Actions CI** — `type:chore, area:infra, prio:P0, fit:fast, size:S` — MM-01
  Workflow auf PR + main: install, lint, typecheck, test, build.
- [ ] **MM-03 · [infra] Labels anlegen & Vercel-Deploy verifizieren** — `type:chore, area:infra, prio:P0, fit:fast, size:S` — MM-01
  Labels aus `AGENTS.md` §6; prüfen, dass Production- und Preview-Deploys laufen (Vercel ist von den Menschen verbunden); Production-URL in README.
- [ ] **MM-04 · [backend] Typen & DataSource-Interface** — `type:feature, area:backend, prio:P0, fit:reasoning, size:S` — MM-01
  `src/types/*`, `src/data/api.ts` exakt laut Architektur §3. **Blockiert fast alles – zuerst mergen!**
- [ ] **MM-05 · [backend] Themen & Fragen als Code** — `type:feature, area:survey, prio:P0, fit:fast, size:S` — MM-04
  `src/data/topics.ts` aus `docs/SURVEY_TOPICS.md` (Themen 0–8 P0, 9–14 als Daten).
- [ ] **MM-06 · [data] GeoJSON NRW (RegBez + Kreise) beschaffen & vereinfachen** — `type:feature, area:map, prio:P0, fit:data, size:M` — MM-01
  Quelle recherchieren + Lizenz notieren; WGS84; < 1 MB gesamt; Properties `id, name, regbez_id`; nach `public/geo/`.
- [ ] **MM-07 · [data] Schulen: synthetischer Fallback** — `type:feature, area:backend, prio:P0, fit:data, size:S` — MM-06
  ~300 Schulen plausibel verteilt in Kreis-Polygonen, alle Schulformen, mit `join_code`; Demo-Schule mit Code `DEMO42`.
- [ ] **MM-08 · [data] Seed-Generator synthetische Antworten** — `type:feature, area:backend, prio:P0, fit:reasoning, size:M` — MM-04, MM-05, MM-07
  Deterministisch, 8–12 Wellen, Muster laut Architektur §7, einige Schulen < K_MIN.
- [ ] **MM-09 · [backend] MockDataSource + Score-Logik** — `type:feature, area:backend, prio:P0, fit:reasoning, size:M` — MM-04, MM-08
  `mockSource.ts`, `lib/score.ts` (Score, Gesamt-Mood, K_MIN, Delta) mit Unit-Tests; Antworten in localStorage; BroadcastChannel für Live-Event.
- [ ] **MM-10 · [design] Design-Tokens & Basis-Komponenten** — `type:feature, area:design, prio:P0, fit:ui, size:M` — MM-01
  Mood-Farben, `WeatherIcon`, `MoodBadge`, `TopicChip`, `DemoBanner`, App-Layout mit Navigation (mobil: Bottom-Nav).

### M1 – Walking Skeleton

- [ ] **MM-11 · [survey] Onboarding & Schul-Einstieg via `/s/:code`** — `area:survey, prio:P0, fit:ui, size:S` — MM-09, MM-10
- [ ] **MM-12 · [survey] Mood-Check-Flow (mood5-Karten, Fortschritt, Submit)** — `area:survey, prio:P0, fit:ui, size:M` — MM-05, MM-09, MM-10
- [ ] **MM-13 · [map] Basiskarte + Kreis-Choropleth nach Gesamt-Mood** — `area:map, prio:P0, fit:ui, size:M` — MM-06, MM-09
- [ ] **MM-14 · [map] Legende inkl. „zu wenige Daten"** — `area:map, prio:P0, fit:fast, size:S` — MM-13
- [ ] **MM-15 · [app] Landing Page `/`** — `area:design, prio:P0, fit:ui, size:S` — MM-10

### M2 – Moodmap komplett

- [ ] **MM-16 · [map] Themenfilter-Chipleiste + URL-State** — `area:map, prio:P0, fit:ui, size:S` — MM-13
- [ ] **MM-17 · [map] Drill-down RegBez → Kreis → Schule + Breadcrumb** — `area:map, prio:P0, fit:reasoning, size:M` — MM-13
- [ ] **MM-18 · [map] Schul-Marker mit Clustering** — `area:map, prio:P0, fit:ui, size:M` — MM-17
- [ ] **MM-19 · [map] Detail-Panel (Sidebar/Bottom-Sheet) mit Themenübersicht vs. NRW** — `area:map, prio:P0, fit:ui, size:M` — MM-17
- [ ] **MM-20 · [map] Weitere Filter: Schulform, Stufe, Zeitraum** — `area:map, prio:P1, fit:ui, size:M` — MM-16
- [ ] **MM-21 · [map] Kartenmodus Trend & Beteiligung** — `area:map, prio:P1, fit:ui, size:S` — MM-16

### M3 – Pitch-Features

- [ ] **MM-22 · [backend] Supabase-Schema, RLS, `submit_response`, Aggregations-RPC** — `area:backend, prio:P1, fit:reasoning, size:L → aufteilen` — MM-04
- [ ] **MM-23 · [backend] SupabaseDataSource + Seed-Upload** — `area:backend, prio:P1, fit:data, size:M` — MM-22
- [ ] **MM-24 · [map] Live-Modus: neue Antwort → Refetch + Marker pulsiert** — `area:map, prio:P1, fit:ui, size:S` — MM-18 (+ MM-23 für echtes Live)
- [ ] **MM-25 · [dashboard] Ministeriums-Dashboard: KPIs, Themen-Ranking, Vergleiche** — `area:dashboard, prio:P1, fit:ui, size:M` — MM-09
- [ ] **MM-26 · [dashboard] Hotspots & Alerts** — `area:dashboard, prio:P1, fit:reasoning, size:S` — MM-25
- [ ] **MM-27 · [dashboard] KI-Lagebericht (Edge Function + Mock-Bericht)** — `area:dashboard, prio:P1, fit:reasoning, size:M` — MM-25
- [ ] **MM-28 · [pwa] Manifest, Icons, Service Worker, installierbar** — `area:pwa, prio:P1, fit:fast, size:S` — MM-01
- [ ] **MM-29 · [survey] Danke-Screen „Deine Schule vs. NRW" + Teilen** — `area:survey, prio:P1, fit:ui, size:S` — MM-12
- [ ] **MM-30 · [app] Rollen-Umschalter & `/demo`-Seite mit QR-Code** — `area:infra, prio:P0, fit:ui, size:S` — MM-10
- [ ] **MM-31 · [survey] Swipe-Aussagen** — `area:survey, prio:P1, fit:ui, size:M` — MM-12
- [ ] **MM-32 · [app] Datenschutz-Seite `/privacy` in einfacher Sprache** — `area:design, prio:P1, fit:fast, size:S` — MM-10

### M4 – Polish & Pitch

- [ ] **MM-33 · [data] Echtes Schulverzeichnis NRW importieren** — `area:backend, prio:P1, fit:data, size:M` — MM-07 (Recherche zuerst, `fit:research`)
- [ ] **MM-34 · [map] Zeitachse mit Play-Animation** — `area:map, prio:P1, fit:ui, size:M` — MM-20
- [ ] **MM-35 · [design] Dark Mode** — `area:design, prio:P2, fit:ui, size:S`
- [ ] **MM-36 · [pwa] Offline-Puffer für Antworten** — `area:pwa, prio:P2, fit:reasoning, size:M`
- [ ] **MM-37 · [survey] Lehrkräfte-Modus (Themen §4)** — `area:survey, prio:P2, fit:ui, size:M`
- [ ] **MM-38 · [school] Schul-Dashboard + QR-Plakat** — `area:dashboard, prio:P2, fit:ui, size:M`
- [ ] **MM-39 · [qa] Playwright-Smoke: Mood-Check → Karte** — `type:chore, area:infra, prio:P1, fit:fast, size:S` — MM-13
- [ ] **MM-40 · [pitch] Demo-Skript proben, Screenshots, Fallback-Video** — `area:pitch, prio:P0, fit:fast, size:M` — M3
- [ ] **MM-41 · [pitch] Fakten & Zahlen für Pitch recherchieren und belegen** — `area:pitch, prio:P1, fit:research, size:S`

### Pitch-Säule „Prävention durch Dialog" (gehört zu M3 – Pitch-kritisch!)

- [ ] **MM-42 · [dashboard] Frühwarn-Radar: Spannungs-Index + Kartenmodus + Dashboard-Kachel** — `area:dashboard, prio:P1, fit:reasoning, size:M` — MM-09, MM-13
  Berechnung laut Architektur §5.8 mit Unit-Tests; Kartenmodus mit 3 Stufen; Handlungsvorschläge; Link zu „Antwort veröffentlichen".
- [ ] **MM-43 · [dashboard] „Politik antwortet": Antworten veröffentlichen, auf Karte & Danke-Screen anzeigen, Bewertung** — `area:dashboard, prio:P1, fit:ui, size:M` — MM-09, MM-29
  Laut `docs/PRODUCT_SPEC.md` §3.9; Mock: localStorage + BroadcastChannel, damit eine im Dashboard veröffentlichte Antwort live auf dem Schüler-Screen erscheint.
- [ ] **MM-44 · [pitch] Frankreich-Bezug recherchieren & belegen** — `area:pitch, prio:P1, fit:research, size:S`
  Welches Ereignis genau (mit den Menschen abstimmen, `needs:human`), Fakten + seriöse Quelle, 2–3 Sätze für Hook in `docs/PITCH.md` und `docs/VISION.md`; Ton sachlich, nicht reißerisch.
- [ ] **MM-45 · [data] Seed: Frühwarn-Story + Beispiel-Antworten der Politik** — `area:backend, prio:P1, fit:reasoning, size:S` — MM-08
  Muster laut Architektur §7 (Kreis mit steigendem Spannungs-Index, Erholung nach Politik-Antwort, `voice` landesweit niedrig).

## Parallelisierungs-Plan (wer kann wann loslegen?)

```
Start ─┬─ Claude   (lead): MM-01 → MM-04 (schnell mergen!) → Reviews, Triage → MM-10 → MM-12 → MM-19
       ├─ Codex    (data/map): MM-02, MM-03 → MM-06 → MM-07 → MM-13 → MM-17/18 → MM-22/23
       └─ DeepSeek (qa): MM-05 → MM-08 (Seed) → MM-09 (Score-Logik + Tests) → MM-45 → MM-42 (Index-Logik) → MM-26 → MM-39
```
Pitch-Säule „Prävention durch Dialog": Logik von MM-42 macht DeepSeek, Kartenmodus und MM-43 (UI) übernimmt Claude. MM-44 (Recherche) übernimmt ein Agent mit Web-Zugriff in Absprache mit den Menschen.
Bei mehr als einer Instanz pro Modell: zusätzliche Claude-Instanz übernimmt `map`/`fe` (MM-15, MM-11, MM-16, MM-25), zusätzliche Codex-Instanz `fe`/`pwa` (MM-28, MM-30, MM-29).
Solange MM-04 nicht gemerged ist, arbeiten UI-Agenten mit lokalen Dummy-Daten im exakt gleichen Typformat aus `docs/ARCHITECTURE.md` §3.
