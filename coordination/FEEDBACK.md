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

**In Arbeit (nächste Inkremente):** Lagebild mit Prozent-Statistik und Brennpunkten (#25), Frühwarn-Radar (#42), „Politik antwortet“ (#43), Pitch-Live-Test über Supabase mit Freitext-Moderation (#113–#117, #126), nur Deutschland zeigen (#132), neues App-Icon (#91).

---

## Feedback-Einträge

### FB-007 · Karte: nur Deutschland zeigen
- **Von:** Louis · **Datum/Zeit:** 2026-10-21 13:15
- **Gerät/Ansicht:** /map
- **Feedback:** Nur Deutschland zeigen, der Rest der Karte ist ausgeblendet.
- **Wichtigkeit:** 👍
- **Status:** 🟡 in Arbeit (#132). Die Maske gibt es seit #89, auf `main` greift sie aber nicht (Bug).

### FB-006 · Pitch: Live-Mood-Check per QR + Freitext mit KI-Moderation
- **Von:** Louis · **Datum/Zeit:** 2026-10-21 12:45
- **Gerät/Ansicht:** Pitch
- **Feedback:** Für den Pitch einen Live-Mood-Check per QR-Code simulieren, den wir in der Demo zurücksetzen können, für einen Test-Kreis bzw. -Standort außerhalb NRW. Etwa 100–200 Leute nehmen live teil (Test-Modus). Außerdem die freie Eingabe testen: Sie wird von einer KI über OpenRouter geprüft, nach Themen geclustert, und Schimpfwörter bzw. unpassende Jugendwörter werden herausgenommen.
- **Wichtigkeit:** 🔥
- **Status:** 🟡 in Arbeit. Spec §3.12/§3.13, ADR-015/016. Issues: #113 Test-Standort+Reset, #114 KI-Moderation, #115 Freitext-UI, #116 Beamer-Ansicht, #117 Lasttest; #23/#24 auf P0. Fragen an euch: #118. **Von den Menschen gebraucht:** Ort/Name des Test-Standorts, OpenRouter-API-Key (als Supabase-Secret, nicht im Chat/Repo), Reset-PIN.

### FB-005 · Karte: Schulen und Detail je Kreis sehen
- **Von:** Louis · **Datum/Zeit:** 2026-10-21 12:00
- **Gerät/Ansicht:** /map
- **Feedback:** Eine Karten-Einstellung, mit der man Schulen sehen kann, falls noch nicht geplant. Einzelne Kreise sollen sich detaillierter ansehen lassen: wo genau die Haken sind und die Ergebnisse je Standort.
- **Wichtigkeit:** 🔥
- **Status:** 🟡 fast fertig. Drill-down bis zur Schule (#17, #18 ✅), Karte mit echten Mock-Aggregaten (#68 ✅), 3D-Gebäude (#89 ✅). Offen: **#19 Detail-Panel mit „Top 3 Baustellen“ je Kreis/Schule**, beide auf P0 hochgestuft (`claude-henrik-nixos`, Rolle map). Werte nur für synthetische Schulen (ADR-012).

### FB-004 · Darkmode
- **Von:** Yanic (im Chat beauftragt, durch Codex eingetragen) · **Datum/Zeit:** 2026-10-21
- **Gerät/Ansicht:** nicht angegeben
- **Feedback:** „Darkmode“
- **Wichtigkeit:** nicht angegeben
- **Status:** 🔴 neu; vorhandenes Umsetzungsticket: #35

### FB-003 · PWA läuft – App-Icon passt nicht zum Konzept
- **Von:** Louis · **Datum/Zeit:** 2026-10-21 11:45
- **Gerät/Ansicht:** Handy, installierte PWA
- **Feedback:** PWA funktioniert. Das Icon gefällt nicht, ein Wetter-Icon passt nicht zum allgemeinen Mood-Konzept. Besser wäre vielleicht ein Kartensymbol von NRW mit Handschlag oder Smiley.
- **Wichtigkeit:** 👍
- **Status:** 🟡 in Arbeit (#91), 2 Varianten zur Auswahl; die Wetter-Skala in der App bleibt vorerst (Annahme, siehe #91)

### FB-002 · Pitch-Fokus: Prävention – Politik und Schüler arbeiten zusammen
- **Von:** Team · **Datum/Zeit:** 2026-10-21
- **Gerät/Ansicht:** Pitch / Konzept
- **Feedback:** Im Pitch soll klar werden: Wir wollen Vorkommnissen wie in Frankreich vorbeugen. Politik und Schüler:innen arbeiten zusammen – Moodmap ist der Kanal dafür.
- **Wichtigkeit:** 🔥
- **Status:** 🟢 Doku erledigt; Umsetzung in #42/#43/#45, Frankreich-Recherche #44 (VISION, PRODUCT_SPEC §3.9/3.10, SURVEY_TOPICS `voice`, ARCHITECTURE, PRIVACY §7, PITCH, ADR-007). Lead: Issues MM-42–MM-45 anlegen und hier verlinken. Konkretes Frankreich-Ereignis mit den Menschen klären (MM-44).

### FB-001 · Projektstart
- **Von:** Team · **Datum/Zeit:** 2026-10-21
- **Gerät/Ansicht:** –
- **Feedback:** Startet mit M0 aus `docs/ROADMAP.md`. Vercel ist mit dem GitHub-Repo verbunden und wird für Hosting genutzt. Team-Modelle: Claude, Codex, DeepSeek. Ziel: funktionierender, pitchbarer Prototyp – Demo-Fluss Umfrage → Karte hat oberste Priorität.
- **Wichtigkeit:** 🔥
- **Status:** 🟢 M0 erledigt (Scaffold, CI, Vercel unter https://moodmap-cyan.vercel.app)
