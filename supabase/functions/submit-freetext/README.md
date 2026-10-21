# `submit-freetext` – Freitext moderieren und speichern (#126)

Supabase Edge Function für optionale Freitexte (ADR-016, `PRODUCT_SPEC.md` §3.13, `PRIVACY.md` §6a).
Sie ersetzt den öffentlichen Moderations-Endpunkt `moderate-text` aus #119: Moderation und
Speicherung passieren in **einem** Aufruf, und nur nach einer gültigen Umfrage-Teilnahme.

## Secret setzen

**Niemals den Key committen oder als `VITE_*`-Variable setzen.**

```bash
supabase secrets set OPENROUTER_API_KEY=<key>
# optional:
supabase secrets set OPENROUTER_MODEL=openai/gpt-4o-mini
supabase secrets set APP_URL=https://moodmap-cyan.vercel.app
```

## Deploy

```bash
supabase functions deploy submit-freetext
```

Lokal:

```bash
# Key in .env.local (gitignored)
supabase functions serve submit-freetext --env-file .env.local
```

## Request

```http
POST /functions/v1/submit-freetext
Content-Type: application/json

{
  "schoolId": "900000",
  "waveId": "2026-W43",
  "deviceToken": "<anonymes Token aus localStorage>",
  "text": "Herr Müller ist oft zu schnell und die Toiletten sind kaputt."
}
```

Der Aufruf ist nur erfolgreich, wenn für `schoolId` + `waveId` + `deviceToken` bereits eine
Antwort existiert (gleicher Hash wie in `submit_response`). Ohne Teilnahme wird **kein**
OpenRouter-Aufruf gemacht (`403 no_response`).

## Response

Gespeichert:

```json
{
  "ok": true,
  "stored": true,
  "concern": false,
  "cluster": "Unterricht & Gebäude",
  "topics": ["learning", "building"]
}
```

Abgelehnt oder Moderation nicht verfügbar (die Umfrage bleibt gespeichert):

```json
{
  "ok": true,
  "stored": false,
  "reason": "Beleidigung",
  "concern": false
}
```

Bereits ein Freitext vorhanden (kein zweiter LLM-Aufruf):

```json
{ "ok": true, "stored": false, "reason": "already_submitted" }
```

## Regeln

- Max. **280 Zeichen** (`PRODUCT_SPEC` §3.13).
- **Rohtext wird nie gespeichert oder geloggt**; gespeichert wird nur `cleaned` + `topics` + `cluster`
  + `concern` in `freetext_entries` (ohne Rohtext-Spalte).
- Ein Eintrag pro Teilnahme; erneute Aufrufe kosten keinen LLM-Aufruf.
- Timeout **5 s**; bei Fehler/fehlendem Key wird nur der Freitext verworfen (`stored:false`),
  die Umfrage läuft weiter.
- `concern: true` → Client zeigt sofort Hilfsangebote (`PRIVACY` §5), keine Weiterleitung.
  Solche Einträge werden von `get_freetext_clusters` nicht öffentlich ausgewertet.
- Cluster erscheinen erst ab `K_MIN` Einträgen, mit maximal 3 bereinigten Beispielen.
- Im Mock-Modus gibt es zusätzlich einen lokalen Fallback (Wortliste + Themen-Keywords); der ist
  Teil der Survey-UI (#115).
