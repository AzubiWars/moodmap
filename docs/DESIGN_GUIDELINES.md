# Design Guidelines – Moodmap NRW

Verbindliche Grundlage für alle Screens. Wenn eine Regel und ein bestehendes UI kollidieren, gewinnt diese Datei; Ausnahmen werden im PR begründet und hier dokumentiert.

## 1. Gestaltungsprinzip

**Ruhig, verlässlich, datenorientiert.** Moodmap ist kein Spielzeug-Dashboard und keine Behördenmaske. Die Stimmung der Schüler:innen darf warm und emotional sein; Navigation, Filter und Datenflächen bleiben sachlich.

- **Eine klare Hierarchie pro Screen:** Was ist die Hauptaufgabe? Alles andere tritt zurück.
- **Daten zuerst:** Zahlen, Stand, n und Vergleich sind wichtiger als Dekoration.
- **Kontrolle statt Verspieltheit:** Keine Emojis in Navigation, Filtern, Buttons oder Überschriften der App-Chrome. Emojis/Wetter-Icons bleiben der Mood-Skala und inhaltlichen Illustrationen vorbehalten.
- **Konsistenz vor Einzelfall:** Gleiche Abstände, Radien, Höhen und Zustände auf allen Seiten.
- **Zugänglich by default:** Kontrast, Fokus, Touch-Ziele und reduzierte Bewegung sind keine Nacharbeit.

## 2. Design-Tokens

Alle Farben und Schatten kommen aus `src/index.css` (`@theme` / semantische Tokens). Keine festen `slate-*`-Klassen in Komponenten.

| Token | Verwendung |
|---|---|
| `surface` | Seitenhintergrund |
| `surface-tint` | oberer Verlauf |
| `card` | Karten, Header, Popover |
| `subtle` | Hover, inaktive Segmente, Skeletons |
| `border` | Trennlinien und Control-Rahmen |
| `fg` / `muted` | Primär-/Sekundärtext |
| `primary` / `primary-fg` | aktive Auswahl, primäre Aktion |
| `accent` | Links, Fokus, aktive Navigation |
| `mood-1…5`, `mood-none` | ausschließlich Stimmungsdaten |

**Regeln**
- Primärfarbe ist **nicht** flächig für die gesamte Navigation. Aktive Navigation nutzt `subtle` + `fg`; aktive Filter/Buttons nutzen `primary`.
- Fokus ist immer sichtbar: `ring-2 ring-accent` bzw. `outline-2 outline-offset-2 outline-accent`.
- Dark Mode wird über semantische Tokens automatisch mitgedacht, nicht über separate Komponenten.

## 3. Typografie

- Schrift: **Inter Variable** (`--font-sans`).
- Skala: `text-xs` 12 px (Labels/Meta), `text-sm` 14 px (UI/Standard), `text-base` 16 px (Fließtext), `text-lg`/`text-xl` (Screentitel), `text-2xl`+ (Hero/KPI).
- Zeilenhöhe: UI 1.4–1.5, Fließtext 1.6.
- Gewichte: 400 Fließtext, 500/600 UI und Titel, 700 nur Hero/KPI.
- **Keine Großbuchstabenketten** außer kurzen Feld-Labels (`tracking-wide uppercase text-[11px]`).
- Zahlen in Tabellen/KPIs: `tabular-nums`.

## 4. Abstände, Formen, Ebenen

- **8-pt-Raster:** 4, 8, 12, 16, 24, 32, 48 px. Keine beliebigen Zwischenwerte.
- **Radien:** Controls (`Button`, `Chip`, `Input`, `Select`) `rounded-lg` (8 px); Karten/Popover `rounded-2xl` (16 px); Bottom-Sheets oben `rounded-t-3xl`. Keine Pill-Buttons als Standard.
- **Rahmen statt Schatten:** Standard ist `border border-border`; Schatten nur für schwebende Ebenen (Popover, Sheet, Marker-Label).
- **Max-Breite:** Inhalte `max-w-6xl`, Lesetext `max-w-prose`.
- **Karten:** `.card` verwenden; nicht jede Fläche braucht eine Karte.

## 5. Komponenten

### Buttons
| Typ | Aussehen | Einsatz |
|---|---|---|
| Primary | `bg-primary text-primary-fg`, `rounded-lg` | genau eine Hauptaktion pro Bereich |
| Secondary | `bg-card text-fg border border-border` | Alternative, Filter, „Alle Themen“ |
| Ghost | transparent, `hover:bg-subtle` | Toolbars, Icon-Aktionen |
| Danger | `text-mood-1`, nur bei destruktiven Aktionen | Zurückziehen/Löschen |

- Höhe: 40 px Desktop, **mindestens 44 px Touch** (Mobile/primäre Aktionen).
- Icon + Label: Icon 16 px, Abstand 8 px. Icon-only braucht `aria-label` und 44×44 px.
- Hover/Focus/Disabled/Loading sind Pflichtzustände.
- Kein `shadow-sm` auf flachen Toolbar-Buttons; das wirkt unruhig.

### Chips / Themenfilter
- Ein Chip ist **kein Button im Pill-Look**. `rounded-lg`, Border, 40 px hoch, 14 px Text.
- Inhalt: neutraler Punkt (6 px) + Label. Keine Emojis.
- Aktiv: `bg-primary text-primary-fg border-primary`. Inaktiv: `bg-card`, `border-border`, Hover `bg-subtle`.
- Die Leiste ist horizontal scrollbar, aber die primären Aktionen („Alle Themen“, „Filter“) bleiben rechts fixiert.

### Segmented Controls
- Für sich ausschließende Ansichten (Rolle, Kartenmodus): Container `bg-subtle`, Border, `rounded-lg`, Innenabstand 2 px.
- Aktives Segment: `bg-card text-fg shadow-sm ring-1 ring-border/60`; **nicht** schwarz gefüllt.
- Segmente sind gleich hoch (32–36 px) und haben keinen zusätzlichen Pill-Radius.

### Eingaben
- `min-h-11`, `rounded-lg`, `bg-subtle` oder `bg-card`, Border.
- Label immer sichtbar (kein Placeholder als Label).
- Fehler direkt am Feld, `role="alert"`, nicht nur rote Border.

### Karten und Daten
- KPI: Label (`text-xs muted`), Wert (`text-2xl font-bold tabular-nums`), Delta mit Richtung und Text.
- `n` und Datenstand immer sichtbar, wenn eine Zahl gezeigt wird.
- Keine dekorativen Verläufe in Datenkarten; Farbe nur für Bedeutung.

## 6. Layout

- Header: 56 px, sticky, Border unten, aktive Navigation über `bg-subtle` + `fg` (keine schwarzen Pillen).
- Demo-Banner: schmal (ca. 24 px), neutral (`bg-subtle`, `text-muted`), nicht als schwarzer Balken.
- Mobile: Bottom-Navigation, Inhalte mit `pb-20`; Touch-Ziele ≥ 44 px.
- Karten-Overlays: max. 2 schwebende Flächen gleichzeitig; Such-/Infokarte oben links, Legende unten links; auf Mobile nicht über die ganze Breite stapeln.
- Popover/Sheets: Desktop `rounded-2xl` + Schatten, Mobile `rounded-t-3xl`; Escape und Backdrop schließen.

## 7. Lade-, Leer- und Fehlerzustände

- **Globaler Ladebalken:** schmal (2 px) am oberen Rand, erscheint erst nach 120 ms, indeterminate; bei `prefers-reduced-motion` langsamer. Komponente: `LoadingBar`.
- **Lokales Laden:** Skeleton in der Form des späteren Inhalts, nicht zentrierter Spinner.
- **Leer:** kurze Erklärung + nächste sinnvolle Aktion.
- **Fehler:** was passiert ist, was der Nutzer tun kann; keine rohen Fehlercodes.
- Kein Layout-Sprung beim Nachladen.

## 8. Bewegung

- Nur funktionale Bewegung: Karten-Fit, Sheet, Ladebalken.
- Dauer 150–250 ms für UI, 400–800 ms für Kartenkamera.
- `prefers-reduced-motion` respektieren; keine endlosen dekorativen Animationen außer Live-Puls (und der muss abschaltbar sein).

## 9. Barrierefreiheit

- Textkontrast ≥ 4.5:1, große Zahlen ≥ 3:1.
- Farbe nie allein: Score immer mit Wetter/Icon/Zahl.
- Jede interaktive Fläche per Tastatur erreichbar; Fokus nicht entfernen.
- `aria-pressed`/`aria-checked`/`role` korrekt setzen.
- Touch-Ziele ≥ 44×44 px, Abstand ≥ 8 px.
- Statusmeldungen mit `role="status"`/`role="alert"`.

## 10. Sprache

- Schüler:innen: **du**, kurz, konkret, ohne Behördensprache.
- Schule/Ministerium: **Sie**, sachlich, mit Quellen, Stand und Unsicherheit.
- Keine Anglizismen, wenn ein deutsches Wort genauso präzise ist.
- Zahlen mit deutschem Format (`1.654`, `62 %`), Zeiträume als `KW 43`.

## 11. Review-Checkliste

- [ ] Hauptaktion pro Screen eindeutig?
- [ ] Alle Controls nutzen dieselbe Höhe und Radius?
- [ ] Keine Emojis in App-Chrome?
- [ ] Aktive Zustände über `primary`/`subtle`, nicht über beliebige Farben?
- [ ] Fokus sichtbar, Touch-Ziele ≥ 44 px?
- [ ] Loading/Empty/Error vorhanden?
- [ ] Mobile und Dark Mode geprüft?
- [ ] Datenstand und `n` sichtbar?
