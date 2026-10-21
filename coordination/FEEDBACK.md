# Feedback der Menschen

> **Nur Menschen schreiben hier neue Einträge.** Der Lead-Agent liest diese Datei in jeder Session, zerlegt neues Feedback in GitHub Issues und setzt den Status.
> Feedback hier hat **höchste Priorität** – es schlägt den bestehenden Plan.
> Alternativ: GitHub Issue mit Template „Feedback" (Label `type:feedback`).

## So schreibt ihr Feedback

Neue Einträge **oben** einfügen:

```markdown
### FB-<nr> · <Kurztitel>
- **Von:** <Name> · **Datum/Zeit:** 2026-10-21 14:30
- **Gerät/Ansicht:** z. B. iPhone, Safari, /map
- **Feedback:** Was ist euch aufgefallen / was wünscht ihr euch?
- **Wichtigkeit:** 🔥 muss für Demo · 👍 wäre gut · 💭 Idee
- **Status:** 🔴 neu
```

Status-Werte (setzt der Lead): `🔴 neu` → `🟡 in Arbeit (#issue, #issue)` → `🟢 erledigt` · `⚪ bewusst nicht umgesetzt (Begründung)`

---

## Bitte testen

> Hier schreibt der Lead nach jedem Meilenstein, was neu ist und wie man es testet.

**🎉 Meilenstein „Erster Prototyp“ – Stand 2026-10-21 13:45 (Lead)**, live auf **https://moodmap-cyan.vercel.app** (Demo-Daten, Mock-Modus):

1. **Mood-Check per QR:** `/s/DEMO42` öffnen (oder QR auf `/demo` scannen) → Stufe wählen → 9 Fragen in ca. 60 s → Danke-Seite. Eine zweite Teilnahme in derselben Woche wird abgefangen.
2. **Karte `/map`:** Themen-Schnellfilter (KI, Stress, Gehört werden, „Alle Themen“), Drill-down NRW → Bezirk → Kreis → Schule, Schul-Marker, **Detail-Panel mit Top-3-Baustellen** (Tipp: Kreis Recklinghausen, Thema „Gehört werden“), 3D-Gebäude beim Hineinzoomen, Dark Mode (☾ oben rechts).
3. **`/demo`:** Rollen-Umschalter (Schüler:in · Schule · Ministerium), QR-Code, Demo-Daten zurücksetzen.
4. **Als App installieren** (PWA): Android „App installieren“, iPhone „Zum Home-Bildschirm“.

**Neu auf `main`:** Lagebild mit Prozent-Statistik (#25), Frühwarn-Radar (#42), weitere Kartenfilter (#20), Trend-/Beteiligungsmodus (#21), Demo-/Live-Kennzeichnung (#160), Offline-Puffer für Abgaben (#36), Deutschland-Maske (#132). **In Arbeit:** Beamer-Live-Ansicht (#116), Lasttest (#117), „Politik antwortet“ (#43), App-Icon-Auswahl (#91, zwei Varianten unter `/demo/components`), Zeitachse (#34). Der Supabase-Live-Modus ist im Code fertig (#23), braucht aber noch Function-Deployments und Vercel-Env (#118).

---

## Feedback-Einträge

### FB-007 · Karte: nur Deutschland zeigen
- **Von:** Louis · **Datum/Zeit:** 2026-10-21 13:15
- **Gerät/Ansicht:** /map
- **Feedback:** Nur Deutschland zeigen, der Rest der Karte ist ausgeblendet.
- **Wichtigkeit:** 👍
- **Status:** 🟢 erledigt (#132/#154). Deutschland-Maske, `maxBounds` und Mindest-Zoom sind auf `main`.

### FB-006 · Pitch: Live-Mood-Check per QR + Freitext mit KI-Moderation
- **Von:** Louis · **Datum/Zeit:** 2026-10-21 12:45
- **Gerät/Ansicht:** Pitch
- **Feedback:** Für den Pitch einen Live-Mood-Check per QR-Code simulieren, den wir in der Demo zurücksetzen können, für einen Test-Kreis bzw. -Standort außerhalb NRW. Etwa 100–200 Leute nehmen live teil (Test-Modus). Außerdem die freie Eingabe testen: Sie wird von einer KI über OpenRouter geprüft, nach Themen geclustert, und Schimpfwörter bzw. unpassende Jugendwörter werden herausgenommen.
- **Wichtigkeit:** 🔥
- **Status:** 🟡 in Arbeit. Spec §3.12/§3.13, ADR-015/016. **Fertig/gemergt:** #23 SupabaseDataSource, #24 Live-Modus, #113 Test-Standort+Reset, #114/#115/#126/#152 Freitext (UI, Moderation, Speicherung, Cluster), #170 atomare Moderationsbegrenzung. Migrationen sind im gehosteten Projekt; PITCH-Standort aktiv. **Offen:** #116 Beamer-Ansicht, #117 Lasttest, Deployment der Edge Functions + Secrets/Vercel-Env. Fragen an euch: #118. **Von den Menschen gebraucht:** Ort/Name des Test-Standorts, OpenRouter-API-Key (als Supabase-Secret, nicht im Chat/Repo), Reset-PIN, Supabase-Access-Token für Function-Deployments.

### FB-005 · Karte: Schulen und Detail je Kreis sehen
- **Von:** Louis · **Datum/Zeit:** 2026-10-21 12:00
- **Gerät/Ansicht:** /map
- **Feedback:** Eine Karten-Einstellung, mit der man Schulen sehen kann, falls noch nicht geplant. Einzelne Kreise sollen sich detaillierter ansehen lassen: wo genau die Haken sind und die Ergebnisse je Standort.
- **Wichtigkeit:** 🔥
- **Status:** 🟢 erledigt. Drill-down bis zur Schule (#17, #18), Detail-Panel mit Top-3-Baustellen (#19), echte Mock-Aggregate (#68), 3D-Gebäude (#89), weitere Filter (#20) und Demo-/Live-Kennzeichnung (#160) sind auf `main`. Werte nur für synthetische Schulen (ADR-012).

### FB-004 · Darkmode
- **Von:** Yanic (im Chat beauftragt, durch Codex eingetragen) · **Datum/Zeit:** 2026-10-21
- **Gerät/Ansicht:** nicht angegeben
- **Feedback:** „Darkmode“
- **Wichtigkeit:** nicht angegeben
- **Status:** 🟢 erledigt (#35/#123). Dark Mode ist live; Theme-Umschalter oben rechts.

### FB-003 · PWA läuft – App-Icon passt nicht zum Konzept
- **Von:** Louis · **Datum/Zeit:** 2026-10-21 11:45
- **Gerät/Ansicht:** Handy, installierte PWA
- **Feedback:** PWA funktioniert. Das Icon gefällt nicht, ein Wetter-Icon passt nicht zum allgemeinen Mood-Konzept. Besser wäre vielleicht ein Kartensymbol von NRW mit Handschlag oder Smiley.
- **Wichtigkeit:** 👍
- **Status:** 🟡 PR #182 (Draft) mit zwei Varianten (Smiley/Handschlag) ist fertig und CI-grün; **die Variantenwahl liegt bei euch**. Die Wetter-Skala in der App bleibt vorerst (Annahme, siehe #91).

### FB-002 · Pitch-Fokus: Prävention – Politik und Schüler arbeiten zusammen
- **Von:** Team · **Datum/Zeit:** 2026-10-21
- **Gerät/Ansicht:** Pitch / Konzept
- **Feedback:** Im Pitch soll klar werden: Wir wollen Vorkommnissen wie in Frankreich vorbeugen. Politik und Schüler:innen arbeiten zusammen – Moodmap ist der Kanal dafür.
- **Wichtigkeit:** 🔥
- **Status:** 🟢 Doku erledigt; Frühwarn-Radar (#42) ist gemergt, „Politik antwortet“ (#43) offen. Frankreich-Recherche #44 wartet auf das konkrete Ereignis von euch (VISION, PRODUCT_SPEC §3.9/3.10, SURVEY_TOPICS `voice`, ARCHITECTURE, PRIVACY §7, PITCH, ADR-007).

### FB-001 · Projektstart
- **Von:** Team · **Datum/Zeit:** 2026-10-21
- **Gerät/Ansicht:** –
- **Feedback:** Startet mit M0 aus `docs/ROADMAP.md`. Vercel ist mit dem GitHub-Repo verbunden und wird für Hosting genutzt. Team-Modelle: Claude, Codex, DeepSeek. Ziel: funktionierender, pitchbarer Prototyp – Demo-Fluss Umfrage → Karte hat oberste Priorität.
- **Wichtigkeit:** 🔥
- **Status:** 🟢 M0 erledigt (Scaffold, CI, Vercel unter https://moodmap-cyan.vercel.app)
