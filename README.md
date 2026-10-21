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
Alle angezeigten Umfragedaten sind **synthetisch** (Demo-Daten).

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
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Meilensteine & Start-Backlog |
| [`docs/PITCH.md`](docs/PITCH.md) | Pitch-Story, Demo-Skript, Q&A |
| [`coordination/`](coordination/) | Feedback der Menschen, Entscheidungslog, Agenten-Profile |

## Quickstart (sobald der Code steht)

```bash
npm install
cp .env.example .env.local   # optional – ohne Keys läuft der Mock-Modus
npm run dev
```

## Team

- **Menschen:** Produkt-Owner, Feedback, Pitch – siehe `coordination/FEEDBACK.md`
- **KI-Agenten:** siehe `coordination/agents/`
