# Architektur – Moodmap NRW

> Entscheidungen hier sind in `coordination/DECISIONS.md` begründet. Änderungen am Stack nur über ein `type:decision`-Issue.

## 1. Tech-Stack (Hackathon-optimiert)

| Bereich | Wahl | Warum |
|---|---|---|
| Sprache | **TypeScript** (strict) | Mehrere Agenten → Typen sind unser Vertrag |
| Build/Framework | **Vite 8 + React 19** (SPA) | Schnell, simpel, keine Server-Komplexität, alle Modelle kennen es gut |
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
| Tests | **Vitest** (+ Testing Library), **Playwright** (1–3 Smoke-Tests), **PGlite** für SQL-Tests der Migrationen (#76) | |
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
│   ├── simplify-geo.ts      # npm run geo:build – Grenzen + Gemeinden aus BKG-Daten (mapshaper)
│   ├── generate-schools.ts  # npm run data:schools – synthetische Schulen (Fallback bis #33)
│   ├── lib/                 # reine, getestete Logik der Skripte
│   ├── data/                # Zwischendaten der Skripte (nicht ausgeliefert), z. B. nrw-gemeinden.json
│   └── generate-seed.ts     # synthetische Antworten erzeugen
├── supabase/
│   ├── migrations/          # SQL-Schema, Views, RLS, RPCs (Dateiname = Zeitstempel = Reihenfolge)
│   ├── tests/               # SQL-Tests: Migrationen in PGlite (#76), laufen mit `npm test`
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
    │   ├── index.ts         # Factory getDataSource() / registerDataSource()
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
  deleteOwnResponse(input: { waveId: string; deviceToken: string }): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'error' }>; // #161

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
  n: number;                       // Anzahl unterschiedlicher gewerteter Teilnahmen
  score: number | null;            // 0–100, null wenn n < K_MIN
  delta: number | null;            // Δ zur Vorperiode
  topicScores?: Record<string, number | null>;
}
```

Auswahl per Env: `VITE_DATA_MODE=mock | supabase` (Default: `mock`).

Die aktive Implementierung wird über `getDataSource()` in `src/data/index.ts` gewählt. Implementierungen registrieren sich per `registerDataSource('mock' | 'supabase', source)`; ist der gewünschte Modus nicht registriert, fällt die Factory auf `mock` zurück (ADR-003).

Die Supabase-Implementierung (#23) ist bei gesetzter URL und öffentlichem Key ebenfalls registriert. `VITE_DATA_MODE=supabase` wählt sie; ohne vollständige Konfiguration bleibt der Mock-Fallback. Nach Auswahl einer konfigurierten Live-Quelle werden Netzwerk-/RPC-Fehler nicht durch Mock-Ergebnisse ersetzt. `supabaseSource.ts` verwendet die REST-API ohne zusätzliche SDK-Dependency: paginierte Schulstammdaten ohne `join_code`, Themen und bestehende camelCase-RPCs. `joinCode` ist in der allgemeinen Schulliste leer und wird nur über `get_school_by_code` aufgelöst. Kleine Score-Zellen und Choice-Häufigkeiten werden zusätzlich im Client maskiert.

Die Supabase-Quelle meldet erfolgreiche Abgaben lokal und über BroadcastChannel mit `{ schoolId }`. Sie abonniert keine Rohantworten. Geräteübergreifende Live-Karten nutzen das vorhandene Aggregat-Polling alle 2,5 s (#24); ein serverseitiger Push-Kanal ist damit nicht eingerichtet. `publishPolicyAnswer` benötigt ein echtes Supabase-Auth-JWT mit passender Rolle, das eine authentifizierte Integration an `createSupabaseSource({ accessToken })` übergeben kann. Der Rollen-Umschalter der Demo verleiht keine Serverrechte.

Der Mock ist standardmäßig registriert (#9). Beim ersten Datenzugriff lädt `mockBootstrap.ts` nur `/data/schools.json` und erzeugt den Seed aus #8 im Browser; `createMockSource()` memoisiert ihn pro Instanz. Rohantworten bleiben innerhalb des Datenlayers. Neue Teilnahmen werden separat unter `moodmap:mock:v1:response:<SHA-256(token, wave)>` gespeichert, ohne Roh-Token und mit auf den Tag gerundetem Datum. Einzelne Storage-Keys verhindern, dass Abgaben anderer Geräte beim Speichern überschrieben werden. Web Locks serialisieren konkurrierende Abgaben desselben Geräts/Welle, sofern unterstützt; ohne Web Locks garantiert der identische Storage-Key einen gespeicherten Datensatz, aber nicht atomar unterschiedliche Rückmeldungen bei zeitgleichen Tabs. Wenn Storage gesperrt/voll ist, arbeitet dieselbe Instanz im Speicher weiter; nach Reload ist dieser Fallback nicht persistent.

Aggregate werden direkt aus Antworten berechnet, nach sämtlichen Filtern und mit unterschiedlichen `responseId` für K_MIN (nie unter 10). Ohne `waveIds` gilt die zeitlich aktive Welle; für mehrere gewählte Wellen vergleicht Delta mit gleich vielen Wellen unmittelbar vor der frühesten Auswahl. Leere Schulform-/Stufenlisten bedeuten keinen entsprechenden Filter; eine explizit leere Wellenliste liefert keine Antworten. `DistributionOption.count` ist `number | null`: `null` wird als „< 3“ dargestellt, genaue kleine Häufigkeiten verlassen den Mock nicht. Themen- und Resonanzwerte bleiben unter K_MIN `null`.

`subscribeToNewResponses()` meldet lokal und über BroadcastChannel ausschließlich `{ schoolId }`, keine Antworten oder Gerätekennungen. Andere Tabs lesen anschließend denselben lokalen Speicher neu. Das funktioniert innerhalb desselben Browserprofils und derselben Origin; für verschiedene Handys bleibt Supabase erforderlich. Der Browser-Mock enthält synthetische Daten und stellt keine echte Authentifizierungsgrenze dar.

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

-- Optionaler Freitext: nur moderierter Text, keine Rohtext-Spalte, keine direkten API-Grants
freetext_entries (response_id uuid pk fk, cleaned text, topics text[], cluster text,
               concern bool default false, created_at date)
freetext_moderation_claims (response_id uuid pk fk /* einmaliger Versuch, ON DELETE CASCADE */)

-- Dialog-Rückkanal „Politik antwortet"
policy_answers (id uuid pk, topic_slug text fk, scope text, region_id text null, title text, body text,
                status text, published_at date, author_role text /* ministerium|bezreg */)
policy_answer_ratings (answer_id uuid fk, device_hash text, value int, created_at date,
                primary key (answer_id, device_hash))
```

**Zugriffsregeln (RLS):**
- `anon` darf **INSERT** auf `responses`/`answers` (über eine RPC-Funktion `submit_response`, die alles validiert) – **kein SELECT** auf Rohdaten.
- Gelesen werden ausschließlich **Aggregations-Views/RPCs**, die die Mindestanzahl erzwingen.

✅ Umgesetzt in `supabase/migrations/20261021091500_schema.sql` (#77):
- `anon`/`authenticated` haben **keinerlei Rechte** auf `responses`, `answers`, `policy_answer_ratings` und `freetext_entries` (kein SELECT/INSERT/UPDATE/DELETE). Schreiben nur über `security definer`-RPCs (#78, #81, #126).
- Lesbar: `regbez`, `kreise`, `topics`, `questions`, `waves`, `policy_answers` und `schools` **ohne** `join_code` (Spalten-Grant). Codes werden nur über `get_school_by_code` aufgelöst (#78).
- RLS ist auf jeder Tabelle aktiv. Weil Supabase neuen Objekten standardmäßig alle Rechte gibt, entzieht die Migration sie und setzt die Default-Privileges so, dass **spätere Tabellen und Funktionen nicht automatisch erreichbar sind**. Jede neue RPC braucht ein explizites `grant execute … to anon`.
- Typ-spezifische Wertebereiche der Antworten (mood5 1–5, swipe 0/1, gültige `choice`-Optionen) prüft zusätzlich ein Trigger.
- SQL-Tests (`supabase/tests/`) laufen mit `npm test` gegen PGlite und prüfen Rechte, RLS, Constraints und die Gleichheit der Enums mit `src/types/domain.ts`.

✅ Umfrage-RPCs in `supabase/migrations/20261021094500_survey_rpcs.sql` (#78). Alle sind `security definer` und liefern camelCase-JSON wie `src/types`:
- `submit_response(input jsonb)` → `SubmitResult`. Prüft Schule, **aktuelle** Welle, Rolle, Gerät-Token (16–200 Zeichen), Frage-IDs (keine Duplikate, Zielgruppe passt zur Rolle) und Werte je Fragetyp. Speichert `device_hash = sha256(deviceToken + ':' + waveId)`, nie das Token. Doppelte Teilnahme → `{ ok: false, reason: 'already_submitted' }` (atomar per `on conflict`). Ungültige Eingaben lösen einen Fehler aus und speichern nichts; die Supabase-DataSource (#23) macht daraus `reason: 'error'`.
- `get_school_by_code(code text)` → `School | null`, Groß-/Kleinschreibung und Leerzeichen egal. Einziger Weg zum `joinCode`.
- `delete_own_response(input jsonb)` → `DeleteResult` (#161, `supabase/migrations/20261021161000_delete_own_response.sql`): löscht die Antwort mit `device_hash = sha256(deviceToken + ':' + waveId)` in der **aktuellen** Welle, Antworten per Cascade. `not_found`, wenn es (nicht mehr) eine gibt. Danach ist eine neue Teilnahme möglich. Nur wer das Zufalls-Token des Geräts hat, findet seine Antwort.
- `get_current_wave()` → `Wave | null`: die Welle, die `now()` enthält. Bei Lücken im Wellenkalender die zuletzt begonnene, damit die Live-Demo nie an einer fehlenden Welle scheitert. `submit_response` nutzt dieselbe Definition.

✅ Aggregation in `supabase/migrations/20261021120000_aggregates.sql` (#79):
- `get_aggregates(query jsonb)` → `AggregateRow[]`, rechnet **exakt** wie `src/lib/score.ts` + `src/data/mockAggregates.ts`. Der Paritätstest `supabase/tests/aggregates.test.ts` lässt dieselben Fixtures (`supabase/tests/fixtures.ts`, inkl. n = 9/10 und reinen Choice-Antworten) durch die echte MockDataSource und durch SQL laufen und vergleicht 150 Abfragen Zeile für Zeile.
- K_MIN = 10 serverseitig (`k_min()`); der Client kann nur strenger sein.
- Gleitkomma wie in JavaScript: `double precision` in derselben Reihenfolge, `Math.round(x)` als `floor(x + 0.5)` (Postgres' `round()` rundet −1,5 zu −2 statt −1).
- Interne Bausteine `aggregate_rows(query, waveIds, previousWaveIds)` und `previous_wave_ids(waveIds)` sind nicht öffentlich und werden für `get_trend` (#80) wiederverwendet.
- Die Zeilen-Helfer (`answer_points`, `answer_weight`, `round1`) sind einzeilige SQL-Funktionen **ohne** `set search_path`, damit Postgres sie inline ausführt. Zusammen mit Joins statt korrelierter Subqueries wurde eine Abfrage in PGlite dadurch ~9× schneller (614 → 69 ms bei 15 000 Antworten; natives Postgres ist deutlich schneller).

✅ Trend & Verteilungen in `supabase/migrations/20261021130000_trend_distribution.sql` (#80), paritätsgetestet gegen die MockDataSource (`supabase/tests/trend-distribution.test.ts`):
- `get_trend(query jsonb)` → `TrendPoint[]`: je gewählter Welle (in Kalenderreihenfolge, unbekannte Wellen fallen weg) eine Aggregation ohne Vorperiode. `waveIds` ist Pflicht.
- `get_choice_distribution(question_id text, scope jsonb)` → `Distribution | null` für die **aktuelle** Welle. `null` bei `n < K_MIN` (n = unterschiedliche Teilnahmen) oder wenn die Frage keine `choice`-Frage ist. Optionen mit < 3 Nennungen haben `count: null` (PRIVACY §2). `scope.level = 'nrw'` nur mit `id: null`. Intern: `choice_distribution(question_id, scope, wave_id)`.

✅ Frühwarn-Radar & „Politik antwortet" in `supabase/migrations/20261021140000_tension_policy.sql` (#81), paritätsgetestet gegen die MockDataSource (`supabase/tests/tension-policy.test.ts`):
- `get_tension_index(query jsonb)` → `TensionRow[]` wie `tensionIndex()`:
  - Gewichte in der Reihenfolge von `TENSION_WEIGHTS` summiert (0,15/0,1 sind keine exakten Binärbrüche)
  - +10, wenn `voice` oder `safety` über die 3 Kalenderwellen bis zur letzten gewählten Welle streng fällt
  - `trend` = Index − Index der Vorperiode
- `get_policy_answers(filter jsonb)` → `PolicyAnswer[]`, neueste zuerst. Antworten mit Scope `nrw` passen zu jeder Region.
  - `resonance` aus den Bewertungen, erst ab K_MIN.
  - `topicDeltaSincePublished` = Themen-Score der Region in allen Wellen ab dem Veröffentlichungstag minus die letzte davor beendete Welle. Der Tag zählt als UTC-Mitternacht wie `Date.parse`.
- `publish_policy_answer(input jsonb)` → `PolicyAnswer`. **Nur für eingeloggte Konten mit `app_metadata.moodmap_role` = `ministerium` | `bezreg`** (setzt nur ein Admin, nie der Nutzer selbst). `authorRole` muss dazu passen. So kann niemand im Namen des Ministeriums antworten. Der Mock hat diese Prüfung nicht.
- `rate_policy_answer(answer_id, value, device_token)` → `{ ok }`: eine Bewertung pro Gerät und Antwort (neue ersetzt alte). Gespeichert wird nur `sha256(token:policy:answerId)`.
- Ebene `nrw` (seit #147 Teil von `AggregateQuery`): genau eine Zeile `{ id: 'nrw' }` über alle Antworten, `parentId` wird ignoriert. Gilt für `get_aggregates`, `get_trend` und `get_tension_index` und wird auch intern für NRW-weite Politik-Antworten genutzt (#158).

**Aggregations-Views (Beispiele):**
- `agg_school_topic_wave(school_id, topic_slug, wave_id, n, score)`
- `agg_kreis_topic_wave(...)`, `agg_regbez_topic_wave(...)`
- RPC `get_aggregates(level, topic, filters…)` → wendet `K_MIN` an.
Für den Hackathon reichen normale Views; bei Performance-Problemen Materialized Views mit Refresh nach Insert (oder alle 30 s).

## 5. Score-Berechnung (`src/lib/score.ts` + SQL identisch!)

1. **Antwort → Punkte:** `mood5`: `(value − 1) × 25` → 0/25/50/75/100. `swipe`: Zustimmung 100, Ablehnung 0. `invert: true` → `100 − punkte`. „Weiß nicht" = nicht gewertet.
2. **Themen-Score einer Einheit** (Schule/Kreis/RegBez) für Thema *t*:
   gewichteter Mittelwert aller gewerteten Antworten zu *t* (Kernfrage Gewicht 1.0, Swipe 0.5).
3. **Gesamt-Mood einer Einheit:** Mittelwert der Themen-Scores der Themen 1–n mit ausreichendem n (gleich gewichtet), **plus** die direkte Frage `overall` als eigenes Thema. → Ein schlecht abgedecktes Thema verzerrt nicht. Der Mittelwert wird in ganzen Zehnteln summiert, also exakt und unabhängig von der Reihenfolge (TS und SQL identisch, #79).
4. **Aggregation nach oben (Schule → Kreis → RegBez → NRW):** Berechnung direkt über alle Antworten der Ebene (nicht Mittelwert der Schul-Mittelwerte), damit große Schulen nicht untergewichtet werden. *(Optional P2: Gewichtung nach Schülerzahl, um Beteiligungsunterschiede auszugleichen.)*
5. **Mindestanzahl:** `K_MIN = 10` unterschiedliche Teilnahmen pro angezeigter Zelle (Einheit × Thema × Filterkombination). `n` zählt nur Teilnahmen mit mindestens einer gültigen, gewerteten Antwort (Gewicht > 0) in dieser Zelle. Mehrere Kern-/Swipe-Fragen derselben Teilnahme erhöhen `n` nicht. TypeScript: `AnswerScoreInput.responseId`; SQL-Views/RPCs (#22): `COUNT(DISTINCT response_id)` nach derselben Filterung. Die Score-Berechnung bleibt der gewichtete Mittelwert aller gewerteten Antworten. Darunter: `score = null` → grau „zu wenige Daten". Siehe `docs/PRIVACY.md`.
6. **Trend (Δ):** Score aktuelle Periode − Score Vorperiode (nur wenn beide ≥ `K_MIN`). **Vorperiode** = gleich viele Wellen unmittelbar vor der ersten gewählten Welle. Ohne `waveIds`: aktuelle Welle vs. Vorwelle (Mock und SQL identisch).
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
| Schulverzeichnis NRW (echte Standorte) | ✅ **INSPIRE Schulstandorte NRW**, OGC API Features (`https://ogc-api.nrw.de/inspire-us-schule/v1/collections/governmentalservice`), Lizenz **dl-de/by-2-0** | `npm run data:schools:real` (`scripts/import-schools.ts`): 5.426 Features, WGS84, Schulform-Mapping, Kreis per Point-in-Polygon, `occupancy` als Schülerzahl, deterministische Join-Codes. → `public/data/schools.real.json` (5.327 Schulen: `id` = Schulnummer, `name`, `schoolForm`, `kreisId`, `city`, `lat`, `lon`, `studentCount`, `joinCode`) + `schools.real.meta.json`. **Demo:** echte Standorte erlaubt, Namen anonymisiert, keine echten Schulnamen mit Demo-Werten (ADR-012/013). `DEMO42` gehört der synthetischen Demo-Schule. |
| Kreise & kreisfreie Städte, Regierungsbezirke (Grenzen) | ✅ **BKG VG250** (Verwaltungsgebiete 1:250 000, Ebenen, Stand 01.01.2026), Lizenz **dl-de/by-2-0** | `npm run geo:build` (`scripts/simplify-geo.ts`): NRW filtern, WGS84, mapshaper `interval=100` m, Koordinaten auf 4 Nachkommastellen; RegBez werden aus den Kreisen gebildet (identische Grenzen). → `public/geo/nrw-kreise.geojson` (53 Features: `id` = AGS, `name`, `regbez_id`, `type` = `kreis`\|`kreisfreie_stadt`, ~290 KB) und `public/geo/nrw-regbez.geojson` (5 Features: `id` = `051`…`059`, `name`, ~105 KB). Für MapLibre-`feature-state`: `promoteId: 'id'`. |
| Deutschland-Grenze (Maske für „nicht Deutschland ausblenden") | **Natural Earth** (Public Domain), via [datasets/geo-countries](https://github.com/datasets/geo-countries) | `public/geo/germany.geojson` (MultiPolygon) + `public/geo/non-germany-mask.geojson` (Weltpolygon mit Deutschland als Loch); MapLibre-Layer `germany-mask-fill` + `germany-outline-line`. |
| Gemeinden mit Einwohnerzahl (nur Skript-Eingabe) | ✅ **BKG VG250-EW** (Stand 31.12.2024), Lizenz **dl-de/by-2-0** | ebenfalls `npm run geo:build`: 396 Gemeinden mit `ags`, `name`, `kreisId`, `population`, `areaKm2` und einem garantiert innenliegenden Punkt → `scripts/data/nrw-gemeinden.json` (~46 KB). Basis für die Verteilung der synthetischen Schulen. |
| Schulsozialindex (optional, P2) | Schulministerium NRW (veröffentlicht pro Schule) | Spannende Korrelation im Dashboard: Stimmung vs. Sozialindex |

**Lizenzangaben** (z. B. „Datenlizenz Deutschland – Namensnennung 2.0") in der App unter „Quellen" anzeigen.
Die Deutschland-Maske nutzt **Natural Earth** (Public Domain); die Attribution nennt sie trotzdem.
Pflicht-Quellenvermerk für die Grenzen (sichtbar an der Karte, z. B. MapLibre-Attribution; „BKG" → https://www.bkg.bund.de, „dl-de/by-2-0" → https://www.govdata.de/dl-de/by-2-0 verlinken):
`© BKG (2026) dl-de/by-2-0, Datenquellen: https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg_nuts.pdf – Geometrien vereinfacht`

**Fallback, falls Open Data nicht rechtzeitig klappt:** ~300 synthetische Schulen mit plausiblen Namen. Die Karte muss zuerst funktionieren, echte Schulen sind ein Upgrade.
✅ Umgesetzt (#33): `public/data/schools.real.json` enthält die echten Schulstandorte aus der INSPIRE-OGC-API (5.327 Schulen). Die synthetische `public/data/schools.json` bleibt vorerst für #8/#9 erhalten; #9/#18 können die echten Daten laden. Nach dem Seed-/Mock-Umbau kann `schools.json` auf die realen Daten umgestellt werden. Attribution in der App: „Schuldaten: MSB NRW, dl-de/by-2-0".

✅ Umgesetzt (#7): `npm run data:schools` erzeugt deterministisch `public/data/schools.json` – ein Array von `School` (`src/types/domain.ts`), eine Schule pro Zeile. Regeln:
- 300 Schulen, jeder Kreis ≥ 2, der Rest nach Einwohnerzahl verteilt; innerhalb des Kreises in echten Gemeinden (gewichtet nach Einwohnern, Berufskollegs bevorzugt in größeren Städten), Koordinate nahe dem Gemeindepunkt und garantiert im eigenen Kreis-Polygon.
- Schulform-Mix bewusst nicht wie in NRW (> 50 % Grundschulen), sondern auf die Zielgruppe ab Klasse 5 ausgerichtet; jeder Kreis hat mindestens ein Gymnasium oder eine Gesamtschule.
- `id` = synthetische Schulnummer `9xxxxx` (kollidiert nicht mit echten Schulnummern), `joinCode` = 6 Zeichen ohne verwechselbare Zeichen (0/O, 1/I/L).
- **Demo-Schule:** `900000` „Gesamtschule Düsseldorf-Mitte", `joinCode` **`DEMO42`**.
- Das echte Schulverzeichnis (#33) soll dasselbe Format nach `public/data/schools.json` schreiben. Im Mock-Modus sind die Join-Codes damit öffentlich lesbar (für die Demo ok). Im Supabase-Modus darf `join_code` nicht per anon-SELECT lesbar sein, nur über `getSchoolByCode` (#22).

## 7. Synthetische Demo-Daten (`scripts/generate-seed.ts`)

Die Demo lebt von glaubwürdigen Mustern. Der Generator soll **deterministisch** (fester Seed) sein und Muster enthalten, die eine Geschichte erzählen:

- Grundrauschen: Scores um 55–65, Normalverteilung pro Schule.
- **Regionale Demo-Kontraste (#120):** feste, gehashte Kreis-/Schulklima-Effekte (±1,05 bzw. ±0,45 auf der 1–5-Zielskala), unabhängig von der Antwort-Zufallsfolge. Sie erzeugen sichtbar unterschiedliche Kreis-/Schulwerte; es sind erfundene Szenarien, keine Aussagen über reale Kreise. Die Story-Kreise Recklinghausen/Duisburg und DEMO42 behalten ihre bisherigen Regeln. Score-Berechnung und K_MIN bleiben unverändert.
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

Die erzeugten Antworten verwenden ausschließlich Frage-IDs und Choice-Optionen aus `src/data/topics.ts`, Swipewerte `0/1` und jede Kernfrage höchstens einmal pro Teilnahme (#128). Regressionen validieren den gesamten Standard-Seed gegen den Katalog und reichen generierte Teilnahmen über das echte `submit_response`-RPC in PGlite ein. Das hält Browser-Demo und späteren Supabase-Import im selben Antwortvertrag. Geänderte Generatorversionen können bei gleichem Seed andere konkrete Stichproben erzeugen; Determinismus gilt innerhalb derselben Version.

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
# OPENROUTER_API_KEY=
# OPENROUTER_MODEL=openai/gpt-4o-mini
# APP_URL=https://moodmap-cyan.vercel.app
```

## 10a. Supabase: lokal & gehostet (#93)

Die Supabase-CLI ist auf **`supabase@2.120.0`** gepinnt und läuft per `npx` (`npm run supabase -- <befehl>`). Sie ist bewusst keine devDependency, weil sie ein großes Binary lädt, das CI und Vercel nicht brauchen.

| Befehl | Wirkung |
|---|---|
| `npm run db:start` | Lokale Instanz starten (braucht **Docker**). Spielt alle Migrationen + `supabase/seed.sql` ein. Studio: http://127.0.0.1:54323 |
| `npm run db:reset` | Lokale DB neu aufsetzen (Migrationen + Seed), z. B. nach neuen Migrationen |
| `npm run db:stop` | Lokale Instanz stoppen |
| `npm run supabase -- status` | Lokale URL + anon key für `.env.local` |
| `npm run db:seed:build` | `supabase/seed.sql` aus den Quellen neu erzeugen (Regierungsbezirke/Kreise aus `public/geo`, Schulen aus `public/data/schools.json`, Themen/Fragen aus `src/data/topics.ts`, Wellen `2026-W34`…`2027-W30`). Ein Test prüft, dass die Datei aktuell ist. |
| `npm run db:seed:answers -- --synthetic-demo` | Explizit synthetische Antwortdaten als `.cache/synthetic-answers.sql` erzeugen; kein Upload, keine Secrets, nicht Teil des automatischen DB-Seeds. Nur für eine getrennte Demo-Datenbank. Anleitung: [SUPABASE_SETUP.md](SUPABASE_SETUP.md). |

**Neue Migration anlegen:** Datei `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql` (Zeitstempel = Reihenfolge). Neue Funktionen sind **nicht** automatisch öffentlich (#77): `grant execute on function … to anon, authenticated` explizit setzen. SQL-Tests in `supabase/tests/` laufen mit `npm test` in PGlite, ohne Docker.

**Gehostetes Projekt:** `moodmap-nrw`, Ref **`woglymwqlremrvkwhban`**, URL `https://woglymwqlremrvkwhban.supabase.co`, Organisation „AzubiWars". Stand: Migrationen #77 + #78 und Seed eingespielt (PostgreSQL 17.11), Zugriffsregeln als `anon` über die REST-API geprüft.
- Region `eu-central-1` (Frankfurt). Das Konto gehört den Menschen.
- Admin-SQL ohne `service_role`-Key: `npm run supabase -- db query --linked "<sql>"` (nach `link`).
- Migrationen spielt nur ein, wer vom Lead/den Menschen dazu bestimmt ist, und nur **gemergte** Migrationen von `main`: `npm run supabase -- link --project-ref <ref>`, dann `npm run supabase -- db push --include-seed`. Das DB-Passwort steht in `SUPABASE_DB_PASSWORD` (nur `.env.local`).
- Keys: URL + anon/publishable Key sind für das Frontend gedacht, werden aber trotzdem **nicht** committet oder in Issues gepostet (AGENTS.md §9). Die Menschen geben sie weiter und setzen sie in Vercel (ADR-004). Den `service_role`-Key bekommen nur Seed-Skripte (#23), nie das Frontend.
- `VITE_DATA_MODE` bleibt in Vercel `mock`, bis die SupabaseDataSource (#23) gemergt ist.

## 11. Geplante Schüler-Anmeldung (Vorschlag, #74)

Die Menschen wünschen eine Anbindung an ein bestehendes Schüler-SSO. [SSO_PLAN.md](SSO_PLAN.md) beschreibt Anschlusswege, Schul-/Rollenprüfung, die Trennung von Identität und Antworten sowie die offenen Anbieter- und Datenschutzfragen. Anbieterwahl und Umsetzung sind noch nicht freigegeben; das bestehende Datenmodell, das `DataSource`-Interface und der Mock-Modus werden durch diesen Plan nicht geändert.

## 12. Freitext-Moderation (nur Live-Test)

Freitext ist optional und wird **vor dem Speichern serverseitig** moderiert (ADR-016, `PRODUCT_SPEC.md` §3.13, `PRIVACY.md` §6a). Umgesetzt in **`submit-freetext` (#126)**: max. **280 Zeichen**, strukturiertes JSON, Timeout **5 s**, Speicherung ohne Rohtext.

1. Client sendet `{ schoolId, waveId, deviceToken, text }` an die Supabase Edge Function `submit-freetext` – **erst nach** der Umfrage-Abgabe (`submit_response`).
2. Die Function prüft über den gehashten Device-Token, ob für Schule + Welle bereits eine Teilnahme existiert. Ohne Teilnahme: `403 no_response`, **kein** LLM-Aufruf. Anschließend reserviert der ausschließlich für `service_role` zugängliche RPC `claim_freetext_moderation` atomar genau einen Versuch pro aktueller Teilnahme (#170). Die private Tabelle enthält nur `response_id`, keinen Text oder Zeitstempel. Parallelität, Ablehnung, Timeout, fehlender Key oder Speicherfehler erlauben keinen weiteren Versuch (`already_submitted`); bei Reservierungsfehlern: `503 unavailable`, kein LLM-Aufruf. Bestehende Freitexte werden durch die Migration als verbraucht übernommen. Reset/Rücknahme löschen die Reservierung per FK-Cascade; eine neue Teilnahme erhält eine neue Berechtigung.
3. Nur der **Text** geht an OpenRouter (`https://openrouter.ai/api/v1/chat/completions`); Schule, Welle und Device-Token bleiben in Supabase.
4. OpenRouter liefert strukturiertes JSON:
   - `allowed`: bool
   - `reason`: kurzer Grund (z. B. Beleidigung, Spam)
   - `cleaned`: bereinigter Text (Schimpfwörter/Jugendsprache neutralisiert, Namen/persönliche Angaben entfernt)
   - `topics`: max. 3 Slugs aus `SURVEY_TOPICS.md`
   - `cluster`: kurzes Cluster-Label
   - `concern`: Krisen-/Gefährdungshinweis
5. Die Function ruft `record_freetext` (service role) auf. Gespeichert werden nur `cleaned`, `topics`, `cluster`, `concern` sowie – über `response_id` – Schule, Welle und Tag in `freetext_entries`. Abgelehnte Texte werden **gar nicht** gespeichert. Der Rohtext wird **nie** gespeichert oder geloggt.
6. **Robustheit:** Timeout 5 s. Fällt OpenRouter aus oder fehlt der Key, wird **nur der Freitext verworfen** (`stored:false`); die Umfrage bleibt gespeichert. Im Mock-Modus gibt es einen lokalen Fallback (Wortliste + Themen-Keywords) in der Survey-UI.
7. Bei `concern:true` zeigt der Client sofort Hilfsangebote (`PRIVACY.md` §5), keine Weiterleitung. Solche Einträge werden von `get_freetext_clusters` nicht öffentlich ausgewertet.
8. Die öffentliche Auswertung läuft über `get_freetext_clusters(scope)` (nur aktuelle Welle, nur `concern = false`, Cluster erst ab `K_MIN`, max. 3 bereinigte Beispiele). Testschulen sind aus regionalen Auswertungen ausgeschlossen; der Pitch liest sie ausschließlich über den expliziten Scope `{ level: 'school', id: 'pitch-test' }`.
9. Der Client ruft `submit-freetext` **nach** erfolgreicher Umfrage-Abgabe nur bei `VITE_DATA_MODE=supabase` und gesetztem `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` auf. Im Mock-Modus greift der lokale Demo-Fallback mit Wortliste + Themen-Keywords, auch wenn Supabase-Env gesetzt ist.

**Secret setzen (niemals committen):**

```bash
supabase secrets set OPENROUTER_API_KEY=<key>
# optional:
supabase secrets set OPENROUTER_MODEL=openai/gpt-4o-mini
supabase functions deploy submit-freetext
```

Lokal: `supabase functions serve submit-freetext --env-file .env.local` (Key in `.env.local`, ist gitignored).

**Client-Aufruf (später, wenn das Freitextfeld kommt):**

```ts
const { data, error } = await supabase.functions.invoke('submit-freetext', {
  body: { schoolId, waveId, deviceToken, text },
});
if (error || !data?.ok || !data.stored) {
  // nur den Freitext verwerfen, die Umfrage trotzdem speichern
} else {
  // data.concern === true → sofort Hilfsangebote anzeigen
  // data.cluster/data.topics → „Danke, dein Hinweis wurde dem Thema X zugeordnet“
}
```

Der Key darf **niemals** als `VITE_*`-Variable oder in `public/` landen – sonst ist er im Browser sichtbar.

## 13. Getrennter Pitch-Teststandort (#113)

Die Migration `20261021160000_pitch_site.sql` ergänzt `is_test` für Schulen und Regionen. Der konfigurierbare Standort `pitch-test` (Join-Code `PITCH`) bleibt aus normalen Stammdatenlisten, NRW-Aggregaten, Trends, Verteilungen, Radar und regionalen Freitext-Clustern ausgeschlossen. Der synthetische Berlin-Default ist kein bestätigter Veranstaltungsort; die echten Angaben kommen aus #118.

`get_pitch_aggregate()` liefert den getrennten Teilnahmezähler und Scores mit `K_MIN`. Der Test nutzt serverseitig `sha256(token:wave:pitch)`; normale Abgaben behalten `sha256(token:wave)`. Die Freitextprüfung unterstützt beide Hashes, stets an Schule und Welle gebunden. Der Client verwendet für Testschulen keine dauerhafte lokale Wochensperre; die Datenbank verhindert doppelte Abgaben bis zum Reset.

Die Edge Function `pitch-reset` prüft das Secret `PITCH_RESET_PIN` und ruft den ausschließlich für `service_role` zugänglichen RPC `reset_pitch_test()` auf. Dieser löscht nur Antworten der markierten Schule `pitch-test`; Antwortwerte, Hashes und moderierte Freitexte werden mitgelöscht. Normale NRW-Abgaben bleiben erhalten. Konfiguration, API und Deployment stehen in [pitch-reset/README.md](../supabase/functions/pitch-reset/README.md).
