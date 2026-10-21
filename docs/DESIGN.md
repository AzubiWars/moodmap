# Design – Moodmap NRW

## 1. Leitidee: Stimmungswetter

Moodmap ist ein **Wetterbericht für die Stimmung an Schulen**. Jede Stimmung hat ein Wetter. Das zieht sich durch Skala, Karte, Icons, Texte und Pitch.

- Schüler-Seite: **verspielt, warm, schnell** – wie eine gute Social-App, nicht wie ein Behördenformular.
- Ministeriums-Seite: **klar, ruhig, datendicht** – wie ein gutes Lagezentrum.
- Gleiche Farbskala und Icons auf beiden Seiten → wiedererkennbar.

## 2. Stimmungs-Skala (zentrale Design-Tokens)

Divergierende Skala, **farbfehlsichtigkeits-freundlich** (Rot–Gelb–Blau statt Rot–Grün). Farbe ist nie allein: immer mit Wetter-Icon und/oder Zahl.

| Score | Stufe | Wetter | Token | Farbe (Vorschlag) |
|---|---|---|---|---|
| 0–19 | sehr schlecht | ⛈️ | `--mood-1` | `#C2263C` |
| 20–39 | schlecht | 🌧️ | `--mood-2` | `#F07B4F` |
| 40–59 | gemischt | ⛅ | `--mood-3` | `#F6D365` |
| 60–79 | gut | 🌤️ | `--mood-4` | `#7FC4DE` |
| 80–100 | sehr gut | ☀️ | `--mood-5` | `#2F7FC1` |
| – | zu wenige Daten | ░ | `--mood-none` | `#B8BCC6` + Schraffur |

- Auf der Karte: **5 diskrete Stufen** (MapLibre `step`-Expression), exakt wie die Legende. Keine Interpolation: Gelb↔Blau gemischt ergibt Grüntöne, die nicht in der Legende stehen.
- Für Trend-Modus eigene Skala: Verschlechterung (Orange/Rot) ↔ unverändert (Grau) ↔ Verbesserung (Blau), mit ▲▼-Pfeilen.
- Die Farben sind ein Startpunkt – der `fe`/`map`-Agent prüft Kontrast (Text auf Farbe) und Lesbarkeit auf der Basiskarte und passt an (Änderung hier dokumentieren).

## 3. Visuelle Sprache

- **Typografie:** Eine moderne, gut lesbare Sans (z. B. *Inter* oder *Plus Jakarta Sans*). Große, kräftige Zahlen für Scores.
- **Formen:** Großzügige Rundungen (`rounded-2xl`), weiche Schatten, Karten-Look.
- **Hintergrund:** Hell mit leichtem Verlauf; **Dark Mode** (P1) – Schüler lieben ihn, Karte wirkt darauf sehr gut.
- **Icons:** Emojis für Themen (schnell, universell) + Lucide-Icons für UI-Bedienelemente.
- **Logo-Idee:** NRW-Umriss als Wetter-Symbol (Sonne/Wolke) oder Kartenpin mit Smiley. Platzhalter reicht für den Start.
- **Claim-Ideen:** „Wie geht's NRWs Schulen?" · „Deine Stimmung. Unsere Karte." · „Das Stimmungswetter für NRWs Schulen."

## 4. Schüler-UX-Prinzipien

1. **60 Sekunden oder weniger.** Fortschrittsbalken zeigt das ehrlich.
2. **Daumenzone:** Alle Antwort-Buttons im unteren Bildschirmdrittel, Touch-Targets ≥ 44 px.
3. **Eine Frage pro Screen**, große Emoji-/Wetter-Buttons, sofortiges Weiter nach Tippen (kein extra „Weiter"-Button).
4. **Swipe-Karten** (P1) für Aussagen: rechts = stimme zu, links = nein, mit Farb-Feedback beim Ziehen.
5. **Belohnung:** Kleine Animation nach jeder Antwort, Konfetti/Sonne am Ende, direkt „Deine Schule vs. NRW".
6. **Vertrauen:** Anonymitäts-Hinweis kurz, freundlich, sichtbar – kein Juristendeutsch.
7. **Respekt bei sensiblen Themen:** Nach schlechter Wohlbefinden-Antwort sanfter Hinweis auf Hilfsangebote, nicht dramatisch.

## 5. Karten-UX

- Startansicht: ganz NRW, Regierungsbezirke eingefärbt, Legende unten links, Themenfilter als **horizontale Chip-Leiste** oben (scrollbar auf Mobile).
- Hover (Desktop) / Tap (Mobile): Tooltip mit Name, Wetter-Icon, Score, n.
- Klick: Zoom auf Einheit + Detail-Panel (Desktop: Sidebar rechts, 380 px; Mobile: Bottom-Sheet mit 3 Höhen: Peek / Half / Full).
- Schulmarker: Kreis, Füllfarbe = Score, Größe ~ √n, dünner weißer Rand; Cluster zeigen Ø-Farbe.
- „Live"-Effekt: Neue Antwort → Marker pulsiert kurz (Ring-Animation). Im Pitch sehr wirkungsvoll.
- Breadcrumb + „Zurück zu NRW"-Button immer sichtbar.
- Kartenhintergrund dezent (heller/dunkler Positron-Stil), damit die Mood-Farben dominieren.

## 6. Dashboard-UX

- Oben KPI-Zeile (4 Kacheln), darunter 2-Spalten-Grid: Themen-Ranking | Mini-Moodmap; darunter Hotspots, Vergleiche, KI-Lagebericht.
- Sie-Form, sachliche Sprache, Quellen-/Datenstand-Hinweis („Datenstand: Welle 2026-W43, n = 48.213").
- Druckansicht des Lageberichts sauber (P2).

## 7. Komponenten-Inventar (geteilte Bausteine)

| Komponente | Zweck |
|---|---|
| `MoodScaleInput` | 5er-Wetter/Emoji-Auswahl |
| `SwipeCard` | Aussage mit Swipe-Geste |
| `WeatherIcon` | Score → Wetter-Icon |
| `MoodBadge` | Score + Icon + Label kompakt |
| `ScoreBar` | Horizontaler Balken mit Vergleichsmarker (z. B. NRW-Ø) |
| `TopicChip` | Thema mit Emoji, auswählbar |
| `MapLegend` | Legende inkl. „zu wenige Daten" |
| `DetailPanel` | Responsive Sidebar/Bottom-Sheet |
| `Sparkline` | Mini-Trend |
| `KpiTile` | Kennzahl + Δ |
| `DemoBanner` | „Prototyp – Demo-Daten" |

Alle in `src/components/`, mit Storybook-ähnlicher Demo-Seite optional unter `/demo/components` (P2).
