# Amtliche Daten (#297)

Moodmap zeigt neben der Umfrage zwei amtliche Datensätze des Ministeriums für Schule und Bildung NRW (MSB). Alle Quellen, Lizenzen und Grenzen stehen öffentlich unter **`/quellen`** (`src/data/openData.ts`).

| Datensatz | Ebene | Quelle | Lizenz |
|---|---|---|---|
| Unterrichtsstatistik 2024/25 (ersatzloser Ausfall, nach Plan erteilt) | Schule × Stufe | Bildungsportal „Schule suchen“, PDF „Untstat Auswertung“ je Schule | veröffentlicht vom MSB |
| Schulscharfer Sozialindex 2025/26 | Schule | [Open.NRW](https://ckan.open.nrw.de/dataset/schulsozialindex_1673961584) | dl-de/by-2-0 |

## Aktualisieren

```bash
python3 -I scripts/tools/fetch_untstat.py public/data/schools.real.json scripts/data/untstat-2024-25.jsonl  # ~4–5 h, sequentiell
npm run data:facts   # → public/data/facts.json
```

- Der Abruf ist bewusst langsam (eine Anfrage nach der anderen, Pausen) und fortsetzbar. `robots.txt` erlaubt `/BiPo/SchuleSuchen`.
- Der Sozialindex wird von cp850 nach UTF-8 umkodiert abgelegt (`iconv -f CP850 -t UTF-8`).

## Rechenweg

- Gebietswert Ausfall = Σ ersatzlos ausgefallene Stunden ÷ Σ Soll-Stunden aller Schulen und Stufen im Gebiet. Stundengewichtet, keine Schätzung; Gebiete ohne Schulen mit Statistik bleiben grau.
- Sozialindex = Mittel der Stufen (1–9) aller Schulen im Gebiet; Schulen „ohne“ Stufe zählen nicht.
- Zuordnung Schule → Gemeinde/Kreis/Bezirk über die Schulnummer und das Schulverzeichnis (ADR-021).

## Leitplanken

- **Keine Rangliste.** Schulen erscheinen alphabetisch im Detailbereich, mit Link zum amtlichen Datenblatt.
- **Sozialindex nur als Gebietsmittel.** Er beschreibt die Lage der Schülerschaft und bewertet keine Schule (MSB).
- **Hinweise des MSB sichtbar:** Die Unterrichtsstatistik erfasst keine Kürzungen im Stundenplan und sagt nichts über Unterrichtsqualität.
- Umfragewerte und amtliche Daten werden nie verrechnet, sondern nebeneinander gezeigt.
