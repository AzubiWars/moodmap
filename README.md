# 🗺️ Moodmap NRW

[![CI](https://github.com/AzubiWars/moodmap/actions/workflows/ci.yml/badge.svg)](https://github.com/AzubiWars/moodmap/actions/workflows/ci.yml)

> **Wie geht's NRWs Schulen?** – Die Stimmung an Schulen in Nordrhein-Westfalen, anonym erfasst, live auf der Karte.

Moodmap ist eine moderne, mobile-first Umfrage-App (Web-App + PWA). Schülerinnen und Schüler – später auch Lehrkräfte – geben in **60 Sekunden** ihre aktuelle Stimmung zu Themen wie Lernstoff, Stress, KI-Nutzung, digitale Ausstattung oder Schulgebäude ab.
Die Antworten werden anonym zusammengefasst und als **farbige Stimmungskarte („Moodmap") von NRW** dargestellt: vom Land über Regierungsbezirke und Kreise bis hinunter zur einzelnen Schule – gesamt oder gefiltert nach Thema.

**Ziel:** Das Ministerium für Schule und Bildung NRW und die Schulpolitik bekommen ein aktuelles, datenbasiertes Lagebild und können gezielter handeln.

**Prävention durch Dialog:** Moodmap hört nicht nur zu, sondern ist ein Rückkanal. Ein **Frühwarn-Radar** zeigt, wo Frust und das Gefühl, nicht gehört zu werden, wachsen. Mit **„Politik antwortet"** reagiert die Politik sichtbar und direkt auf dem Handy der Schüler:innen. Politik und Schüler:innen arbeiten zusammen, damit Spannungen gar nicht erst eskalieren wie zuletzt in Frankreich.

---

## Status

🚧 **Hackathon-Prototyp** – in aktiver Entwicklung durch ein Team aus KI-Agenten + Menschen.
Die Produktion liest ausschließlich **Live-Antworten** aus Supabase. Synthetische Daten existieren nur im expliziten lokalen Mock-/Testmodus (`VITE_DATA_MODE=mock`) und werden nicht als Produktions-Fallback verwendet. Methodik und Quellen: `docs/METHODIK.md` bzw. `/methodik`.

## Live-Demo

**https://moodmap-cyan.vercel.app** – Production-Deploy von `main`, läuft im Mock-Modus (keine Keys nötig).

Zum Testen auf Handy und Desktop: `/`, `/map`, `/privacy`, `/s/DEMO42`, `/demo`, `/demo/live`.
Feedback bitte als Issue mit Label `type:feedback` oder für Menschen in [`coordination/FEEDBACK.md`](coordination/FEEDBACK.md).

## Für KI-Agenten

➡️ **Start hier: [`AGENTS.md`](AGENTS.md)**

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Team-Regeln, Rollen, Workflow für KI-Agenten |
| [`docs/VISION.md`](docs/VISION.md) | Problem, Vision, Zielgruppen, Mehrwert |
| [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) | Features, Screens, User Stories, Akzeptanzkriterien |
| [`docs/SURVEY_TOPICS.md`](docs/SURVEY_TOPICS.md) | Themen- und Fragenkatalog |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Tech-Stack, Datenmodell, Score-Logik, Ordnerstruktur |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Design-System, Farbskala, UX-Prinzipien |
| [`docs/PRIVACY.md`](docs/PRIVACY.md) | Datenschutz- & Anonymitätskonzept |
| [`docs/PRIVACY.md`](docs/PRIVACY.md) | Datenschutz- & Anonymitätskonzept |
| [`docs/SCIENTIFIC_FOUNDATION.md`](docs/SCIENTIFIC_FOUNDATION.md) | Wissenschaftliches Fundament, statistische Methodik & Algorithmen-Modellierung |
| [`docs/SSO_PLAN.md`](docs/SSO_PLAN.md) | Vorschlag für Schüler-SSO, Schulzuordnung und getrennte Teilnahmeberechtigung (#74) |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Meilensteine & Start-Backlog |
| [`docs/PITCH.md`](docs/PITCH.md) | Pitch-Story, Demo-Skript, Q&A |
| [`docs/PITCH_LOADTEST.md`](docs/PITCH_LOADTEST.md) | 200-Personen-Pitch-Test, Messwerte und Reset-Prüfung (#117) |
| [`docs/PITCH_LIVE.md`](docs/PITCH_LIVE.md) | Beamer-Ansicht, Pitch-QR und PIN-Reset (#116) |
| [`coordination/`](coordination/) | Feedback der Menschen, Entscheidungslog, Agenten-Profile |

## Quickstart (sobald der Code steht)

```bash
npm install
cp .env.example .env.local   # optional – ohne Keys läuft der Mock-Modus
npm run dev
```

Auf `/map` kannst du über die Themenleiste zwischen Gesamt-Mood und einzelnen Themen wechseln. Ein Link wie `/map?topic=ai` öffnet direkt die KI-Ansicht; Browser-Zurück stellt die vorherige Auswahl wieder her. Die Karte zeigt Aggregate aus der gewählten Datenquelle, im Mock-Modus aus deterministischen Demo-Antworten.

Der gemeinsame Datenlayer ist über `getDataSource()` verfügbar. Im Mock-Modus lädt er synthetische Schulen, erzeugt den Seed einmal im Browser und speichert neue Teilnahmen lokal. `DEMO42` gehört zur synthetischen Schule `900000`. Für gemeinsame Daten auf verschiedenen Geräten wählt `VITE_DATA_MODE=supabase` mit URL und öffentlichem Key die Supabase-Datenquelle. Einrichtung und der getrennte synthetische SQL-Import stehen in [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

## Team

- **Menschen:** Produkt-Owner, Feedback, Pitch – siehe `coordination/FEEDBACK.md`
- **KI-Agenten:** siehe `coordination/agents/`
