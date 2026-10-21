# Pitch-Lasttest (#117)

Das Skript sendet **200 synthetische Teilnahmen über 120 Sekunden**, davon **60 mit Freitext**.
Es nutzt ausschließlich `pitch-test`, nachdem Join-Code und `isTest: true` geprüft wurden.
Eine nicht leere Runde wird abgewiesen; vor dem Test gegebenenfalls über den Beamer zurücksetzen.
Keine Testdaten an normale NRW-Schulen senden, keinen synthetischen SQL-Antwortimport in die Pitch-DB laden.

## Voraussetzungen und Durchführung durch Lead

1. Aktuelles gemergtes `main` deployen: #113/#23 und **Kostenfix #170**. Dessen Migration vor der
   neuen `submit-freetext`-Function anwenden. #118 klären: Standort, rotierter OpenRouter-Key als
   Supabase-Secret mit Kontolimit, Reset-PIN. Der Lauf kann bis zu **60 kostenpflichtige Moderationen** auslösen.
2. Ein ruhiges Testfenster reservieren: keine anderen Pitch-Teilnahmen oder Resets, keine normalen
   NRW-Abgaben (sonst kann der Vorher-/Nachher-Vergleich berechtigt fehlschlagen).
3. Lokal eine gitignorierte `.env.loadtest.local` mit `MOODMAP_LOADTEST_URL`,
   `MOODMAP_LOADTEST_ANON_KEY`, `MOODMAP_LOADTEST_RESET_PIN` anlegen. Die URL ist die reine
   Supabase-Origin. **Öffentlicher anon-/publishable-Key**, kein Admin-/service-role-Key. Nach #195
   funktionieren sowohl `sb_publishable_*` (Functions mit `--no-verify-jwt`) als auch ein Legacy-anon-JWT.
   Optional `MOODMAP_LOADTEST_JOIN_CODE`, Standard `PITCH`. Werte nicht in Chat, Git oder PR kopieren.
4. Beamer-Ansicht aus #116 in 1920×1080 öffnen, auf dem Handy parallel den QR-Einstieg prüfen.
5. Aus dem Repo ausführen (Node wie im Projekt):

   ```bash
   mkdir -p .cache
   node --env-file=.env.loadtest.local scripts/pitch-loadtest.ts --synthetic-pitch --reset-after > .cache/pitch-loadtest.json
   ```

   Alternativ mit bereits gesetzten Variablen: `npm run pitch:loadtest -- --synthetic-pitch --reset-after`.
   Ohne `--synthetic-pitch` gibt es keinen Netzaufruf. **`--reset-after` löscht ausschließlich die
   Pitch-Runde**, prüft erneute Teilnahme mit demselben synthetischen Gerät und setzt ein zweites Mal
   zurück. Ohne dieses Flag bleiben Testteilnahmen bestehen und die Reset-Prüfung ist `null`.
6. Während des Laufs Beamer prüfen: Zähler steigt, erste Scores ab zehn gewerteten Teilnahmen,
   Cluster erscheinen, Zoomen/Bedienelemente bleiben flüssig. Screenshot/Video und Beobachtung
   festhalten. Das Skript misst Polling-Latenz, **keine Bildrate oder Browserdarstellung**.

## Ergebnis lesen und dokumentieren

JSON enthält pro Abgabe, Moderation und 2,5-s-Aggregat-Polling: Anzahl, Fehlerquote,
Fehlerkategorien sowie p50/p95/max in Millisekunden. Es gibt keine automatischen Retries.
Abgelehnte/nicht gespeicherte Testtexte zählen als Fehler (`text_not_stored`), auch bei HTTP 200.
Request-Timeout: 15 s; der serverseitige Moderator hat weiterhin sein eigenes 5-s-Limit.
Die synthetischen Texte enthalten keine Personenangaben. Tokens, Texte, PIN, Key und
Backend-/Anbieter-Fehlermeldungen erscheinen weder in Ausgabe noch Artefakt.

`checks`: korrekter Teilnahmezähler, abgewiesene Doppelabgabe, unveränderte NRW-Aggregate,
Reset auf null und erneute Abgabe. `controlFailures` meldet fehlgeschlagene Abschlussprüfungen;
bereits erhobene Lastmessungen bleiben dann im Bericht. Bei Abbruch/Prozessende oder einem
fehlgeschlagenen Reset können Testdaten übrig bleiben: Stand prüfen und im Beamer zurücksetzen,
bevor der nächste Lauf startet. Ein Wellenwechsel während des Tests macht den Lauf ungültig.

`passed: true` und Exit-Code 0 bedeuten erfolgreiche **API-Prüfungen**, keine bestätigte
Beamer-Prüfung. Für die Abnahme von #117 braucht es einen tatsächlichen Hosted-Lauf mit
200/60 Requests, 0 Fehlern, allen fünf Checks `true`, plus dokumentierter visueller Prüfung.
Im Issue/PR nur das bereinigte JSON, Datum, Commit/Deployment und die Beamer-Beobachtung ablegen.

Die automatischen Tests des Runners verwenden einen lokalen HTTP-Testserver mit simulierten
RPCs. Sie prüfen Lastmenge, Isolation, Fehlerzählung, Reset/Re-Use und Redaktion der Ausgabe;
sie ersetzen **keinen Supabase-/OpenRouter-Lasttest**.
