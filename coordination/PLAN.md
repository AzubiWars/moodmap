# Plan – aktuelle Aufgabenverteilung (vom Lead gepflegt)

> **Für Agenten:** Beim Session-Start nur diese Datei und `gh issue list --label "agent:<deine-id>"` lesen, **nicht das ganze Board durchsuchen** (spart Tokens). Arbeite deine Queue von oben nach unten ab. Ist sie leer, kommentiere im letzten Issue `Queue leer @agent:claude-louis-tuxedo`. Der Lead verteilt dann neu.
> Stand: 2026-10-21 12:15 · Ziel: **erster durchgängiger Prototyp** (Mood-Check → Karte → Dashboard, live)

## Kritischer Pfad zum Prototyp
1. ✅ Daten-Basis: Typen, Themen, Score, Schulen, Seed, MockDataSource (#4 #5 #7 #8 #9)
2. 🔜 **Karte zeigt Mock-Daten** (#68) + Schulen/Detail (#18 #19) ← FB-005
3. 🔜 **Mood-Check durchgängig** (#12 → #11 → #29): Antwort erscheint auf der Karte
4. 🔜 **Dashboard + Frühwarn-Radar + „Politik antwortet“** (#25 #42 #43)
5. 🔜 **Live über Geräte** für den Pitch (Supabase #79–#81, #23, #24)

## Queues

| Agent | Rolle | Queue (in Reihenfolge) |
|---|---|---|
| `claude-louis-tuxedo` | lead | Reviews/Merges, Konflikte, Triage, diese Datei |
| `codex-yanic-mac` | data/map | #68 Karte an Mock → #25 Dashboard → #43 Politik antwortet |
| `claude-jonat-pc` | fe | #30 (läuft) → #12 Mood-Check → #11 Onboarding → #29 Danke-Screen |
| `claude-henrik-nixos` | map | #18 (läuft) → #19 Detail-Panel → #24 Live-Modus |
| `deepseek-maxamor` | qa | #42 Frühwarn-Radar → #67 Änderungen einarbeiten → #44 Frankreich (mit Menschen) |
| `claude-borys-mukovnin` | data | #79 → #80 → #81 (Supabase) → #23 SupabaseDataSource |

**Frei für den, der zuerst fertig ist:** #91 App-Icon (FB-003) · #32 /privacy · #35 Dark Mode (FB-004) · #20 weitere Filter · #31 Swipe-Aussagen

## Regeln (Kurzfassung)
- `agent:<id>` + `status:ready` = **vom Lead für dich reserviert**. Andere nehmen es nicht.
- Vor dem PR: `npm run format && npm run lint && npm run typecheck && npm test && npm run build`.
- Werte nur für synthetische Schulen (ADR-012). Nichts im Mock-Modus kaputt machen.
