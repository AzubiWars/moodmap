# Datenschutz & Anonymität – Leitplanken

> **Nicht verhandelbar.** Datenschutz ist bei Minderjährigen und Schulen das erste, was die Jury fragen wird. Wir bauen „Privacy by Design" sichtbar ein und können es im Pitch erklären.
> Hinweis: Dies ist ein Prototyp-Konzept, keine Rechtsberatung. Ein Echtbetrieb erfordert Prüfung durch Datenschutzbeauftragte (Schulrecht NRW, DSGVO, ggf. Datenschutz-Folgenabschätzung).

## 1. Grundsätze

1. **Keine personenbezogenen Daten erheben.** Kein Name, keine E-Mail, kein Account, keine Telefonnummer, keine Klasse (nur grobe Stufe), **keine IP-Adressen speichern**, keine Tracking-/Analytics-Cookies.
2. **Datenminimierung:** Nur Schule, grobe Stufe (`5–7`, `8–10`, `Oberstufe`, `Berufskolleg`), Rolle, Welle, Antworten.
3. **Keine Freitexte im Prototyp** – Freitext kann Namen, Beleidigungen oder Hilferufe enthalten, die wir nicht verantwortungsvoll bearbeiten können.
4. **Zeitstempel grob:** auf Tag gerundet speichern (verhindert Zuordnung über Uhrzeit, z. B. „wer war gerade in Stunde 3 am Handy").
5. **Nur Aggregate sichtbar** – nie Einzelantworten, in keiner Rolle, auch nicht im Ministerium.
6. **Synthetische Daten im Hackathon.** Alle Umfrageergebnisse in der Demo sind generiert und als „Demo-Daten" gekennzeichnet.

## 2. Mindestanzahl (k-Anonymität)

- Jede angezeigte Zelle (Einheit × Thema × Filterkombination × Zeitraum) braucht **mindestens `K_MIN = 10` unterschiedliche Teilnahmen mit gewerteten Antworten**. Mehrere Fragen derselben Teilnahme zählen für diese Mindestanzahl nur einmal. Darunter wird kein Wert angezeigt („zu wenige Daten").
- Die Prüfung passiert **serverseitig** (in Views/RPCs) **und** clientseitig (Defense in Depth). Im Mock-Modus in `src/lib/score.ts`.
- **Differenzangriffe vermeiden:** Kombinationen aus feinen Filtern (z. B. Schule × Oberstufe × Berufskolleg × 1 Woche) erreichen schnell < 10 → werden ausgeblendet. P2: Für Schulebene nur Filter „Thema" + „Zeitraum" erlauben, feinere Filter erst ab Kreisebene.
- `choice`-Verteilungen ebenfalls erst ab `K_MIN`, und einzelne Optionen mit < 3 Nennungen als „< 3" anzeigen.

## 3. Doppelteilnahme & Manipulation (ohne Tracking)

| Maßnahme | Prototyp | Echtbetrieb |
|---|---|---|
| Zufälliges Geräte-Token in localStorage, serverseitig nur als `hash(token + wave_id)` gespeichert → 1 Antwort pro Gerät & Welle | ✅ | ✅ |
| Schul-Join-Code (QR in der Schule ausgehängt / von Lehrkraft gezeigt), nicht erratbar | ✅ (Demo-Code) | ✅, rotierend pro Welle |
| Rate-Limit pro Schule (Ausreißer-Erkennung: plötzliche Spitzen) | – | ✅ |
| Plausibilitätsprüfung (z. B. alle Fragen in < 5 s „durchgeklickt" → gewichtet abwerten) | P2 | ✅ |
| Teilnahme nur im Schulnetz / über Schul-Login (z. B. LOGINEO NRW) | – | Option prüfen |

Ehrlich im Pitch: Ohne Login ist Manipulation nie 0 – aber durch Join-Codes, Wellen, Hashing und Ausreißer-Erkennung für einen *Stimmungspuls* ausreichend robust. Moodmap zeigt Tendenzen, keine Wahlergebnisse.

## 4. Wer sieht was?

| Rolle | Landes-/Bezirks-/Kreisebene | Schulebene | Eigene Schule |
|---|---|---|---|
| Öffentlichkeit / Schüler:innen | ✅ aggregiert | ❌ (nur „eigene Schule") | ✅ (ab K_MIN) |
| Schule (Leitung, SV) | ✅ | ❌ andere Schulen (nur Vergleich mit Ø gleicher Schulform) | ✅ |
| Ministerium / Schulaufsicht | ✅ | ✅ (ab K_MIN) | – |

**Begründung:** Öffentliche Schul-Rankings führen zu Stigmatisierung („Problemschule") und Anreizen zur Manipulation. Im Prototyp wird das über den Rollen-Umschalter gezeigt – ein starkes Argument im Pitch.

## 5. Sensible Inhalte

- Keine Fragen zu besonderen Kategorien personenbezogener Daten (Gesundheitsdiagnosen, Herkunft, Religion, Sexualität).
- Wohlbefinden wird nur als Stimmung abgefragt, nie als Diagnose.
- Bei negativer Antwort zu Wohlbefinden/Mobbing: **Hilfsangebote** zeigen (Nummer gegen Kummer 116 111, Schulpsychologische Beratung, Schulsozialarbeit, Krisenchat). Keine Notfall-Versprechen („Wir melden uns") – wir können nicht reagieren, da anonym.

## 6. KI-Lagebericht

- Das LLM erhält **ausschließlich aggregierte, bereits k-anonymisierte Kennzahlen** (Scores, n, Deltas, Verteilungen) – keine Rohdaten, keine Einzelantworten.
- API-Key nur serverseitig (Edge Function Secret).
- Bericht wird als „KI-generiert – bitte prüfen" gekennzeichnet.

## 7. Frühwarn-Radar & „Politik antwortet": Dialog, keine Überwachung

Das Frühwarn-Radar ist das sensibelste Feature. Es lebt vom Vertrauen der Schüler:innen – deshalb:

- **Zweckbindung:** Unterstützung und Dialog (Schulsozialarbeit, Schulpsychologie, Gesprächsformate, politische Antworten). **Keine** Weitergabe an Polizei/Ordnungsbehörden, **keine** Sanktionen gegen Schulen, **keine** Personen-Identifikation.
- **Nur Aggregate ab K_MIN**, wie überall. Schulebene nur für Ministerium/Schulaufsicht.
- **Sprache:** „Gespräch suchen", nicht „Gefahr", „Risiko-Schule" oder „Gefährder". Keine Prognosen über Gewalt durch Einzelne.
- **Transparenz gegenüber Schüler:innen:** Auf `/privacy` erklären, dass Ergebnisse genutzt werden, um Unterstützung und Gespräche anzustoßen – und wofür nicht.
- **Politik-Antworten** werden nicht personalisiert: Schüler:innen sehen Antworten passend zu Region und Thema, es gibt kein Profil und keine Direktnachrichten.
- Bewertungen von Antworten („Hilft dir das?") werden wie Umfrageantworten behandelt: gehasht pro Gerät, nur aggregiert sichtbar.

## 8. Technische Checkliste für Agenten

- [ ] Kein `SELECT` auf `responses`/`answers` für `anon` (RLS)
- [ ] Insert nur über validierende RPC `submit_response`
- [ ] Keine IP, User-Agent oder Fingerprinting-Daten speichern; Supabase-Logs nicht für Auswertung nutzen
- [ ] Keine Third-Party-Tracker, keine Google Fonts per CDN (selbst hosten), keine Analytics
- [ ] `K_MIN`-Prüfung server- und clientseitig, mit Unit-Test
- [ ] Geräte-Token nur gehasht serverseitig
- [ ] Datenschutz-Erklärung in einfacher Sprache unter `/privacy`
- [ ] Demo-Banner „Prototyp – Demo-Daten" sichtbar
