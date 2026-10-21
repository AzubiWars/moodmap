# Pitch-Teststandort und Reset (#113)

Die Migration `20261021160000_pitch_site.sql` legt **einen ausdrücklich synthetischen** Standort `pitch-test` mit Code **PITCH** an (Berlin-Koordinate, kein bestätigter Veranstaltungsort). Vor dem Pitch die Angaben aus #118 übernehmen. Migrationen/Secrets deployt der Lead gemäß ARCHITECTURE §10; dieser PR führt keinen Hosted-Reset aus.

## Standort konfigurieren

Als DB-Admin oder `service_role` einmalig aufrufen, mit dem tatsächlichen Standort **außerhalb NRW**:

```sql
select public.configure_pitch_site('Name des Test-Standorts', 'Ort', 52.52, 13.405, 'PITCH');
```

ID `pitch-test`, Kreis `TEST-PITCH` und Bezirk `TEST` bleiben stabil. Alle drei tragen `is_test = true`; ein Trigger verhindert gemischte Test-/NRW-Eltern. Normale REST-Stammdatenlisten blenden sie per RLS aus. `get_school_by_code('PITCH')` liefert die Testschule samt `isTest: true` für `/s/PITCH`.

Die regulären Aggregate, Trends, Verteilungen und Politik-Effekte schließen Testschulen aus. Die öffentliche `AggregateQuery`-Ebene `nrw` aus #140/#158 bleibt erhalten. Die zusätzliche interne Ebene `pitch` ist für normale RPCs gesperrt.

## Beamer lesen

`POST /rest/v1/rpc/get_pitch_aggregate`, Body `{}`, anon/authenticated erlaubt. Nur der Beamer pollt alle 2–3 Sekunden (#116):

```typescript
{
  school: { id, name, city, lat, lon, isTest: true },
  waveId,
  n,          // alle Teilnahmen in der aktuellen Welle, auch reine Choice-Abgaben
  scoredN,    // unterschiedliche Teilnahmen mit gewerteten Antworten
  score,      // null unter K_MIN gewerteten Teilnahmen
  topicScores // je Thema null unter K_MIN
}
```

Ohne Stimmen: `n: 0`, `scoredN: 0`, `score: null`. Der Teilnahmenzähler ist kein individueller Antwortdatensatz. Rohantworten/Hashes bleiben unlesbar. Freitext-Cluster kommen separat aus #126. Ein Gerät kann unabhängig je einmal im normalen NRW- und im Test-Modus abstimmen; die Test-Hash-Namespace wird nur serverseitig aus der Schule bestimmt.

## Reset

`pitch-reset` läuft als Supabase Edge Function. Secrets:

- `PITCH_RESET_PIN`: zufälliger langer Wert, mindestens 8 Zeichen; **kein** `VITE_`-Wert, kein Default, nicht in Git/Chat.
- `APP_URL`: erlaubte Browser-Origin (lokal z. B. `http://localhost:5173`), Default Production-Origin.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`: von der Edge-Runtime bereitgestellt, nie an den Client geben.

Mit dem normalen Supabase-Client/anon-Key `pitch-reset` aufrufen, Body `{ pin: "…" }`. Der Edge-Gateway-JWT-Check bleibt aktiv; zusätzlich prüft der Handler die PIN. Die Function ruft ausschließlich `reset_pitch_test()` auf, ohne clientseitige Ziel-ID. Fehlende/zu kurze Konfiguration → 503, falsche PIN → 401, Datenbankfehler → 502 mit generischer Meldung. PIN/Requests/Fehler werden nicht geloggt, Antworten nicht gecacht.

Der RPC ist nur für `service_role` freigegeben. Er löscht nur Antworten der markierten Schule `pitch-test`, einschließlich Antworten und Hashes. Antwortgebundene Freitexte müssen `response_id ... ON DELETE CASCADE` verwenden (#126, mit Autor abgestimmt). Danach kann dasselbe Gerät erneut im Pitch abstimmen; NRW-Abgaben und deren Sperren bleiben erhalten. Gleichzeitige neue Abgaben nach der Reset-Transaktion zählen zur neuen Runde.

## Prüfung

PGlite prüft getrennte Teilnahmen, K_MIN bei 9/10, öffentlichen Zugriff, Ausschluss aus NRW/Trend/Verteilung/Radar, gezielten Reset und erneute Teilnahme. HTTP-Tests prüfen falsche PIN ohne DB-Zugriff, fehlende Konfiguration, Origin, festen RPC und generische Fehlermeldungen. Mock-Testschulen werden ebenfalls aus regulären Auswertungen ausgeblendet.

Offen für den echten Pitch: Veranstaltungsort/PIN (#118), Hosted-Deployment durch Lead, Freitext-Kaskade nach #126 und Lasttest mit 200 Abgaben (#117). Im Standard-Mock wird kein Pitch-Teststandort angelegt; der normale Demo-Flow bleibt ohne Keys funktionsfähig.
