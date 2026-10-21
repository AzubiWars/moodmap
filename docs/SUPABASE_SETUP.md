# Supabase-Datenquelle und synthetischer Import (#23)

## App starten

Der Standard `VITE_DATA_MODE=mock` läuft ohne Keys. Für gemeinsame Daten auf verschiedenen Geräten in einer lokalen `.env.local` bzw. in den Deployment-Einstellungen setzen:

```dotenv
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=<Projekt-URL>
VITE_SUPABASE_ANON_KEY=<öffentlicher-anon-oder-publishable-Key>
```

Danach den Dev-Server neu starten bzw. neu bauen. Die Datenquelle verwendet nur öffentliche Stammdaten und vorhandene RPCs; sie liest keine Rohantworten. Kein `service_role`-/Secret-Key gehört ins Frontend. Keys nicht in Git oder Issues posten. Für ein Supabase-Projekt zunächst alle gemergten Migrationen und den Stammdaten-Seed durch die zuständige Person einspielen (ARCHITECTURE §10).

Bei fehlender Konfiguration bleibt der vereinbarte Mock-Fallback. Mit vollständiger Live-Konfiguration schlagen fehlerhafte Netzwerk-/RPC-Anfragen sichtbar fehl, statt synthetische Ergebnisse einzumischen. Der allgemeine Schulabruf ist paginiert und liefert keine Join-Codes; `/s/DEMO42` bzw. `/s/PITCH` lösen diese über den dedizierten RPC auf. Der Pitch-Code existiert erst nach der Pitch-Migration (#113).

Die Live-Karte pollt Aggregate bei eingeschaltetem Live-Modus alle 2,5 s. Lokale Abgaben und andere Tabs lösen zusätzlich eine Aktualisierung aus. Ein Realtime-Abonnement auf `responses` wird wegen der gesperrten Rohdaten nicht eingerichtet. Politik-Antworten können nur mit einem echten Auth-JWT und serverseitig erlaubter Rolle veröffentlicht werden; der Demo-Rollenwechsel authentifiziert niemanden.

## Synthetische Antworten importieren

**Nur für eine getrennte synthetische Demo-Datenbank.** In die Live-Pitch-Datenbank keine generierten NRW-Antworten importieren: Das würde synthetische und echte Teilnahmen vermischen. Der normale `supabase/seed.sql` enthält ausschließlich Stammdaten und Umfrage-Konfiguration.

```bash
npm run db:seed:build
npm run db:seed:answers -- --synthetic-demo
```

Der zweite Befehl erzeugt `.cache/synthetic-answers.sql` aus demselben deterministischen Generator wie der Browser-Mock (zehn Wellen bis `2026-W43`). Ein optionales zweites Argument bestimmt die Ausgabedatei. Es werden **keine Verbindungen geöffnet und keine Keys gelesen**. Das Artefakt enthält Tagesdaten, Geräte-Hashes und Antworten, keine Roh-Tokens oder Freitexte. Politische Antworten/Bewertungen sind nicht Teil dieses Imports.

Nach Migrationen und Stammdaten-Seed kann die zuständige Person das SQL mit einem Admin-Zugang auf die **Demo-Datenbank** anwenden, beispielsweise mit einem lokal eingerichteten PostgreSQL-Client:

```bash
psql "$MOODMAP_DEMO_DATABASE_URL" --set=ON_ERROR_STOP=1 --file=.cache/synthetic-answers.sql
```

Die Verbindungsvariable sicher lokal setzen; sie enthält Zugangsdaten und gehört nicht ins Frontend. Dieser Befehl wird vom Generator nicht ausgeführt. Ein Hosted-Import erfolgt nur durch die vom Lead bestimmte Person.

Der Import läuft in einer Transaktion, verlangt übereinstimmende synthetische Schulnummern und Namen und verwendet stabile UUIDs. Derselbe Import kann wiederholt werden, ohne doppelte Antworten zu erzeugen. Er überschreibt oder löscht vorhandene Daten nicht. Nach Änderungen des Generators eine frische Demo-Datenbank verwenden; bestehende Seed-Zeilen werden nicht auf einen neuen Generatorstand aktualisiert. Der Pitch-Teststandort wird nicht befüllt.

## Prüfung vor dem Pitch

1. Mit Supabase-Modus `/s/PITCH` öffnen, abstimmen und auf einem zweiten Gerät den getrennten Beamer-Zähler prüfen (#116). Doppelabgabe muss abgefangen werden.
2. PIN-Reset und erneute Teilnahme prüfen; NRW-Aggregate und NRW-Abgaben bleiben unverändert. Anleitung: [pitch-reset/README.md](../supabase/functions/pitch-reset/README.md).
3. Den Lasttest mit 200 Abgaben aus #117 durchführen; OpenRouter-Budget und Moderationsbegrenzung #170 vorher klären.

Automatisierte Tests prüfen RPC-Verträge, Pagination, Fehlerfälle, Key-Arten, lokale Benachrichtigungen, Mindestanzahlen sowie SQL-Import/Idempotenz und die Gleichheit importierter Aggregate mit dem Mock. Hosted-Smoke und Lasttest benötigen die tatsächliche Projektkonfiguration und ersetzen diese Tests nicht.

REST-Hintergrund: [PostgREST-Pagination](https://docs.postgrest.org/en/stable/references/api/pagination_count.html), [Supabase-Key-Arten](https://supabase.com/docs/guides/getting-started/api-keys).
