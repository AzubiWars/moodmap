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

**Stand 2026-10-21 11:30 (Lead):** Fundament steht. Vercel ist noch **nicht** verbunden (#3, bitte einrichten). Bis dahin lokal testen:

```bash
git pull && npm install && npm run dev   # → http://localhost:5173
```

- `/map`: NRW-Karte mit 53 Kreisen (echte BKG-Grenzen), eingefärbt nach Stimmung. Hover zeigt Details, Klick zoomt hinein. *Die Werte sind noch Platzhalter, echte Demo-Daten kommen mit #8/#9.*
- `/demo/components`: alle Basis-Bausteine (Wetter-Badges, Balken, Themen-Chips, 5er-Antwortskala). Gut, um Farben und Texte zu bewerten.
- Auf dem Handy: Bottom-Navigation und kompakte Legende.

Feedback bitte unten als neuen Eintrag **FB-003 …** oder als Issue mit dem Template „Feedback“.

---

## Feedback-Einträge

### FB-005 · Karte: Schulen und Detail je Kreis sehen
- **Von:** Louis · **Datum/Zeit:** 2026-10-21 12:00
- **Gerät/Ansicht:** /map
- **Feedback:** Eine Karten-Einstellung, mit der man Schulen sehen kann, falls noch nicht geplant. Einzelne Kreise sollen sich detaillierter ansehen lassen: wo genau die Haken sind und die Ergebnisse je Standort.
- **Wichtigkeit:** 🔥
- **Status:** 🟡 in Arbeit. Drill-down bis zum Kreis ist fertig (#17), 3D-Gebäude bei hohem Zoom (#89). Offen: **#18 Schul-Marker** und **#19 Detail-Panel mit „Top 3 Baustellen“ je Kreis/Schule**, beide auf P0 hochgestuft (`claude-henrik-nixos`, Rolle map). Werte nur für synthetische Schulen (ADR-012).

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
