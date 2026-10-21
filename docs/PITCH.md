# Pitch – Moodmap NRW

> Wird vom `qa`-Agenten und den Menschen gepflegt. Alle Zahlen vor dem Pitch mit Quelle belegen (Issue MM-41) – lieber keine Zahl als eine falsche.

## 1. Storyline (≈ 5–6 Minuten – Zeiten an das Zeitlimit des Hackathons anpassen)

| Zeit | Teil | Inhalt |
|---|---|---|
| 0:00 | **Hook** | Bild/Schlagzeile aus Frankreich *(Ereignis aus MM-44 einsetzen)* → „Das ist nicht über Nacht passiert. Davor gab es Monate, in denen sich junge Menschen nicht gehört gefühlt haben. **Wir wollen, dass es in NRW gar nicht erst so weit kommt.**" |
| 0:30 | **Problem** | Über 5.000 Schulen, Millionen Schüler:innen in NRW *(verifizieren)*. Die Politik erfährt von Stress, Lehrkräftemangel, KI-Chaos, Konflikten oder kaputten Toiletten erst Jahre später aus Studien – zu spät, zu grob, zu selten. Und Schüler:innen erleben selten, dass ihre Meinung etwas bewirkt. |
| 1:00 | **Lösung** | Moodmap – zwei Säulen: **1. Zuhören:** 60-Sekunden-Mood-Check, Live-Stimmungswetter für das Ministerium. **2. Antworten:** Frühwarn-Radar + „Politik antwortet" – Politik und Schüler:innen arbeiten gemeinsam an Lösungen. |
| 1:30 | **Live-Demo** | Siehe Demo-Skript unten (Herzstück!) |
| 5:00 | **Datenschutz & Vertrauen** | Anonym by Design: kein Login, keine IP, Mindestanzahl 10, nur Aggregate. Frühwarn-Radar = Unterstützung & Dialog, **keine Überwachung**. |
| 5:20 | **Ausblick** | Dialogrunden SV ↔ Politik pro Regierungsbezirk auf Basis der Moodmap, Lehrkräfte-Modus, Integration in LOGINEO NRW, Wirkungsmessung, übertragbar auf alle Bundesländer. |
| 5:40 | **Ask / Abschluss** | „Gebt den Schüler:innen eine Stimme – und eine Antwort. **Prävention beginnt mit Zuhören.**" |

### Kernbotschaft „Prävention durch Dialog"

- **Ton:** Ernst, aber nicht reißerisch. Wir instrumentalisieren kein Ereignis, wir lernen daraus. Kein „Moodmap hätte X verhindert" – sondern „Moodmap schafft Frühwarnung und einen Kanal, *bevor* Frust eskaliert".
- **Formel:** *Gehört werden → Vertrauen → Mitgestalten statt Eskalation.*
- **Rollenbild:** Schüler:innen sind nicht Problem oder Risiko, sondern **Partner der Politik**. Die Politik ist nicht Kontrolleur, sondern **Gesprächspartner**.
- **Beleg im Produkt:** Thema „Gehört werden" ist Pflichtfrage; Antworten der Politik kommen auf dem Handy an und werden bewertet; Wirkung wird gemessen.

## 2. Demo-Skript

**Vorbereitung:** Beamer zeigt `/map` (Rolle Ministerium, Live-Modus an). Zweites Fenster: `/demo` mit großem QR-Code. Handy einer Person aus dem Team als Backup bereit.

1. **Karte zeigen** (20 s): „Das ist NRW heute. Jede Fläche ein Kreis, die Farbe ist das Stimmungswetter." → Legende kurz erklären.
2. **Aha 1 – Themenfilter** (30 s): Gesamt-Mood ist überwiegend „heiter". Klick auf Thema **🤖 KI im Schulalltag** → die Karte kippt ins Regnerische. „Fast überall fühlen sich Schüler beim Thema KI allein gelassen. Das ist ein landesweites Thema – kein lokales."
3. **Aha 2 – Hotspot & Drill-down** (40 s): Thema **📉 Unterrichtsausfall**, Trend-Modus → ein Kreis leuchtet orange. Reinzoomen → Schulen werden sichtbar → eine Schule anklicken → Detail-Panel: Score, Themen vs. NRW, Trend fällt seit 4 Wochen.
4. **Live-Moment** (45 s): „Jetzt Sie!" QR-Code zeigen → Jury macht den Mood-Check auf dem eigenen Handy → auf dem Beamer pulsiert die Demo-Schule, Zähler steigt. *(Fallback: Teammitglied am Handy.)*
5. **Frühwarn-Radar** (30 s): Kartenmodus „Frühwarn-Radar" → ein Kreis steht auf „Gespräch suchen". Detail: „Gehört werden" und „Sicherheit" sinken seit 5 Wochen. „Hier passiert noch nichts Schlimmes – aber hier sollte die Politik jetzt das Gespräch suchen."
6. **Politik antwortet** (40 s): Klick „Antwort veröffentlichen" → z. B. „Wir hören euch: Ab nächster Woche zusätzliche Schulsozialarbeit und eine Dialogrunde mit euren SVs." → Auf dem Handy der Jury erscheint auf dem Danke-Screen „📣 Die Politik antwortet dir". **Kreis geschlossen.**
7. **Wirkung** (15 s): Beispiel-Antwort aus den Demo-Daten zeigen: „Seit dieser Antwort: Gehört-werden +9, Resonanz 🌤️".
8. **KI-Lagebericht** (15 s, optional bei Zeit): Lagebericht mit Abschnitt „Frühwarn-Radar & Dialogempfehlungen".

**Timing:** Schritte 1–7 ≈ 3:30 min. Ist das Zeitfenster kürzer, Schritt 3 (Drill-down) und 8 (Lagebericht) kürzen – **Schritt 4–6 (Live + Frühwarn + Politik antwortet) nie streichen**, das ist die Pitch-Story.

**Fallbacks:** Kein Internet → Mock-Modus lokal (`npm run preview`), Live über zwei Tabs (BroadcastChannel). Totalausfall → aufgezeichnetes Demo-Video (MM-40).

## 3. Erwartete Jury-Fragen

| Frage | Antwort-Kern |
|---|---|
| Wie verhindert ihr Manipulation / Mehrfachabstimmung? | Join-Code pro Schule & Welle, 1 Antwort pro Gerät & Welle (gehasht), Ausreißer-Erkennung; Moodmap misst Tendenzen, keine Wahlen. Echtbetrieb: optional Schul-Login. |
| Datenschutz bei Minderjährigen? | Keine personenbezogenen Daten, keine Freitexte, Mindestanzahl 10, nur Aggregate, Zeitstempel gerundet, kein Tracking. Echtbetrieb mit DSFA und Datenschutzbeauftragten. |
| Werden Schulen an den Pranger gestellt? | Nein – Schulebene sehen nur Ministerium und die Schule selbst. Öffentlich nur Kreisebene. |
| Ist das repräsentativ? | Nein, und das behaupten wir nicht. Es ist ein häufiger Puls, der Studien ergänzt. Beteiligungsquote wird immer angezeigt; optional Gewichtung nach Schülerzahl. |
| Warum sollten Schüler mitmachen? | 60 Sekunden, sofortiges Ergebnis („Deine Schule vs. NRW"), sichtbare Wirkung („Ihr habt gesagt – wir tun"). |
| Was kostet das? | Open-Source-Stack, Serverless; Betriebskosten gering. Kein eigener Server nötig. |
| Woher kommen die Daten in der Demo? | Synthetisch generiert mit realistischen Mustern; Schul-/Kreisstammdaten aus Open Data NRW (sofern eingebunden). |
| Ist das Frühwarn-Radar nicht Überwachung von Schülern? | Nein: nur anonyme Aggregate ab 10 Antworten, keine Personen, keine Weitergabe an Polizei, keine Sanktionen. Es löst Unterstützung und Gespräche aus – Schüler:innen sehen die Antwort selbst. |
| Könnt ihr Gewalt vorhersagen? | Nein, und das wollen wir nicht. Wir machen sichtbar, wo Frust und Unsicherheit wachsen, damit Politik früher mit Dialog und Unterstützung reagiert. |
| Warum sollte die Politik antworten? | Weil Zuhören ohne Antwort Vertrauen zerstört. Moodmap macht Antworten einfach (1 Formular) und Wirkung messbar – ein Gewinn für beide Seiten. |
| Was macht die KI? | Fasst ausschließlich aggregierte Kennzahlen zu einem Lagebericht zusammen. Keine Einzeldaten, gekennzeichnet als KI-generiert. |

## 4. Fakten-Sammlung (mit Quelle füllen!)

| Fakt | Wert | Quelle | Geprüft |
|---|---|---|---|
| Anzahl Schulen in NRW | ca. 5.000+ | IT.NRW / Schulministerium | ☐ |
| Anzahl Schüler:innen in NRW | ca. 2,5 Mio. | IT.NRW | ☐ |
| Anzahl Lehrkräfte in NRW | | | ☐ |
| Aktuelle Studie zu Schülerwohlbefinden / Stress | | z. B. Deutsches Schulbarometer (Robert Bosch Stiftung) | ☐ |
| KI-Nutzung durch Schüler:innen | | | ☐ |
| **Frankreich-Ereignis** (was, wann, Bezug zu Schule/Jugend) | | seriöse Quelle (z. B. tagesschau, Le Monde, AFP) | ☐ |
| Vertrauen junger Menschen in Politik / Gefühl, gehört zu werden | | z. B. Shell-Jugendstudie, Jugendstudien der Bertelsmann Stiftung | ☐ |
| Bestehende Beteiligungsformate in NRW (z. B. Landesschüler:innenvertretung) | | | ☐ |

## 5. Folien-Inhalte (Stichpunkte)

1. Titel: Logo, „Moodmap – Das Stimmungswetter für NRWs Schulen", Team
2. Hook: Frankreich – „Das passiert nicht über Nacht."
3. Problem (1 Satz + 1 Zahl)
4. Lösung: Zwei Säulen „Zuhören" + „Antworten" (Screenshot Handy + Karte nebeneinander)
5. → Live-Demo
6. Privacy by Design & „Dialog, keine Überwachung" (4 Icons)
7. Roadmap / Ausblick
8. Team (Menschen + „unser KI-Agenten-Team" – Fun Fact: wie viele Issues/PRs die Agenten selbstständig bearbeitet haben → `gh issue list --state all | wc -l`)
