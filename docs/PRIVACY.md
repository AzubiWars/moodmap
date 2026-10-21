# Datenschutz & Anonymität – Leitplanken

> **Nicht verhandelbar.** Datenschutz ist bei Minderjährigen und Schulen das erste, was die Jury fragen wird. Wir bauen „Privacy by Design" sichtbar ein und können es im Pitch erklären.
> Hinweis: Dies ist ein Prototyp-Konzept, keine Rechtsberatung. Ein Echtbetrieb erfordert Prüfung durch Datenschutzbeauftragte (Schulrecht NRW, DSGVO, ggf. Datenschutz-Folgenabschätzung).

## 1. Grundsätze

1. **Keine personenbezogenen Daten erheben.** Kein Name, keine E-Mail, kein Account, keine Telefonnummer, keine Klasse (nur grobe Stufe), **keine IP-Adressen speichern**, keine Tracking-/Analytics-Cookies.
2. **Datenminimierung:** Nur Schule, grobe Stufe (`5–7`, `8–10`, `Oberstufe`, `Berufskolleg`), Rolle, Welle, Antworten.
3. **Freitext nur mit KI-Moderation** (ADR-016, PRODUCT_SPEC §3.13): optional, max. 280 Zeichen. Eine serverseitige Moderation entfernt Namen/persönliche Angaben, Beleidigungen und unpassende Sprache. **Gespeichert wird nur der bereinigte Text mit Themen-Cluster, nie der Rohtext** (auch nicht in Logs). Angezeigt werden Cluster und bereinigte Beispiele erst ab K_MIN. Bei Krisensignalen: sofort Hilfsangebote anzeigen, keine Weiterleitung.
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

## 6a. KI-Moderation von Freitexten (OpenRouter, ADR-016)

- **Zweck:** Freitexte nach Themen clustern und dafür sorgen, dass keine beleidigenden, hasserfüllten, bedrohenden, sexuellen oder personenbezogenen Inhalte (Namen, Adressen, Telefonnummern) gespeichert oder angezeigt werden. Unpassende Jugendsprache und Schimpfwörter werden entfernt oder neutralisiert.
- **Ablauf:** Der Text geht an die Supabase Edge Function `submit-freetext` (#126, strukturiert umgesetzt). Die Function prüft zunächst, ob für Schule + Welle + Device-Token bereits eine Umfrage-Teilnahme existiert; ohne Teilnahme wird **kein** LLM aufgerufen. An OpenRouter gehen **nur der Text und der Moderations-Prompt**, keine Schule, keine Welle, kein Device-Token. Gespeichert wird nur das bereinigte Ergebnis mit Cluster. **Rohtext und abgelehnte Texte werden nie gespeichert und nicht geloggt.**
- **Ergebnis:** `allowed`, `reason`, `cleaned`, `topics`, `cluster`, `concern`; max. **280 Zeichen**, Timeout **5 s**. In `freetext_entries` werden nur `cleaned`, `topics`, `cluster` und `concern` gespeichert (Schule/Welle/Tag über die verknüpfte `responses`-Zeile).
- **Fehlerfall:** Ohne Key, bei API-Fehler oder Timeout wird der **Freitext verworfen** (fail-closed für den Freitext); die übrige Abgabe läuft trotzdem durch (fail-open für die Umfrage).
- **Schlüssel & Kosten:** Der API-Key liegt nur als Supabase-Secret vor, nie im Frontend oder Repo. Im OpenRouter-Konto muss ein **Budget-Limit** gesetzt sein; pro Teilnahme ist höchstens ein Moderationsaufruf möglich, Wiederholungen werden ohne LLM-Aufruf beantwortet.
- **Transparenz:** Vor dem Absenden steht ein Hinweis, dass der Text zur Prüfung an einen KI-Dienstleister übermittelt wird.
- **Echtbetrieb:** Die Übermittlung an einen externen KI-Dienst ist eine Datenverarbeitung durch Dritte (Auftragsverarbeitung, Serverstandort, Speicherdauer beim Anbieter, Training ausgeschlossen?). Vor einem Echtbetrieb muss das geprüft werden. Im Pitch-Test nehmen nur Freiwillige im Saal teil. Der Test-Standort (`is_test`) wird nach dem Pitch zurückgesetzt, Freitexte inklusive.

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
