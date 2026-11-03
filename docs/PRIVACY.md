# Datenschutz & Anonymität – Leitplanken

> **Nicht verhandelbar.** Datenschutz ist bei Minderjährigen und Schulen das erste, was die Jury fragen wird. Wir bauen „Privacy by Design" sichtbar ein und können es im Pitch erklären.
> Hinweis: Dies ist ein Prototyp-Konzept, keine Rechtsberatung. Ein Echtbetrieb erfordert Prüfung durch Datenschutzbeauftragte (Schulrecht NRW, DSGVO, ggf. Datenschutz-Folgenabschätzung).

## 1. Grundsätze

1. **Keine personenbezogenen Daten erheben.** Kein Name, keine E-Mail, kein Account, keine Telefonnummer, keine Klasse (nur grobe Stufe), **keine IP-Adressen speichern**, keine Tracking-/Analytics-Cookies.
2. **Datenminimierung:** Nur Schule, grobe Stufe (`5–7`, `8–10`, `Oberstufe`, `Berufskolleg`), Rolle, Welle, Antworten.
3. **Freitext nur mit KI-Moderation** (ADR-016, PRODUCT_SPEC §3.13): optional, max. 280 Zeichen. Eine serverseitige Moderation entfernt Namen/persönliche Angaben, Beleidigungen und unpassende Sprache. **Gespeichert wird nur der bereinigte Text mit Themen-Cluster, nie der Rohtext** (auch nicht in Logs). Angezeigt werden Cluster und bereinigte Beispiele erst ab K_MIN. Bei Krisensignalen: sofort Hilfsangebote anzeigen, keine Weiterleitung.
4. **Zeitstempel grob:** auf Tag gerundet speichern (verhindert Zuordnung über Uhrzeit, z. B. „wer war gerade in Stunde 3 am Handy").
5. **Nur Aggregate sichtbar** – nie Einzelantworten, in keiner Rolle, auch nicht im Ministerium.
6. **Demo- und Echtdaten sind getrennt.** Der Mock-Modus und die Demo-Datenquelle enthalten ausschließlich synthetische Daten und sind als „Demo-Daten" gekennzeichnet. Live-Abgaben und später importierte Echtdaten werden nur als k-anonymisierte Aggregate angezeigt, getrennt von Demo-Daten ausgewiesen und nie mit erfundenen Werten an echten Schulnamen vermischt (ADR-012/013, ADR-017).

## 2. Mindestanzahl (k-Anonymität)

- Jede angezeigte Zelle (Einheit × Thema × Filterkombination × Zeitraum) braucht **mindestens `K_MIN = 10` unterschiedliche Teilnahmen mit gewerteten Antworten**. Mehrere Fragen derselben Teilnahme zählen für diese Mindestanzahl nur einmal. Darunter wird kein Wert angezeigt („zu wenige Daten").
- Die Prüfung passiert **serverseitig** (in Views/RPCs) **und** clientseitig (Defense in Depth). Im Mock-Modus in `src/lib/score.ts`.
- **Differenzangriffe vermeiden:** Kombinationen aus feinen Filtern (z. B. Schule × Oberstufe × Berufskolleg × 1 Woche) erreichen schnell < 10 → werden ausgeblendet. P2: Für Schulebene nur Filter „Thema" + „Zeitraum" erlauben, feinere Filter erst ab Kreisebene.
- `choice`-Verteilungen ebenfalls erst ab `K_MIN`, und einzelne Optionen mit < 3 Nennungen als „< 3" anzeigen.

## 3. Doppelteilnahme & Manipulation (ohne Tracking)

| Maßnahme | Prototyp | Echtbetrieb |
|---|---|---|
| Zufälliges Geräte-Token in localStorage, serverseitig nur als `hash(token + wave_id)` gespeichert → 1 Antwort pro Gerät & Welle | ✅ | ✅ |
| **Eigene Antwort löschen** („Meine Antworten löschen", #161): dasselbe Gerät kann seine Abgabe der aktuellen Welle zurückziehen und neu teilnehmen. Gefunden wird sie nur über den Token-Hash. Ohne das Token (anderes Gerät, gelöschte Browserdaten) ist sie bewusst nicht mehr zuzuordnen | ✅ | ✅ |
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
- **Schlüssel & Kosten:** Der API-Key liegt nur als Supabase-Secret vor, nie im Frontend oder Repo. Im OpenRouter-Konto muss ein **Budget-Limit** gesetzt sein. Vor jedem Aufruf reserviert ein privater, atomarer RPC genau einen Versuch pro Teilnahme; gespeichert wird nur deren ID, kein Text oder Zeitstempel (#170). Auch Ablehnung, Timeout, fehlender Key und Speicherfehler verbrauchen den Versuch; kein automatischer Retry. Wiederholungen sowie Reservierungsfehler verursachen keinen LLM-Aufruf. Pitch-Reset und eigene Rücknahme löschen die zugehörige Reservierung mit der Teilnahme. Eine neue Teilnahme erhält eine neue Berechtigung; das Teilnahmelimit ersetzt daher kein Kontolimit.
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
- [ ] Live- und Demo-Daten sind getrennt gekennzeichnet; ohne Supabase-Konfiguration gibt es keinen stillen Mock-Fallback (ADR-017)
- [ ] Importierte Echtdaten: nur Service-Role-Import, keine Rohdaten in Client/Repo, `n` unter `K_MIN` wird ebenfalls unterdrückt. Checkliste in §9 (ADR-018)

## 9. Importierte Echtdaten (ADR-018, Epic #264)

Bis hierhin gelten alle Regeln für Daten, die über die App erhoben werden. Echte Datensätze von Schulen oder Anbietern kommen auf einem zweiten Weg: per Import. Für sie gilt zusätzlich:

### 9.1 Zulässigkeit (vor dem ersten Import klären, #269)
- **Rechtsgrundlage:** Einwilligung bzw. Rechtsgrundlage der erhebenden Stelle ist dokumentiert. Bei Minderjährigen unter 16: Einwilligung der Erziehungsberechtigten oder schulrechtliche Grundlage.
- **Anonymisierungsgrad:** Wir importieren nur Daten, die beim Anbieter **bereits anonymisiert oder pseudonymisiert** sind. Direkte Identifikatoren werden vor oder spätestens beim Import verworfen.
- **Auftragsverarbeitung:** AVV mit Supabase und EU-Region des Projekts geprüft. Ohne AVV keine Echtdaten in das gehostete Projekt.

### 9.2 Datenminimierung beim Import
- **Nie übernommen:** Namen, E-Mail-Adressen, Klassen (nur grobe Stufe), Geräte-IDs, IP-Adressen, Geburtsdaten, Freitext. Das Mapping-Profil listet solche Spalten explizit unter `drop`. Unbekannte Spalten werden **verworfen**, nicht durchgereicht.
- **Externe IDs** (z. B. Teilnahme-Nr. des Anbieters) werden nur als `sha256(salt + ':' + quelle + ':' + id)` gespeichert und dienen ausschließlich der Idempotenz. Das Salt liegt nur lokal beim Importeur bzw. als Secret.
- **Datum** wird auf den Tag gerundet (§1.4), die Welle aus dem Datum abgeleitet.

### 9.3 Speicherung & Aufbewahrung
- Import-Rohdateien liegen nie im Repo (`imports/` und `*.xlsx`/`*.csv` außerhalb von `fixtures/` sind in `.gitignore`), nie im Client und nie in Supabase Storage.
- **Empfehlung Aufbewahrung:** Rohdatei nach erfolgreichem Import und Plausibilitätsprüfung **löschen**. Der Audit-Eintrag enthält nur einen Datei-Hash, keine Inhalte.
- Importierte Teilnahmen liegen in denselben gesperrten Tabellen wie Live-Abgaben (`responses`/`answers`, kein Zugriff für `anon`/`authenticated`). Anbieter-Aggregate und `import_runs` liegen im Schema `private`, das über die API nicht erreichbar ist.

### 9.4 Sichtbarkeit
- Jede Datenquelle hat `visibility`: `public` (aggregiert für alle) oder `ministry` (nur eingeloggte Konten mit Server-Rolle).
- Die Prüfung passiert **serverseitig** in `get_data_sources()` und in jeder Aggregat-RPC. Der Rollen-Umschalter der Demo verleiht keine Rechte.
- Echtdaten werden als eigene Quelle gekennzeichnet (Label, Zeitraum, Herkunft) und nie mit Demo- oder Live-Daten vermischt (§1.6, ADR-017).

### 9.5 K-Anonymität
- K_MIN = 10 und die Maskierung kleiner Choice-Häufigkeiten (§2) gelten unverändert.
- Liefert ein Anbieter **fertige Aggregate**, werden Zellen mit `n < K_MIN` beim Import verworfen und zusätzlich bei der Abfrage unterdrückt. Fehlende Verteilungen oder Trends werden nicht geschätzt.
- Der Dry-Run-Bericht zeigt, wie viele Zellen unter K_MIN fallen, damit niemand Daten importiert, die am Ende nirgends sichtbar sind.

### 9.6 Löschen & Audit
- **Rollback pro Import-Lauf:** `--rollback <import_run_id>` löscht genau die Teilnahmen dieses Laufs.
- **Ganze Quelle löschen:** Archivieren (`status = archived`, nicht mehr abrufbar), endgültig löschen nur per Service Role.
- `private.import_runs` protokolliert: Quelle, Datei-Hash, Mapping-Version, Zeilen gesamt/akzeptiert/abgelehnt, Fehlercodes (ohne Zellinhalte), Importeur-Kürzel, Zeitpunkt, Status.

### 9.7 Checkliste für den ersten echten Import
- [ ] Rechtsgrundlage, AVV und Region geklärt (#269)
- [ ] Datenwörterbuch liegt vor, Mapping-Profil erstellt und reviewt (Lead)
- [ ] Alle personenbezogenen Spalten im Profil unter `drop`
- [ ] Datenquelle angelegt: Label, Zeitraum, `visibility`, `status = draft`
- [ ] Dry-Run ohne kritische Fehler, Bericht im Issue (nur Zahlen, keine Zeilen)
- [ ] Commit, dann Stichprobe der Aggregate gegen die Anbieter-Auswertung
- [ ] Quelle auf `active` setzen
- [ ] Rohdatei gelöscht, Löschung im Issue vermerkt
