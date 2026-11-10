# 🗺️ Moodmap NRW

[![CI](https://github.com/AzubiWars/moodmap/actions/workflows/ci.yml/badge.svg)](https://github.com/AzubiWars/moodmap/actions/workflows/ci.yml)

> **Wie geht's NRWs Schulen?** – Die Stimmung an Schulen in Nordrhein-Westfalen, anonym erfasst, live auf der Karte.

Moodmap ist eine moderne, mobile-first Umfrage-App (Web-App + PWA). Schülerinnen und Schüler – später auch Lehrkräfte – geben in **60 Sekunden** ihre aktuelle Stimmung zu Themen wie Lernstoff, Stress, KI-Nutzung, digitale Ausstattung oder Schulgebäude ab.
Die Antworten werden anonym zusammengefasst und als **farbige Stimmungskarte („Moodmap") von NRW** dargestellt: vom Land über Regierungsbezirke, Kreise und Gemeinden bis hinunter zur einzelnen Schule – gesamt oder gefiltert nach Thema.

**Ziel:** Das Ministerium für Schule und Bildung NRW und die Schulpolitik bekommen ein aktuelles, datenbasiertes Lagebild und können gezielter handeln.

**Prävention durch Dialog:** Moodmap hört nicht nur zu, sondern ist ein Rückkanal. Ein **Frühwarn-Radar** zeigt, wo Frust und das Gefühl, nicht gehört zu werden, wachsen. Mit **„Politik antwortet"** reagiert die Politik sichtbar und direkt auf dem Handy der Schüler:innen. Politik und Schüler:innen arbeiten zusammen, damit Spannungen gar nicht erst eskalieren wie zuletzt in Frankreich.

---

## Status

🚧 **Hackathon-Prototyp** – in aktiver Entwicklung durch ein Team aus KI-Agenten + Menschen.

Der Datenmodus ist **explizit** und hat keinen stillen Fallback (ADR-017):

- `VITE_DATA_MODE=supabase` ist der Produktionsmodus und liest echte Schulstammdaten sowie echte Antworten.
- `VITE_DATA_MODE=mock` ist ausschließlich der lokale Demo-/Testmodus mit synthetischen Daten.
- Fehlt die Supabase-Konfiguration im Live-Modus, zeigt die App einen verständlichen Fehler statt Demo-Daten.

Methodik und Quellen: [`docs/METHODIK.md`](docs/METHODIK.md) bzw. `/methodik`.

## Live-Demo

**https://moodmap-cyan.vercel.app** – Production-Deploy von `main`.

Zum Testen auf Handy und Desktop: `/`, `/map`, `/massnahmen`, `/dashboard`, `/dashboard/school`, `/methodik`, `/quellen`, `/privacy`, `/s/DEMO42`. Die Demo-Routen `/demo`, `/demo/live` und `/demo/components` stehen nur im Mock-Modus zur Verfügung.

Feedback bitte als Issue mit Label `type:feedback` oder für Menschen in [`coordination/FEEDBACK.md`](coordination/FEEDBACK.md).

## Für KI-Agenten

➡️ **Start hier: [`AGENTS.md`](AGENTS.md)**

## Dokumentation

| Dokument                                                       | Inhalt                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`AGENTS.md`](AGENTS.md)                                       | Team-Regeln, Rollen, Workflow für KI-Agenten                        |
| [`docs/VISION.md`](docs/VISION.md)                             | Problem, Vision, Zielgruppen, Mehrwert                              |
| [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md)                 | Features, Screens, User Stories, Akzeptanzkriterien                 |
| [`docs/SURVEY_TOPICS.md`](docs/SURVEY_TOPICS.md)               | Themen- und Fragenkatalog                                           |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)                 | Tech-Stack, Datenmodell, Score-Logik, Ordnerstruktur                |
| [`docs/METHODIK.md`](docs/METHODIK.md)                         | Berechnung, K-Anonymität und Grenzen der Aussagekraft               |
| [`docs/SCIENTIFIC_FOUNDATION.md`](docs/SCIENTIFIC_FOUNDATION.md) | Wissenschaftliches Fundament, statistische Methodik               |
| [`docs/OPEN_DATA.md`](docs/OPEN_DATA.md)                       | Amtliche Daten (Unterrichtsausfall, Sozialindex): Herkunft & Rechenweg |
| [`docs/DESIGN.md`](docs/DESIGN.md)                             | Design-System, Farbskala, UX-Prinzipien                             |
| [`docs/DESIGN_GUIDELINES.md`](docs/DESIGN_GUIDELINES.md)       | Konkrete UI-Regeln und Komponenten-Hinweise                         |
| [`docs/ACTION_CATALOG.md`](docs/ACTION_CATALOG.md)             | Maßnahmenkatalog mit Studienbelegen                                 |
| [`docs/PRIVACY.md`](docs/PRIVACY.md)                           | Datenschutz- & Anonymitätskonzept                                   |
| [`docs/IMPORT.md`](docs/IMPORT.md)                             | Import echter Umfragedaten (CSV/XLSX, Dry-Run, Rollback)            |
| [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md)             | Lokale und gehostete Supabase-Instanz einrichten                    |
| [`docs/SSO_PLAN.md`](docs/SSO_PLAN.md)                         | Vorschlag für Schüler-SSO, Schulzuordnung und Teilnahmeberechtigung |
| [`docs/PERF_SCHOOL_DATA.md`](docs/PERF_SCHOOL_DATA.md)         | Überlegungen zur Größe des Schulverzeichnisses                      |
| [`docs/ROADMAP.md`](docs/ROADMAP.md)                           | Meilensteine & Start-Backlog                                        |
| [`docs/PITCH.md`](docs/PITCH.md)                               | Pitch-Story, Demo-Skript, Q&A                                       |
| [`docs/PITCH_LIVE.md`](docs/PITCH_LIVE.md)                     | Beamer-Ansicht, Pitch-QR und PIN-Reset                              |
| [`docs/PITCH_LOADTEST.md`](docs/PITCH_LOADTEST.md)             | 200-Personen-Pitch-Test, Messwerte und Reset-Prüfung                |
| [`coordination/`](coordination/)                               | Feedback der Menschen, Entscheidungslog, Agenten-Profile            |

## Quickstart

```bash
npm install
cp .env.example .env.local   # optional – ohne Keys läuft der lokale Mock-Modus
npm run dev
```

Im Entwicklungsmodus ist `mock` der Standard, solange `VITE_DATA_MODE` nicht gesetzt ist. Für echte Daten `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` in `.env.local` eintragen und `VITE_DATA_MODE=supabase` setzen; die Einrichtung steht in [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md).

Auf `/map` kannst du über die Themenleiste zwischen Gesamt-Mood und einzelnen Themen wechseln. Ein Link wie `/map?topic=ai` öffnet direkt die KI-Ansicht; Browser-Zurück stellt die vorherige Auswahl wieder her. Die Karte zeigt Aggregate aus der gewählten Datenquelle, im Mock-Modus aus deterministischen Demo-Antworten.

Der gemeinsame Datenlayer ist über `getDataSource()` verfügbar. Im Mock-Modus lädt er synthetische Schulen, erzeugt den Seed einmal im Browser und speichert neue Teilnahmen lokal. `DEMO42` gehört zur synthetischen Schule `900000`. Im Supabase-Modus liefert `public/data/schools.min.json` das Schulverzeichnis, während Werte und Schreibzugriffe ausschließlich über die RPCs aus `supabase/migrations/` laufen. Rohantworten sind für `anon` gesperrt; sichtbar sind nur k-anonymisierte Aggregate.

## Befehle

| Befehl                                      | Zweck                                                        |
| ------------------------------------------- | ------------------------------------------------------------ |
| `npm run dev`                               | Lokaler Entwicklungsserver                                   |
| `npm run build` / `npm run preview`         | Production-Build und lokale Vorschau                         |
| `npm test`                                  | Vitest inkl. PGlite-Tests der Supabase-Migrationen           |
| `npm run e2e`                               | Playwright-Smoke-Test (Mood-Check → Karte)                   |
| `npm run format` / `format:check`           | Prettier schreiben / prüfen                                  |
| `npm run lint` / `npm run typecheck`        | ESLint / TypeScript                                          |
| `npm run data:schools:real`                 | Echtes NRW-Schulverzeichnis importieren                      |
| `npm run data:facts`                        | Amtliche Daten (Ausfall, Sozialindex, Klassengröße) bauen    |
| `npm run data:import`                       | Echte Umfragedaten importieren (Details: `docs/IMPORT.md`)   |
| `npm run db:start` / `db:reset` / `db:stop` | Lokale Supabase-Instanz (braucht Docker)                     |

## Team

- **Menschen:** Produkt-Owner, Feedback, Pitch – siehe `coordination/FEEDBACK.md`
- **KI-Agenten:** siehe `coordination/agents/`
