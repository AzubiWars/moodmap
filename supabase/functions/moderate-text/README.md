# `moderate-text` – Freitext-Moderation (Live-Test)

Supabase Edge Function, die anonyme Freitexte **vor dem Speichern** prüft.
Der Prototyp hat keine Freitexte; diese Function ist für den Live-Test gedacht.

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

{ "text": "Der Unterricht ist oft zu schnell." }
```

```json
{ "allowed": true, "reason": "" }
```

Bei Ablehnung:

```json
{ "allowed": false, "reason": "Beleidigung" }
```

- Max. 500 Zeichen.
- **Fail-closed:** ohne Key oder bei OpenRouter-Fehler wird der Text nicht freigegeben.
- Kein Logging des Rohtexts.
- Client muss `allowed: true` abwarten und den Text sonst verwerfen.
