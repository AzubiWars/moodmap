# Architektur – Moodmap NRW

> Entscheidungen hier sind in `coordination/DECISIONS.md` begründet. Änderungen am Stack nur über ein `type:decision`-Issue.

## 1. Tech-Stack (Hackathon-optimiert)

| Bereich | Wahl | Warum |
|---|---|---|
| Sprache | **TypeScript** (strict) | Mehrere Agenten → Typen sind unser Vertrag |
| Build/Framework | **Vite + React 18** (SPA) | Schnell, simpel, keine Server-Komplexität, alle Modelle kennen es gut |
| Routing | **React Router** | Standard |
| Styling | **Tailwind CSS** + **shadcn/ui** (Radix) | Schnelles, konsistentes UI, gute A11y |
| Animation | **Framer Motion** | Swipe-Karten, Übergänge |
| Karte | **MapLibre GL JS** via `react-map-gl/maplibre` | Performant mit GeoJSON-Choroplethen + vielen Punkten, Open Source, kein API-Key nötig |
| Basiskarte | **OpenFreeMap** (keyless) – Fallback: nur GeoJSON-Flächen auf neutralem Hintergrund | Demo darf nicht an einem Tile-Server scheitern |
| Charts | **Recharts** | Einfach, React-nativ |
| State | **Zustand** (UI-/Filter-State) + **TanStack Query** (Daten) | Leichtgewichtig |
| PWA | **vite-plugin-pwa** (Workbox) | Manifest + Service Worker mit wenig Aufwand |
| Backend | **Supabase** (Postgres + Realtime + Row Level Security + Edge Functions) | DB, API, Live-Updates ohne eigenen Server |
| Mock-Backend | Lokaler In-Memory-/localStorage-Store mit gleichem Interface | Demo-Versicherung |
| KI-Lagebericht | Supabase Edge Function → LLM-API (z. B. Claude) mit **nur aggregierten Daten**; im Mock-Modus statischer Bericht | Wow-Feature, sicher vorführbar |
| Tests | **Vitest** (+ Testing Library), **Playwright** (1–3 Smoke-Tests) | |
| Lint/Format | ESLint + Prettier | |
| Hosting | **Vercel** (festgelegt, mit GitHub-Repo verbunden): `main` → Production, jeder PR → Preview-URL | Menschen können jeden PR auf dem Handy testen |
| CI | GitHub Actions: lint, typecheck, test, build | `main` bleibt grün |
| Paketmanager | **npm** | Auf allen Geräten vorhanden |

## 2. Ordnerstruktur

```
moodmap/
├── AGENTS.md, CLAUDE.md, README.md
├── docs/                    # Spezifikation
├── coordination/            # Agenten-Kommunikation
├── .github/                 # Issue-/PR-Templates, CI-Workflows
├── public/
│   ├── geo/                 # nrw-regbez.geojson, nrw-kreise.geojson (vereinfacht)
│   ├── icons/               # PWA-Icons
│   └── data/                # schools.json (aus Open Data aufbereitet)
├── scripts/
│   ├── import-schools.ts    # Schulverzeichnis NRW → public/data/schools.json
│   ├── simplify-geo.ts      # GeoJSON vereinfachen (mapshaper)
│   └── generate-seed.ts     # synthetische Antworten erzeugen
├── supabase/
│   ├── migrations/          # SQL-Schema, Views, RLS
│   └── functions/
│       └── situation-report/ # KI-Lagebericht
└── src/
    ├── app/                 # App-Shell, Router, Provider, Layout
    ├── features/
    │   ├── survey/          # Onboarding, Mood-Check, Danke-Screen
    │   ├── map/             # Moodmap, Layer, Legende, Detail-Panel
    │   ├── dashboard/       # Ministeriums-Dashboard, KI-Lagebericht
    │   ├── school/          # Schul-Dashboard (P2)
    │   └── demo/            # Demo-Steuerung
    ├── components/ui/       # shadcn-Komponenten
    ├── components/          # geteilte Komponenten (MoodBadge, WeatherIcon, …)
    ├── data/
    │   ├── topics.ts        # Themen & Fragen (siehe docs/SURVEY_TOPICS.md)
    │   ├── api.ts           # DataSource-Interface
    │   ├── supabaseSource.ts
    │   └── mockSource.ts
    ├── lib/
    │   ├── score.ts         # Score-Berechnung & Mindestanzahl-Logik
    │   ├── colors.ts        # Score → Farbe/Wetter
    │   └── device.ts        # anonymes Geräte-Token
    ├── store/               # Zustand-Stores (Filter, Rolle)
    └── types/               # geteilte Typen
```

**Regel:** Features importieren nicht quer voneinander (`features/map` importiert nichts aus `features/survey`). Geteiltes gehört nach `components/`, `lib/`, `data/`, `types/`.

## 3. Daten-Abstraktion (wichtigster Vertrag!)

Alle UI-Teile sprechen **nur** mit diesem Interface. So funktionieren Mock und Supabase austauschbar, und Agenten können parallel an UI und Backend arbeiten.

```ts
// src/data/api.ts
export interface DataSource {
  // Stammdaten
  getSchools(): Promise<School[]>;
  getSchoolByCode(code: string): Promise<School | null>;
  getTopics(): Promise<Topic[]>;

  // Umfrage
  getCurrentWave(): Promise<Wave>;
  submitResponse(input: ResponseInput): Promise<{ ok: true } | { ok: false; reason: 'already_submitted' | 'error' }>;

  // Aggregate (immer bereits k-anonymisiert!)
  getAggregates(query: AggregateQuery): Promise<AggregateRow[]>;
  getTrend(query: TrendQuery): Promise<TrendPoint[]>;
  getChoiceDistribution(questionId: string, scope: Scope): Promise<Distribution | null>;

  // Frühwarn-Radar
  getTensionIndex(query: AggregateQuery): Promise<TensionRow[]>;

  // „Politik antwortet"
  getPolicyAnswers(filter: { regionIds?: string[]; topics?: string[] }): Promise<PolicyAnswer[]>;
  publishPolicyAnswer(input: PolicyAnswerInput): Promise<PolicyAnswer>;
  ratePolicyAnswer(answerId: string, value: 1 | 2 | 3 | 4 | 5): Promise<{ ok: boolean }>;

  // Live
  subscribeToNewResponses(cb: (e: { schoolId: string }) => void): () => void;
}

export interface PolicyAnswer {
  id: string;
  topic: string;                   // Topic-Slug
  scope: 'nrw' | 'regbez' | 'kreis';
  regionId: string | null;         // null bei 'nrw'
  title: string;
  body: string;                    // max. ~400 Zeichen
  status: 'listening' | 'reviewing' | 'planned' | 'done';
  publishedAt: string;             // ISO-Datum
  resonance: { n: number; score: number | null };      // Bewertung „Hilft dir das?", K_MIN gilt
  topicDeltaSincePublished: number | null;              // Wirkung
}

export interface TensionRow {
  id: string;                      // Region-/Schul-ID
  index: number | null;            // 0–100, hoch = mehr Spannung; null wenn zu wenige Daten
  level: 'stable' | 'watch' | 'talk' | null;
  trend: number | null;            // Δ Index zur Vorperiode
  drivers: string[];               // Themen-Slugs, die am stärksten beitragen
}

export interface AggregateQuery {
  level: 'regbez' | 'kreis' | 'school';
  topic: string | 'all';           // 'all' = Gesamt-Mood
  schoolForm?: SchoolForm[];
  gradeBand?: GradeBand[];
  role?: 'student' | 'teacher';
  waveIds?: string[];              // Zeitraum
  parentId?: string;               // z. B. nur Schulen eines Kreises
}

export interface AggregateRow {
  id: string;                      // regbez-/kreis-ID oder Schulnummer
  n: number;                       // Anzahl Antworten
  score: number | null;            // 0–100, null wenn n < K_MIN
  delta: number | null;            // Δ zur Vorperiode
  topicScores?: Record<string, number | null>;
}
```

Auswahl per Env: `VITE_DATA_MODE=mock | supabase` (Default: `mock`).

## 4. Datenmodell (Supabase / Postgres)

```sql
-- Stammdaten
regbez        (id text pk, name text)                                   -- 5 Regierungsbezirke
kreise        (id text pk /* AGS */, name text, regbez_id text fk, type text /* kreis|kreisfreie_stadt */)
schools       (id text pk /* Schulnummer */, name text, school_form text, kreis_id text fk,
               city text, lat float8, lon float8, student_count int null,
               join_code text unique /* für QR-Links, nicht erratbar */)

-- Umfrage-Konfiguration
topics        (slug text pk, title text, icon text, audience text[], mandatory bool, sort int)
questions     (id text pk, topic_slug text fk, type text, text text, options jsonb,
               invert bool default false, weight real, audience text)
waves         (id text pk /* z. B. 2026-W43 */, starts_at timestamptz, ends_at timestamptz)

-- Antworten (anonym!)
responses     (id uuid pk, school_id text fk, wave_id text fk, role text, grade_band text null,
               device_hash text /* gehashtes Geräte-Token + wave → nur Doppelteilnahme-Schutz */,
               created_at timestamptz /* auf Tag gerundet */,
               unique (device_hash, wave_id))
answers       (response_id uuid fk, question_id text fk, value int null, choice text[] null,
               primary key (response_id, question_id))

-- Dialog-Rückkanal „Politik antwortet"
policy_answers (id uuid pk, topic_slug text fk, scope text, region_id text null, title text, body text,
                status text, published_at date, author_role text /* ministerium|bezreg */)
policy_answer_ratings (answer_id uuid fk, device_hash text, value int, created_at date,
                primary key (answer_id, device_hash))
```

**Zugriffsregeln (RLS):**
- `anon` darf **INSERT** auf `responses`/`answers` (über eine RPC-Funktion `submit_response`, die alles validiert) – **kein SELECT** auf Rohdaten.
- Gelesen werden ausschließlich **Aggregations-Views/RPCs**, die die Mindestanzahl erzwingen.

**Aggregations-Views (Beispiele):**
- `agg_school_topic_wave(school_id, topic_slug, wave_id, n, score)`
- `agg_kreis_topic_wave(...)`, `agg_regbez_topic_wave(...)`
- RPC `get_aggregates(level, topic, filters…)` → wendet `K_MIN` an.
Für den Hackathon reichen normale Views; bei Performance-Problemen Materialized Views mit Refresh nach Insert (oder alle 30 s).

## 5. Score-Berechnung (`src/lib/score.ts` + SQL identisch!)

1. **Antwort → Punkte:** `mood5`: `(value − 1) × 25` → 0/25/50/75/100. `swipe`: Zustimmung 100, Ablehnung 0. `invert: true` → `100 − punkte`. „Weiß nicht" = nicht gewertet.
2. **Themen-Score einer Einheit** (Schule/Kreis/RegBez) für Thema *t*:
   gewichteter Mittelwert aller gewerteten Antworten zu *t* (Kernfrage Gewicht 1.0, Swipe 0.5).
3. **Gesamt-Mood einer Einheit:** Mittelwert der Themen-Scores der Themen 1–n mit ausreichendem n (gleich gewichtet), **plus** die direkte Frage `overall` als eigenes Thema. → Ein schlecht abgedecktes Thema verzerrt nicht.
4. **Aggregation nach oben (Schule → Kreis → RegBez → NRW):** Berechnung direkt über alle Antworten der Ebene (nicht Mittelwert der Schul-Mittelwerte), damit große Schulen nicht untergewichtet werden. *(Optional P2: Gewichtung nach Schülerzahl, um Beteiligungsunterschiede auszugleichen.)*
5. **Mindestanzahl:** `K_MIN = 10` Antworten pro angezeigter Zelle (Einheit × Thema × Filterkombination). Darunter: `score = null` → grau „zu wenige Daten". Siehe `docs/PRIVACY.md`.
6. **Trend (Δ):** Score aktuelle Periode − Score Vorperiode (nur wenn beide ≥ `K_MIN`).
7. **Hotspot-Regel (Dashboard):** Einheit mit `score < 40` **oder** `delta ≤ −10` und `n ≥ 30`.
8. **Spannungs-Index (Frühwarn-Radar)**, 0–100, hoch = mehr Spannung:
   `index = 100 − gewichteter Mittelwert der Themen-Scores` mit Gewichten
   `voice 0.30 · safety 0.20 · community 0.15 · wellbeing 0.15 · participation 0.10 · teachers 0.10`
   (fehlende Themen → Gewichte der vorhandenen normieren; mindestens `voice` + 2 weitere Themen mit n ≥ K_MIN, sonst `null`).
   Zusätzlich **Trend-Aufschlag**: fällt `voice` oder `safety` in 3 aufeinanderfolgenden Wellen, `+10` (max. 100).
   Stufen: `< 45` → `stable` · `45–59` → `watch` · `≥ 60` → `talk`. `drivers` = die 2 Themen mit dem größten Beitrag.
   Gewichte und Schwellen sind Startwerte – in `src/lib/score.ts` als Konstanten, mit Unit-Tests.
9. **Resonanz einer Politik-Antwort:** Score der Bewertungen „Hilft dir das?" (mood5 → 0–100), ab K_MIN; `topicDeltaSincePublished` = Themen-Score der Region in den Wellen nach `published_at` minus Welle davor.

## 6. Geodaten & Stammdaten

| Daten | Quelle (vor Nutzung prüfen – Issue `fit:research`) | Aufbereitung |
|---|---|---|
| Schulverzeichnis NRW (Schulnummer, Name, Schulform, Adresse, Koordinaten) | Open Data des Schulministeriums NRW („Schuldaten"/Schulverzeichnis, CSV, Koordinaten i. d. R. in UTM32 / EPSG:25832) | `scripts/import-schools.ts`: filtern, nach WGS84 umrechnen (`proj4`), Kreis zuordnen (Point-in-Polygon oder Gemeindeschlüssel), → `public/data/schools.json` |
| Kreise & kreisfreie Städte, Regierungsbezirke (Grenzen) | Open.NRW / GEOportal.NRW (Verwaltungsgrenzen, DVG) oder BKG VG250 (Open Data) | Nach WGS84, mit mapshaper stark vereinfachen, Properties: `id` (AGS), `name`, `regbez_id` |
| Schulsozialindex (optional, P2) | Schulministerium NRW (veröffentlicht pro Schule) | Spannende Korrelation im Dashboard: Stimmung vs. Sozialindex |

**Lizenzangaben** (z. B. „Datenlizenz Deutschland – Namensnennung 2.0") in der App unter „Quellen" anzeigen.

**Fallback, falls Open Data nicht rechtzeitig klappt:** ~300 synthetische Schulen, gleichmäßig über die echten Kreis-Polygone verteilt, mit plausiblen Namen („Gesamtschule Musterstadt-Nord"). Die Karte muss zuerst funktionieren, echte Schulen sind ein Upgrade.

## 7. Synthetische Demo-Daten (`scripts/generate-seed.ts`)

Die Demo lebt von glaubwürdigen Mustern. Der Generator soll **deterministisch** (fester Seed) sein und Muster enthalten, die eine Geschichte erzählen:

- Grundrauschen: Scores um 55–65, Normalverteilung pro Schule.
- **Stress** höher (Score niedriger) an Gymnasien und in der Oberstufe; Peak in Wellen vor Zeugnissen/Abitur.
- **Digitale Ausstattung** schlechter in einigen ländlichen Kreisen, besser in Großstädten mit Förderprogrammen.
- **KI**: überall niedriger Score (Regeln unklar) → landesweites Thema = Aha-Moment im Pitch.
- **Unterrichtsausfall**: einzelne Hotspot-Kreise mit deutlicher Verschlechterung in den letzten 4 Wochen.
- **Gebäude/Toiletten**: breit gestreut, einzelne Schulen sehr schlecht.
- Beteiligung: 5–40 % der Schüler, manche Schulen unter `K_MIN` (damit die graue Darstellung sichtbar ist).
- 8–12 Wellen (Wochen) Historie für Zeitachse und Trends.
- **Frühwarn-Story:** 1–2 Kreise, in denen `voice`, `safety` und `community` über die letzten 4–5 Wellen kontinuierlich sinken → Spannungs-Index steigt auf `talk`. In einem davon existiert eine Politik-Antwort (z. B. „Mehr Schulsozialarbeit + Dialogrunde"), nach der sich die Werte leicht erholen → zeigt Wirkung des Dialogs.
- **`voice` landesweit eher niedrig** (Score ~35–45) → Kernbotschaft: Schüler fühlen sich von der Politik kaum gehört.
- 4–6 Beispiel-Antworten der Politik (`policy_answers`) mit Bewertungen.

Im Mock-Modus wird derselbe Generator im Browser ausgeführt (oder `public/data/seed.json` geladen).

## 8. Live-Demo-Fluss

```
Handy (Jury) ──QR──> /s/DEMO42 ──> Mood-Check ──submit──> Supabase (RPC submit_response)
                                                              │
                                                    Realtime-Event (neue Antwort)
                                                              ▼
Beamer: /map  <── refetch Aggregate ── TanStack Query invalidiert ── Marker der Schule pulsiert
```
Im Mock-Modus: gleiches Verhalten innerhalb **eines** Browsers (BroadcastChannel zwischen Tabs) – reicht als Fallback.

## 9. Deployment (Vercel)

- Das GitHub-Repo ist mit Vercel verbunden (Einrichtung durch die Menschen). **Kein manuelles Deployen durch Agenten nötig.**
- Push/Merge auf `main` → **Production-Deploy**. Jeder PR → automatische **Preview-URL** (erscheint als Kommentar/Check im PR).
- Agenten verlinken die Preview-URL in der PR-Beschreibung, damit Menschen direkt auf dem Handy testen können.
- Framework-Preset: **Vite**, Build: `npm run build`, Output: `dist`.
- SPA-Routing: `vercel.json` mit Rewrite aller Pfade auf `/index.html` (sonst 404 bei `/map`, `/s/:code` usw.):
  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```
- Env-Variablen (`VITE_DATA_MODE`, Supabase-Keys) werden im Vercel-Dashboard gesetzt, nicht im Repo. Solange keine gesetzt sind, läuft Production im Mock-Modus.
- Service Worker/PWA: Nach Deploy prüfen, dass `sw.js` und `manifest.webmanifest` nicht aggressiv gecacht werden (Update-Strategie `autoUpdate` in vite-plugin-pwa).

## 10. Umgebungsvariablen (`.env.example`)

```
VITE_DATA_MODE=mock            # mock | supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_K_MIN=10
# nur serverseitig (Supabase Edge Function Secret), NIE im Frontend:
# LLM_API_KEY=
```
