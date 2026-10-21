# Produkt-Spezifikation – Moodmap NRW

> Lebendes Dokument. Änderungen per PR, größere Änderungen nur mit Lead-Review.
> Prioritäten: **P0** = ohne das keine Demo · **P1** = macht den Pitch stark · **P2** = nice to have / Ausblick

---

## 1. App-Bereiche im Überblick

```
Moodmap
├── 🎒 Schüler-App (mobile-first, PWA)
│   ├── Onboarding (Schule wählen / Schulcode scannen)
│   ├── Mood-Check (60-Sekunden-Umfrage)
│   ├── Danke + "Deine Schule vs. NRW"
│   └── Öffentliche Moodmap (eingeschränkt)
├── 🗺️ Moodmap (Kern der Demo)
│   ├── NRW-Karte: Regierungsbezirke → Kreise → Schulen
│   ├── Themen-Filter + weitere Filter
│   ├── Detail-Panel (Region/Schule)
│   └── Zeitachse
├── 📊 Ministeriums-Dashboard
│   ├── KPIs, Themen-Ranking, Trends
│   ├── Hotspots & Alerts
│   ├── Frühwarn-Radar (Spannungs-Index)
│   ├── 📣 „Politik antwortet" (Antworten veröffentlichen)
│   └── KI-Lagebericht
├── 🏫 Schul-Dashboard (P1/P2)
└── 👩‍🏫 Lehrkräfte-Modus (P2, Phase 2)
```

## 2. Rollen im Prototyp

Im Prototyp gibt es **kein echtes Login**. Ein **Rollen-Umschalter** (z. B. im Header oder unter `/demo`) wechselt zwischen:
`Schüler:in` · `Schule` · `Ministerium` (· `Lehrkraft` P2).
Das ist für die Demo transparent und spart Auth-Aufwand. Echte Auth ist Ausblick (siehe `docs/PRIVACY.md`).

---

## 3. Features & User Stories

### 3.1 Onboarding (Schüler) – P0

**Story:** Als Schüler:in will ich in < 15 Sekunden meiner Schule zugeordnet sein, ohne mich zu registrieren.

- Einstieg über **QR-Code / Link mit Schulcode** (`/s/<schulcode>`) → Schule ist vorausgewählt. *(P0 für Demo: Demo-QR-Code zeigt auf eine Demo-Schule)*
- Alternativ: **Schulsuche** (Name/Ort, Autocomplete) – P1
- Abfrage minimaler Kontextdaten (alle optional, grob):
  - Schulstufe: `5–7` · `8–10` · `Oberstufe` · `Berufskolleg`
  - Rolle: `Schüler:in` (Lehrkraft P2)
- Kurzer Hinweis „100 % anonym – wir speichern keine Namen, keine E-Mail, keine IP" mit Link auf Datenschutz-Erklärseite.
- Auswahl wird lokal gespeichert (localStorage) → beim nächsten Mal direkt zum Mood-Check.

**Akzeptanzkriterien**
- [ ] `/s/<schulcode>` öffnet den Mood-Check mit vorausgewählter Schule
- [ ] Keine Pflichtfelder außer Schule
- [ ] Funktioniert auf 375 px Breite ohne horizontales Scrollen

### 3.2 Mood-Check (Umfrage) – P0

**Story:** Als Schüler:in will ich schnell und ohne Nerv sagen, wie es mir in der Schule geht.

- **Format:** Kartenstapel, eine Frage pro Karte, Fortschrittsbalken, ~8–12 Fragen, Ziel < 60 Sekunden.
- **Ablauf:**
  1. **Gesamtstimmung:** „Wie geht's dir gerade mit Schule?" – 5er-Wetter-/Emoji-Skala
  2. **Themenauswahl im Rotationsprinzip:** Pro Durchgang werden 6–8 Themen aus `docs/SURVEY_TOPICS.md` gezeigt (Pflichtthemen + rotierende Themen), je 1 Kernfrage
  3. **Optional:** 1–2 Vertiefungsfragen zum Thema, das am schlechtesten bewertet wurde („Was stresst dich am meisten?" – Multiple Choice)
- **Fragetypen** (siehe `docs/SURVEY_TOPICS.md`):
  - `mood5` – 5er-Skala mit Wetter-Icons/Emojis (Hauptfragetyp)
  - `swipe` – Aussage, links = stimme nicht zu / rechts = stimme zu (Tinder-artig) – P1
  - `choice` – Einfach-/Mehrfachauswahl
  - `freetext` – optional, max. 280 Zeichen, **nur mit KI-Moderation** (siehe §3.13, ADR-016)
- Jede Frage ist überspringbar („Weiß nicht / keine Angabe").
- Haptisches Feedback (Vibration API) und kleine Animationen beim Antworten – P1.
- **Frequenz:** Eine Teilnahme pro Gerät und **Umfragewelle** (Standard: 1 Woche). Danach Hinweis „Danke! Nächster Mood-Check ab Montag".

**Akzeptanzkriterien**
- [ ] Mood-Check mit ≥ 8 Fragen in < 60 s durchklickbar
- [ ] Antworten werden gespeichert (Supabase oder Mock-Store) und erscheinen danach in den Aggregaten
- [ ] Zweite Teilnahme in derselben Welle vom selben Gerät wird verhindert (Hinweis statt Formular)
- [ ] Bedienbar mit Daumen (Touch-Targets ≥ 44 px), Tastatur und Screenreader

### 3.3 Danke-Screen „Give to get" – P1

- Animation „Danke! Deine Stimme ist auf der Karte 🗺️"
- **Deine Schule vs. NRW** für 3 Themen (nur wenn Schule ≥ Mindestanzahl Antworten, sonst „Noch zu wenige Stimmen an deiner Schule – teile den Link!")
- **Teilen-Button** (Web Share API) mit Schul-Link/QR → steigert Beteiligung
- Beteiligungsbalken der Schule: „Schon 87 Stimmen an deiner Schule"
- Optional P2: Streak („3 Wochen in Folge dabei 🔥")

### 3.4 Moodmap – P0 (Herzstück)

**Story:** Als Referent:in im Ministerium will ich auf einen Blick sehen, wo in NRW die Stimmung schlecht ist, und bis auf einzelne Schulen hineinzoomen können.

**Ebenen (Drill-down):**

| Zoom | Ebene | Darstellung |
|---|---|---|
| Landesansicht | 5 Regierungsbezirke (Düsseldorf, Köln, Münster, Detmold, Arnsberg) | Choropleth (Flächen eingefärbt) |
| Mittel | 53 Kreise & kreisfreie Städte | Choropleth |
| Nah | Einzelne Schulen | Farbige Kreis-Marker (Größe ~ Anzahl Antworten), Clustering bei vielen Punkten |
| Sehr nah (ab Zoom 15, max. 18) | Schulgelände & Umgebung | **3D-Gebäude** aus OpenFreeMap (`fill-extrusion`), Karte kippt automatisch auf 45°, Mood-Flächen treten zurück (#85) |

- Klick auf Fläche → zoomt hinein + öffnet **Detail-Panel** (Bottom-Sheet auf Mobile, Sidebar auf Desktop).
- Breadcrumb: `NRW › Reg.-Bez. Köln › Stadt Köln › Schule XY`.
- **Farbe** = Mood-Score (0–100) auf der Stimmungs-Skala (siehe `docs/DESIGN.md`). Flächen/Schulen unter Mindestanzahl → **grau schraffiert** „zu wenige Daten".
- **Legende** mit Wetter-Icons und Skala, immer sichtbar.
- **Fokus auf Deutschland/NRW:** Alles außerhalb Deutschlands wird ausgeblendet (Maske aus Natural Earth, Public Domain), damit der Blick auf NRW bleibt (#98).

**Filter (Filterleiste / Filter-Sheet):**

| Filter | Werte | Prio |
|---|---|---|
| **Thema** | „Gesamt" (Ø aller Themen) oder ein einzelnes Thema | P0 |
| Schulform | Grundschule, Hauptschule, Realschule, Sekundarschule, Gesamtschule, Gymnasium, Förderschule, Berufskolleg | P1 |
| Schulstufe | 5–7, 8–10, Oberstufe, Berufskolleg | P1 |
| Zeitraum / Welle | Aktuelle Woche, letzter Monat, Schuljahr | P1 |
| Rolle | Schüler:innen / Lehrkräfte | P2 |
| Kartenmodus | Stimmung · Trend (Δ zur Vorperiode) · Beteiligung | P1 |

- Filterzustand steckt in der **URL** (teilbare Links, z. B. `/map?topic=ki&form=gym`).

**Detail-Panel (Region oder Schule):**
- Gesamt-Mood (Score + Wetter-Icon + Label)
- Anzahl Antworten, Beteiligungsquote (wenn Schülerzahl bekannt)
- **Themen-Radar oder Balkendiagramm**: alle Themen für diese Einheit vs. NRW-Durchschnitt
- **Top 3 Stärken / Top 3 Baustellen**
- Trend-Sparkline über die letzten Wellen
- Bei Schule: Schulform, Ort, Schulnummer
- Button „Vergleichen" (P2): bis zu 3 Einheiten nebeneinander

**Zeitachse – P1:** Slider unter der Karte, Animation über die Wellen eines Schuljahres („Play"-Button). Im Demo-Datensatz sichtbar: Stress-Peak vor Zeugnissen / Abiturphase.

**Akzeptanzkriterien (P0)**
- [ ] NRW-Karte mit eingefärbten Kreisen lädt in < 3 s (Mock-Modus)
- [ ] Zoom/Klick bis auf Schulebene möglich, Schulen als farbige Marker
- [ ] Themenfilter färbt die Karte um, ohne Reload
- [ ] Detail-Panel zeigt Score, n, Themenübersicht
- [ ] Einheiten unter Mindestanzahl werden nicht eingefärbt
- [ ] Funktioniert auf Handy (Touch-Zoom, Bottom-Sheet) und Desktop

### 3.5 Ministeriums-Dashboard – P1

**Story:** Als Ministerin will ich in 2 Minuten wissen, was die drängendsten Themen sind und wo.

- **KPI-Kacheln:** Gesamt-Mood NRW (+ Δ), Antworten diese Woche, teilnehmende Schulen, Beteiligung
- **🔥 Brennpunkt-Themen NRW:** Top 3–5 Themen nach **Anzahl unzufriedener Stimmen** (😫+😕, absolut), also viele Stimmen *und* schlecht bewertet. Je Thema % unzufrieden, n Stimmen, Trend. Ein Klick öffnet die Karte mit diesem Thema (#25)
- **Themen in Prozent (Gesamtüberblick NRW, Wunsch der Menschen):** Pro Thema ein divergierender Balken über die mood5-Antworten, links % unzufrieden (😫+😕), Mitte % neutral (😐), rechts % zufrieden (🙂+🤩). „Weiß nicht“ wird nicht gezählt, die Prozentzahlen stehen immer als Text daneben. Standardmäßig sortiert nach % unzufrieden. Daten: `AggregateRow.distribution` (Anzahl je Stufe, `null` unter K_MIN), Ebene `nrw` (#25)
- **Themen-Ranking:** Alle Themen sortiert nach Score, mit Trendpfeil
- **Hotspots:** Top 5 Kreise/Schulen mit stärkster Verschlechterung oder niedrigstem Score je Thema („⚠️ Kreis Recklinghausen: Unterrichtsausfall −14 Punkte in 4 Wochen")
- **Vergleiche:** Schulformen, Stadt vs. Land, Regierungsbezirke (Balkendiagramme)
- **KI-Lagebericht** – P1, Wow-Feature:
  - Button „Lagebericht erstellen" → LLM bekommt **nur aggregierte Kennzahlen** (keine Einzelantworten) und schreibt einen 1-seitigen Bericht: Lage, Auffälligkeiten, Handlungsempfehlungen.
  - Im Mock-Modus: vorgefertigter Beispielbericht (damit die Demo nie an einer API hängt).
- **Export** – P2: CSV der Aggregate, PDF/Druckansicht des Lageberichts

### 3.6 Schul-Dashboard – P2

- Eigene Schule: Gesamt-Mood, alle Themen, Trend, Vergleich mit Ø gleicher Schulform
- QR-Code/Plakat generieren zum Aushängen („Wie geht's dir? Scan mich!")
- **„Ihr habt gesagt – wir tun"**: Schulleitung/SV trägt Maßnahmen zu einem Thema ein, die Schüler nach dem Mood-Check sehen → schließt den Feedback-Loop

### 3.7 Lehrkräfte-Modus – P2 (Phase 2, im Pitch als Ausblick)

- Gleicher Mood-Check-Flow mit eigenem Themenset (siehe `docs/SURVEY_TOPICS.md` §4)
- Karte filterbar nach Rolle; spannende Ansicht: **Schüler- vs. Lehrkräfte-Stimmung** an derselben Schule / im selben Kreis

### 3.8 PWA – P0/P1

- **P0:** Web-App-Manifest, Icons, installierbar („Zum Startbildschirm hinzufügen"), App-Shell offline ladbar
- **P1:** Offline-Mood-Check: Antworten werden bei fehlender Verbindung lokal gepuffert und später gesendet
- **P2:** Web-Push-Erinnerung „Neuer Mood-Check ist da" (nur mit Opt-in)

### 3.9 „Politik antwortet" – Dialog-Rückkanal – P1 (Pitch-Säule!)

**Story:** Als Schüler:in will ich sehen, dass die Politik meine Stimme nicht nur sammelt, sondern darauf reagiert.
**Story:** Als Ministerium will ich Schüler:innen direkt und gezielt antworten – landesweit, pro Regierungsbezirk oder pro Kreis, zu einem bestimmten Thema.

- Im Ministeriums-Dashboard (Rolle Ministerium): Formular **„Antwort veröffentlichen"**: Thema, Region (NRW / RegBez / Kreis), Titel, kurzer Text (max. ~400 Zeichen), Status (`Wir hören zu` · `Wir prüfen` · `Maßnahme geplant` · `Umgesetzt`), optional Datum.
- **Schüler-Seite:** Nach dem Mood-Check auf dem Danke-Screen: „📣 Die Politik antwortet dir" mit den 1–3 relevantesten Antworten (passend zu Region und den schlecht bewerteten Themen). Bewertung per `mood5` „Hilft dir das?".
- **Karte:** Regionen mit Antworten bekommen ein kleines 📣-Badge; im Detail-Panel Reiter „Antworten der Politik" mit Status-Timeline.
- **Resonanz-Kennzahl:** Ø-Bewertung der Antwort + Entwicklung des Themen-Scores *seit* der Antwort („Seit der Antwort: Stimmung zu KI +8") → macht Wirkung sichtbar.
- **Dialogtermine (P2):** Antwort kann auf eine Dialogrunde hinweisen („Schüler-Politik-Dialog Reg.-Bez. Köln am 12.11. – SVs anmelden").
- Im Mock-Modus: 4–6 vorbereitete Beispielantworten (u. a. KI-Leitfaden, Sanierungsprogramm Toiletten, mehr Schulsozialarbeit in einem Hotspot-Kreis).

**Akzeptanzkriterien**
- [ ] Ministerium kann eine Antwort anlegen (Mock: localStorage), sie erscheint sofort auf Karte und Danke-Screen
- [ ] Schüler:innen sehen nur für ihre Region/Themen relevante Antworten
- [ ] Bewertung „Hilft dir das?" wird gespeichert und aggregiert (K_MIN gilt)

### 3.10 Frühwarn-Radar – P1 (Pitch-Säule!)

**Story:** Als Ministerium will ich früh erkennen, wo Spannungen an Schulen wachsen, um rechtzeitig mit Unterstützung und Dialog zu reagieren – nicht erst nach einem Vorfall.

- Eigener Kartenmodus „Frühwarn-Radar" + Kachel im Dashboard.
- **Spannungs-Index** pro Region (und für Ministerium pro Schule ab K_MIN) aus den Themen `voice`, `safety`, `community`, `wellbeing`, `participation`, `teachers` – Berechnung siehe `docs/ARCHITECTURE.md` §5.
- Ampel-Stufen: `stabil` · `beobachten` · `Gespräch suchen`. Bewusst **keine Alarm-/Gefahrensprache** („Risiko-Schule" ❌).
- Zu jeder auffälligen Region: **Handlungsvorschläge** statt Schuldzuweisung – z. B. „Dialogrunde mit SVs anbieten", „Schulsozialarbeit/Schulpsychologie stärken", „Antwort zu Thema X veröffentlichen" (Button → 3.9).
- Der KI-Lagebericht (3.5) bekommt einen Abschnitt „Frühwarn-Radar & Dialogempfehlungen".

**Akzeptanzkriterien**
- [ ] Kartenmodus färbt Regionen nach Spannungs-Index, Legende mit 3 Stufen
- [ ] Demo-Daten enthalten 1–2 Regionen mit klar steigendem Index über die letzten Wellen
- [ ] Aus einer auffälligen Region führt ein Klick direkt zu „Antwort veröffentlichen"

### 3.11 Demo-Modus – P0

- `/demo`-Seite (nur für uns/den Pitch): Rollen-Umschalter, „Demo-Daten neu generieren", QR-Code für Live-Teilnahme, Schalter „Live-Modus" (Karte aktualisiert sich bei neuen Antworten – Supabase Realtime oder Polling)
- Banner überall: „Prototyp – Demo-Daten" (dezent)

---

### 3.12 Pitch-Live-Test – P0 (FB-006)

**Story:** Beim Pitch scannen 100–200 Personen einen QR-Code, machen den Mood-Check auf dem eigenen Handy, und die Jury sieht auf dem Beamer live, wie sich der Test-Standort einfärbt.

- **Test-Standort außerhalb NRW:** ein eigener Standort mit Flag `is_test` (Schule + Pseudo-Region), konfigurierbar (Name, Koordinaten, z. B. Ort des Hackathons). Er erscheint **nie** in NRW-Aggregaten, im Dashboard oder im Frühwarn-Radar, sondern nur im Pitch-Modus.
- **QR-Code** auf `/demo` → `/s/<PITCH-Code>` → normaler Mood-Check (inkl. Freitext §3.13).
- **Backend ist Pflicht:** Antworten verschiedener Handys müssen zusammenlaufen, also Supabase (`VITE_DATA_MODE=supabase`, #23). Der Mock-Modus kann das nicht.
- **Beamer-Ansicht** (`/demo/live` oder Kartenmodus „Pitch“): Karte zoomt auf den Test-Standort, zeigt Teilnahmen (Zähler), Gesamt-Mood, Top-Themen und Freitext-Cluster und aktualisiert sich alle 2–3 s (Polling der Aggregate, nur der Beamer pollt).
- **K_MIN gilt auch hier:** Werte erscheinen ab 10 Teilnahmen, vorher „Noch X Stimmen bis zur ersten Auswertung“ als Spannungsmoment.
- **Reset in `/demo`:** „Pitch-Test zurücksetzen“ löscht alle Antworten, Freitexte und Geräte-Sperren **nur des Test-Standorts**. Geschützt über eine Admin-PIN bzw. ein Token (Edge Function mit Secret), damit nicht jede:r im Saal resetten kann. Nach dem Reset kann jedes Gerät wieder teilnehmen.
- **Last:** 200 Abgaben in ~2 Minuten müssen ohne Fehler durchgehen (Lasttest vor dem Pitch).

**Akzeptanzkriterien**
- [ ] QR → Mood-Check → Abgabe landet in Supabase beim Test-Standort
- [ ] Beamer-Ansicht aktualisiert sich ohne Reload (≤ 3 s), Zähler läuft hoch
- [ ] Test-Standort taucht in keiner NRW-Auswertung auf
- [ ] Reset nur mit PIN/Token; danach Zähler 0 und erneute Teilnahme möglich
- [ ] Lasttest: 200 Abgaben, 0 Fehler, Beamer bleibt flüssig

### 3.13 Freitext mit KI-Moderation (OpenRouter) – P0 für den Pitch (FB-006)

**Story:** Schüler:innen können optional in eigenen Worten sagen, was sie bewegt. Die Politik sieht **Themen-Cluster**, keine ungefilterten Einzelstimmen.

- **Eingabe:** eine optionale Frage am Ende des Mood-Checks („Was sollte sich an deiner Schule ändern?“), max. 280 Zeichen, Hinweis „Bitte keine Namen“.
- **Moderation serverseitig** (Supabase Edge Function → **OpenRouter**, API-Key nur als Secret, nie im Frontend). Das LLM liefert strukturiertes JSON:
  - `allowed` (bool) und `reason` (z. B. Beleidigung, Spam, unpassend)
  - `cleaned`: bereinigter Text. **Schimpfwörter und unpassende Jugendsprache werden entfernt bzw. neutral umformuliert**, **Namen, Orte im Nahbereich, Klassen und andere persönliche Angaben werden entfernt**
  - `topics`: Zuordnung zu unseren Themen-Slugs (`docs/SURVEY_TOPICS.md`) + ein kurzes freies Cluster-Label
  - `concern` (bool): Hinweis auf Krise/Gefährdung → der Person werden direkt Hilfsangebote gezeigt (PRIVACY §5), **keine** Weiterleitung, keine Speicherung des Rohtexts
- **Speicherung:** nur `cleaned`, `topics`, `cluster` (plus `concern`) in `freetext_entries`, verknüpft mit Schule, Welle und Tag über die bestehende Teilnahme. Abgelehnte Texte werden gar nicht gespeichert. **Der Rohtext wird nie gespeichert und nicht geloggt.**
- **Anzeige:** Cluster mit Anzahl („📱 Handyregeln · 23 Nennungen“) und 2–3 bereinigte Beispielzitate pro Cluster, erst ab K_MIN Nennungen je Einheit. Abgelehnte Texte erscheinen nirgends.
- **Robustheit:** Fällt OpenRouter aus oder dauert es zu lange (> 5 s), wird die Umfrage trotzdem gespeichert und der Freitext verworfen, mit freundlichem Hinweis. Der Mood-Check darf nie am LLM hängen. Im Mock-Modus gibt es einen einfachen lokalen Fallback (Wortliste + Schlüsselwort-Zuordnung).
- **Kosten/Last:** 200 Texte im Pitch, günstiges, schnelles Modell mit JSON-Ausgabe. Die Modellwahl dokumentiert der umsetzende Agent im PR.

**Akzeptanzkriterien**
- [ ] Testfälle: Beleidigung → abgelehnt; Jugendsprache/Schimpfwort → bereinigt; Name („Herr Müller ist …“) → entfernt; Krisensignal → Hilfsangebot; normaler Text → Cluster + Thema
- [ ] Rohtext taucht weder in DB noch in Logs auf (Test bzw. Review der Function)
- [ ] Timeout/Fehler von OpenRouter blockiert die Abgabe nicht
- [ ] Beamer/Dashboard zeigt Cluster live

## 4. Screens (Mobile-first)

| Route | Screen | Prio |
|---|---|---|
| `/` | Landing: Claim, „Mood-Check starten", „Karte ansehen" | P0 |
| `/s/:schoolCode` | Einstieg via QR mit vorausgewählter Schule | P0 |
| `/check` | Mood-Check (Kartenstapel) | P0 |
| `/check/done` | Danke + Schule vs. NRW | P1 |
| `/map` | Moodmap mit Filtern & Detail-Panel | P0 |
| `/dashboard` | Ministeriums-Dashboard (inkl. Frühwarn-Radar) | P1 |
| `/dashboard/answers` | „Politik antwortet": Antworten verwalten & Resonanz | P1 |
| `/school/:schoolId` | Schul-Dashboard | P2 |
| `/privacy` | Datenschutz in einfacher Sprache | P1 |
| `/demo` | Demo-Steuerung | P0 |
| `/demo/live` | Beamer für den isolierten Pitch-Test: QR, Zähler, Stimmung, Cluster, PIN-Reset | P0 |

## 5. Nicht-funktionale Anforderungen

- **Performance:** Erste Ansicht < 3 s auf Mittelklasse-Handy über 4G. GeoJSON vereinfacht (< 1 MB gesamt).
- **Barrierefreiheit:** WCAG 2.1 AA als Ziel; Farbe nie einziger Informationsträger (immer Icon/Zahl dazu).
- **Sprache:** Deutsch, du-Form für Schüler, Sie-Form im Ministeriums-Dashboard. Mehrsprachigkeit (EN, TR, AR, UK) = P2.
- **Robustheit:** Ohne Backend (Mock-Modus) voll vorführbar.
- **Browser:** Aktuelles Chrome/Safari (iOS!) /Firefox. iOS-Safari-PWA-Eigenheiten testen.
