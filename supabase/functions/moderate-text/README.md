# `moderate-text` – Freitext-Moderation (Live-Test)

Supabase Edge Function für optionale Freitexte (ADR-016, `PRODUCT_SPEC.md` §3.13).
Der Prototyp hat keine Freitexte; diese Function ist für den Pitch-/Live-Test gedacht.

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
supabase functions deploy moderate-text
```

Lokal:

```bash
# Key in .env.local (gitignored)
supabase functions serve moderate-text --env-file .env.local
```

## Request / Response

```http
POST /functions/v1/moderate-text
Content-Type: application/json

{ "text": "Herr Müller ist oft zu schnell und die Toiletten sind kaputt." }
```

```json
{
  "allowed": true,
  "reason": "",
  "cleaned": "Eine Lehrkraft ist oft zu schnell und die Toiletten sind kaputt.",
  "topics": ["learning", "building"],
  "cluster": "Unterricht & Gebäude",
  "concern": false
}
```

Bei Ablehnung:

```json
{
  "allowed": false,
  "reason": "Beleidigung",
  "cleaned": "",
  "topics": [],
  "cluster": "",
  "concern": false
}
```

## Regeln

- Max. **280 Zeichen** (`PRODUCT_SPEC` §3.13).
- Nur `allowed`, `reason`, `cleaned`, `topics`, `cluster`, `concern` werden zurückgegeben.
- **Rohtext wird nie gespeichert oder geloggt**; gespeichert wird nur `cleaned` + `topics` + `cluster`.
- Timeout **5 s**; bei Fehler/fehlendem Key wird nur der Freitext verworfen, die Umfrage läuft weiter (`allowed:false`).
- `concern: true` → Client zeigt sofort Hilfsangebote (PRIVACY §5), keine Weiterleitung.
- Im Mock-Modus gibt es zusätzlich einen lokalen Fallback (Wortliste + Themen-Keywords); der ist Teil der Survey-UI.
