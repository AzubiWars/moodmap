# Vorschlag: Datenmenge beim Laden der Schulen reduzieren

> Autor: `claude-jonat-pc` (fe) · Stand: 2026-10-21, Basis `main` @ 4e61e42
> Triage: 2026-10-22 → aufgeteilt in Issues; siehe unten.
> Status: **Teilweise umgesetzt.** A ✅ (#219), B teilweise (statische Datei existiert, Supabase-Fallback offen), C teilweise (Directory ist lazy, Stammdaten noch nicht), D/E offen.

## Problem

Im Supabase-Modus lädt die App die Daten aller ~5.300 NRW-Schulen. Die Karte wird dadurch langsam und verbraucht viel mobiles Datenvolumen. Gefundene Ursachen:

1. **Stammdaten: sequentiell und ohne Cache.**
   `src/data/supabaseSource.ts` `getSchools()` holt 5.327 Schulen in 11 Seiten à 500 Zeilen, **nacheinander**, mit `cache: 'no-store'`. Jeder Kartenaufruf lädt alles neu (~1 MB JSON, 11 Roundtrips).
   `src/features/map/MapPage.tsx:208` (`schoolsQuery`) lädt sofort, auch in der NRW-Startansicht, die keine Schulpunkte zeigt.
2. **Schul-Aggregate ohne Filter = eine Zeile pro Schule.**
   `aggregate_rows` (`supabase/migrations/20261021150000_public_nrw_level.sql`, CTE `periods`) bildet Zeilen aus *allen* `selected_schools`. Jede Schule mit n = 0 kommt also mit `topicScores` zurück.
   - `src/features/dashboard/loadLagebild.ts:26` lädt `level: 'school'` für ganz NRW, nur um `n > 0` zu **zählen**.
   - `src/features/map/MapPage.tsx:261` im Live-Modus: `useAggregates('school', 'all')` ohne `parentId` → **alle 2,5 s** (`LIVE_POLL_MS`) ~5.300 Zeilen.
3. `useLiveAggregates` invalidiert bei jeder neuen Antwort alle `['aggregates']`-Queries, also auch die großen (nur aktive werden neu geladen, das ist ok).

**Ziel:** Der Erstaufruf der Karte lädt nur Geo-Daten und Regions-Aggregate. Schulen werden erst bei Bedarf geladen, dann kompakt und gecacht. Ein Live-Poll überträgt nur Schulen mit Stimmen.

## Maßnahmen (sortiert nach Wirkung/Aufwand)

### A. Server: nur Schulen mit Antworten zurückgeben — größter Hebel, klein ✅ erledigt (#219)
Umgesetzt in Migration `20261021200000_aggregate_school_rows_distribution.sql` und `mockAggregates.ts` (`query.level === 'school' ? resultRows.filter((row) => row.n > 0)`).


Neue Migration, die `aggregate_rows` ändert: Für `v_level = 'school'` werden Gruppen mit `n = 0` in beiden Perioden weggelassen (`where cur.n > 0 or prev.n > 0`).
Die UI verträgt fehlende Zeilen schon: `toScoreMap` behandelt eine fehlende Schule als „zu wenige Daten", `schoolsToGeoJSON` nutzt `s?.n ?? 0`.
`src/data/mockAggregates.ts` wird gleich angepasst, damit Mock und Supabase sich gleich verhalten. Das Verhalten in der Interface-Doku `src/data/api.ts` festhalten.
→ Live-Polling und Lagebild schrumpfen von ~5.300 Zeilen auf „Schulen mit Teilnahme" (Demo: einige Dutzend).

### B. Stammdaten als statische, gecachte Datei statt REST-Paging — teilweise umgesetzt
Stand 2026-10-22: `public/data/schools.min.json` existiert bereits (473 KB roh, ~110 KB gzip), Spaltenformat mit auf 5 Nachkommastellen gerundeten Koordinaten, erzeugt von `scripts/import-schools.ts`. `src/features/map/schools.ts` (`loadSchoolDirectory`) nutzt sie bereits.
**Offen:** `src/data/supabaseSource.ts` → `getSchools()` lädt weiter sequentiell per REST (11 Roundtrips à 500 Zeilen, `cache: 'no-store'`). Hier muss die statische Datei zuerst versucht und das REST-Paging als parallelisierter Fallback behalten werden. Siehe Issue B1.

Die Schul-Stammdaten ändern sich zur Laufzeit nicht. `getSchools()` (Supabase) lädt deshalb zuerst eine **kompakte statische Datei**:
- `public/data/schools.min.json`, erzeugt von `scripts/import-schools.ts`. Spaltenformat statt Objekten (`{ ids: [], names: [], forms: [], kreis: [], city: [], lat: [], lon: [], students: [] }`), Koordinaten auf 5 Nachkommastellen gerundet, ohne `joinCode` (kommt nur per `get_school_by_code`). Erwartung: ~1,1 MB → ~350 KB roh, ~80–100 KB komprimiert (Vercel liefert gzip/brotli).
- Der Service Worker (#28) cacht `/data/` schon per StaleWhileRevalidate. Ab dem zweiten Besuch kommt die Datei sofort bzw. offline aus dem Cache.
- **Fallback** auf REST nur, wenn die Datei fehlt. Dann die erste Seite laden, `content-range` lesen, die restlichen Offsets **parallel** (`Promise.all`) holen und `limit` auf 1000 erhöhen.
- Test-/Pitch-Schulen (`is_test`, z. B. `pitch-test`) stehen nur in der DB. Sie werden per kleinem Zusatz-Call nachgeladen, damit der Pitch weiter funktioniert.

### C. Karte: Schulen erst laden, wenn sie gebraucht werden — teilweise umgesetzt
Stand 2026-10-22: `directoryQuery` (das 1,1-MB-Verzeichnis) ist bereits lazy (`MapPage.tsx:221`, `enabled: directoryRequested || drill.level !== 'nrw' || Boolean(city)`).
**Offen:** `schoolsQuery` (`loadSchools`/`DataSource.getSchools`, `MapPage.tsx:208`) wird unbedingt geladen – auch in der NRW-Startansicht ohne Schulpunkte. `enabled` ergänzen: Drill ≠ `nrw`, Stadt gewählt, Live-Modus, Modus „Beteiligung", Suche geöffnet. Siehe Issue C.

### D. Live-Modus
Profitiert automatisch von A. Prüfen, dass das Polling im Hintergrund-Tab pausiert (TanStack-Default `refetchIntervalInBackground: false`).

### E. Dashboard-Lagebild
`loadLagebild.ts:26` zählt nur aktive Schulen. Mit A reicht das. Optional später eine RPC `count_active_schools`, die nur eine Zahl liefert.

## Vorschlag Zuständigkeit (Entscheidung beim Lead)

| Teil | Bereich | Vorschlag |
|---|---|---|
| A (Migration + Mock) | data / Supabase | `claude-borys-mukovnin` |
| B (statische Datei + Fallback) | data | `claude-borys-mukovnin` oder `codex-yanic-mac` |
| C, D | map | `codex-yanic-mac` / `claude-henrik-nixos` |
| E | dashboard | wer A macht |

`claude-jonat-pc` (fe) kann jeden Teil übernehmen, wenn er zugeteilt wird.

## Betroffene Dateien
- `src/data/supabaseSource.ts` (`getSchools`)
- `src/data/mockAggregates.ts`, `src/data/api.ts`
- neue Migration `supabase/migrations/…_school_aggregates_sparse.sql` (`aggregate_rows`)
- `scripts/import-schools.ts` + `public/data/schools.min.json`, ggf. `vite.config.ts` (Workbox-Pattern)
- `src/features/map/MapPage.tsx`
- `src/features/dashboard/loadLagebild.ts`

## Verifikation
- Unit: `src/data/supabaseSource.test.ts` (statische Datei wird bevorzugt, paralleles Paging im Fallback), `src/data/mockAggregates.test.ts` (keine Schulzeilen mit n = 0), `supabase/tests/aggregates.test.ts` (Schulebene ohne Leerzeilen).
- `npm run lint && npm run typecheck && npm test && npm run build`.
- Manuell: DevTools › Network auf `/map` mit Supabase-Env. Übertragene KB und Request-Anzahl vorher/nachher messen: Erstaufruf, Drill in einen Kreis, Live-Modus über 30 s. Im PR dokumentieren.
  Ziel: Erstaufruf < 150 KB Daten, Live-Poll < 10 KB pro Tick.
