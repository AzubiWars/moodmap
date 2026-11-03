# Echte Umfragedaten importieren (ADR-018, Epic #264)

> Vorher PRIVACY §9 lesen. Die Checkliste in §9.7 gilt für jeden ersten Import einer neuen Quelle.

Importiert wird nur lokal per CLI mit dem Service-Role-Key. Dieser Key gehört nie ins Frontend, ins Repo oder in Issues. Ohne `--commit` (Dry-Run) baut die CLI keine Verbindung auf und schreibt nichts.

## Ablauf

```bash
# 1. Rohdatei und Profil lokal ablegen. imports/ ist in .gitignore.
mkdir -p imports

# 2. Dry-Run: Bericht mit Zählwerten, nichts wird geschrieben
npm run data:import -- --file imports/schule.xlsx --mapping imports/schule.mapping.json --source schule-2026

# 3. Commit in eine neue Quelle (startet als Entwurf, nur Ministerium sichtbar)
npm run data:import -- --file imports/schule.xlsx --mapping imports/schule.mapping.json \
  --source schule-2026 --label "Schulbefragung Frühjahr 2026" --visibility ministry \
  --period-start 2026-03-01 --period-end 2026-04-30 --commit

# 4. Nach der Stichprobe freischalten bzw. bei Fehlern zurückrollen
npm run data:import -- --activate schule-2026
npm run data:import -- --rollback <import_run_id>
```

`.env.local` (nie committen):

```dotenv
SUPABASE_URL=https://<projekt>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
# Mindestens 16 Zeichen. Hasht die Teilnahme-IDs des Anbieters. Bei Wiederholungsimporten dasselbe Salt verwenden.
MOODMAP_IMPORT_SALT=<zufälliger-langer-wert>
```

Ausprobieren mit den synthetischen Fixtures:

```bash
npm run data:import -- --synthetic --source test \
  --file scripts/fixtures/import/beispiel.xlsx --mapping scripts/fixtures/import/beispiel.mapping.json
```

## Was die CLI garantiert

| Eigenschaft | Umsetzung |
|---|---|
| Dry-Run schreibt nichts | Ohne `--commit` keine Netzwerkverbindung. Der Bericht enthält nur Zählwerte und Zeilennummern, keine Zellinhalte. |
| Kein Teilimport | Die Zeilen gehen in Blöcken in `private.import_staging`. Erst `import_finalize` schreibt alles in einer Transaktion. Bei einem Fehler wird nichts übernommen, und der Lauf steht auf `failed`. |
| Keine Duplikate | `unique (source_id, external_key_hash)`. Ein erneuter Import derselben Datei überspringt bekannte Teilnahmen. |
| Rollback | `--rollback <id>` löscht genau die Teilnahmen bzw. Aggregate dieses Laufs. |
| Audit | `private.import_runs`: Datei-Hash, Profil + Version, Zeilenzahlen, Fehlercodes, Importeur, Status. |
| Datenschutz | Spalten, die nach Personendaten aussehen (Name, E-Mail, Klasse, Geburtsdatum, Gerät, Freitext …), brechen den Import ab, solange sie nicht unter `drop` stehen. Nicht zugeordnete Spalten werden verworfen. |
| K_MIN | Anbieter-Aggregate mit `n < 10` werden nicht importiert. Der Bericht zeigt, wie viele Schul- und Kreis-Wellen unter K_MIN bleiben. |

Exit-Codes: `0` ok, `1` kritische Fehler (nichts importiert), `2` Aufruf- oder Konfigurationsfehler. Kritisch sind ein ungültiges Profil, fehlende Spalten, nicht verworfene Personendaten, keine gültige Zeile oder mehr abgelehnte Zeilen als `--max-reject-rate` (Standard 10 %).

## Mapping-Profil

Ein Profil pro Lieferformat, versioniert. Beispiele: `scripts/fixtures/import/beispiel.mapping.json` (Einzelantworten) und `aggregate.mapping.json` (Anbieter-Aggregate). Typdefinition: `scripts/lib/import/mapping.ts`.

| Feld | Bedeutung |
|---|---|
| `columns.externalId` | Teilnahme-ID des Anbieters. Wird nur gesalzen gehasht gespeichert. |
| `columns.school` | Spalte mit der Schulnummer. Optional `values` für eigene Codes → Schulnummer. |
| `columns.date` / `columns.wave` | Datum (`DD.MM.YYYY`, `YYYY-MM-DD` oder Excel-Seriennummer) → ISO-Woche, oder direkt `JJJJ-Www`. Fehlende Wellen legt der Import an. |
| `columns.role` | Spalte + Werte-Mapping oder `default`. |
| `columns.gradeBand` | Stufe direkt oder `fromGrade: true` (5–7, 8–10, 11–13/EF/Q1/Q2). |
| `questions[]` | `column` → `questionId` (aus `src/data/topics.ts`). Optional `values` (Text → Zahl), `scale` (lineare Umrechnung auf 1–5, Ergebnis muss ganzzahlig sein), `reverse`, `choice` (`separator`, Text → Option). |
| `missing` | Werte für „keine Angabe“ (Standard: leer, `k.A.`, `NA`, `n/a`, `-`). |
| `drop` | Spalten, die gelesen, aber nie verwendet werden. Alle personenbezogenen Spalten gehören hierher. |

**Anbieter-Aggregate** (`"granularity": "aggregate"`): `level`, `region`, `topic`, `wave`/`date`, `n`, `score` (optional `scale`, z. B. Mittelwert 1–5 → 0–100) und optional `distribution` (5 Spalten). Solche Quellen werden in der App als „vom Anbieter aggregiert“ gekennzeichnet. Verteilungen, Trends und Filter (Schulform, Stufe, Rolle) gibt es nur, wenn sie geliefert wurden. Mehrere gewählte Wellen zeigen nur dann einen Wert, wenn genau eine davon geliefert ist. Es wird nichts geschätzt.
