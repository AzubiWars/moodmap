# Themen- & Fragenkatalog

> Quelle der Wahrheit für die Umfrage-Inhalte. Im Code als `src/data/topics.ts` (bzw. Seed in der DB) abgebildet – **IDs/Slugs hier und im Code müssen übereinstimmen.**
> Texte sind Entwürfe – Menschen dürfen sie jederzeit über `coordination/FEEDBACK.md` verbessern.

---

## 1. Antwortskala `mood5` (Standard)

Jede Kernfrage wird auf derselben 5er-Skala beantwortet. Das macht Themen vergleichbar und die Karte einfach.

| Wert | Wetter | Emoji | Label (Schüler) | Score |
|---|---|---|---|---|
| 1 | ⛈️ Gewitter | 😫 | richtig mies | 0 |
| 2 | 🌧️ Regen | 😕 | eher schlecht | 25 |
| 3 | ⛅ wechselhaft | 😐 | geht so | 50 |
| 4 | 🌤️ heiter | 🙂 | eher gut | 75 |
| 5 | ☀️ Sonne | 🤩 | richtig gut | 100 |
| – | – | 🤷 | weiß nicht / keine Angabe | wird nicht gewertet |

**Wichtig:** Alle Fragen sind so formuliert, dass **hoch = gut** ist. Bei „negativen" Themen (Stress) wird die Frage positiv gedreht („Wie gut kommst du mit dem Druck klar?") **oder** die Frage hat `invert: true` und der Score wird umgerechnet (`score = 100 - score`). Bevorzugt: positiv formulieren, `invert` nur wenn nötig.

## 2. Themen für Schüler:innen

**Pflichtthemen** (immer im Mood-Check) sind mit ⭐ markiert. Die übrigen rotieren, sodass pro Durchgang 6–8 Themen gefragt werden und jedes Thema trotzdem genug Antworten bekommt.

| # | Slug | Thema | Icon | Kernfrage (`mood5`) | Vertiefung (`choice`, optional) |
|---|---|---|---|---|---|
| 0 | `overall` ⭐ | Gesamtstimmung | 🌡️ | Wie geht's dir gerade mit Schule insgesamt? | – |
| 1 | `learning` ⭐ | Lernstoff & Unterricht | 📚 | Wie gut kommst du gerade mit dem Unterrichtsstoff mit? | Woran liegt's? *zu schnell · zu viel · zu langweilig · unklar erklärt · passt* |
| 2 | `stress` ⭐ | Stress & Leistungsdruck | 🧯 | Wie gut kommst du mit dem Druck (Tests, Noten, Hausaufgaben) klar? | Was stresst am meisten? *Klausuren-Häufung · Hausaufgaben · Noten/Zukunftsangst · Erwartungen Eltern · Vergleich mit anderen* |
| 3 | `ai` ⭐ | KI im Schulalltag | 🤖 | Wie gut fühlst du dich beim Thema KI (ChatGPT & Co.) in der Schule begleitet? | Wie nutzt du KI für die Schule? *gar nicht · Erklären lassen · Hausaufgaben · Texte schreiben · Lernen/Üben · Ich weiß nicht, ob ich darf* (Mehrfach) |
| 4 | `wellbeing` ⭐ | Wohlbefinden & mentale Gesundheit | 💚 | Wie gut geht es dir zurzeit seelisch? | Hast du in der Schule jemanden, an den du dich wenden kannst? *ja · weiß nicht · nein* |
| 5 | `community` | Klassengemeinschaft & Zugehörigkeit | 🤝 | Wie wohl fühlst du dich in deiner Klasse / Stufe? | Hast du in letzter Zeit Mobbing mitbekommen (auch online)? *nein · ja, bei anderen · ja, bei mir · keine Angabe* |
| 6 | `teachers` | Verhältnis zu Lehrkräften | 🧑‍🏫 | Wie fair und respektvoll fühlst du dich von deinen Lehrkräften behandelt? | – |
| 7 | `digital` | Digitale Ausstattung | 💻 | Wie gut ist deine Schule digital ausgestattet (WLAN, Geräte, Tafeln)? | Was nervt am meisten? *WLAN · keine Geräte · Technik kaputt · Lehrkräfte nutzen es nicht · passt* |
| 8 | `building` | Schulgebäude & Toiletten | 🏫 | Wie wohl fühlst du dich im Schulgebäude (Räume, Toiletten, Schulhof)? | Größte Baustelle? *Toiletten · Hitze/Kälte · kaputte Räume · zu wenig Platz · Sauberkeit · passt* |
| 9 | `cancellation` | Unterrichtsausfall | 📉 | Wie zuverlässig findet dein Unterricht statt? | Wie oft fällt bei dir pro Woche etwas aus? *nie · 1–2 Std. · 3–5 Std. · mehr* |
| 10 | `participation` | Mitbestimmung | 🗳️ | Wie sehr hast du das Gefühl, an deiner Schule mitreden zu können? | – |
| 11 | `future` | Zukunft & Berufsorientierung | 🧭 | Wie gut bereitet dich die Schule auf deine Zukunft vor? | – |
| 12 | `safety` | Sicherheit | 🛡️ | Wie sicher fühlst du dich in der Schule und auf dem Schulweg? | – |
| 13 | `food` | Mensa & Pausen | 🥪 | Wie zufrieden bist du mit Pausen, Essen und Trinken an der Schule? | – |
| 14 | `phones` | Handy & Social Media | 📱 | Wie gut findest du die Handy-Regeln an deiner Schule? | Wie lautet die Regel? *komplett verboten · nur in Pausen · im Unterricht erlaubt · weiß nicht* |
| 15 | `voice` ⭐ | Gehört werden – Politik & Schüler | 📣 | Wie sehr hast du das Gefühl, dass die Politik sich für die Meinung von Schüler:innen interessiert? | Wie würdest du am liebsten mitreden? *Online wie hier · über die SV · Gespräch mit Politiker:innen an der Schule · Jugendparlament/Schülervertretung auf Landesebene · gar nicht* (Mehrfach) |

**Für den Prototyp (P0):** Themen 0–8 **und 15** umsetzen. Themen 9–14 sind P1 (nur als Daten/Seed ergänzen).
Thema `voice` ist das Herz der Pitch-Säule „Prävention durch Dialog" (siehe `docs/VISION.md`) und fließt zusammen mit `safety`, `community`, `wellbeing` und `participation` in das **Frühwarn-Radar** (siehe `docs/ARCHITECTURE.md` §5).

### Swipe-Aussagen (`swipe`, P1)

Schnelle Zustimmung/Ablehnung, zählen zum jeweiligen Thema (Zustimmung = 100, Ablehnung = 0, gewichtet halb so stark wie die Kernfrage):

| Thema | Aussage |
|---|---|
| `ai` | „Meine Lehrkräfte erklären, wie man KI sinnvoll nutzt." |
| `ai` | „Es ist klar geregelt, wann ich KI benutzen darf." |
| `stress` | „Ich habe genug Freizeit neben der Schule." |
| `learning` | „Ich weiß, wofür ich das lerne, was wir gerade machen." |
| `wellbeing` | „Ich schlafe unter der Woche genug." |
| `digital` | „Das WLAN funktioniert, wenn wir es brauchen." |
| `participation` | „Unsere SV kann wirklich etwas verändern." |
| `building` | „Ich gehe in der Schule ohne Bedenken auf die Toilette." |
| `voice` | „Wenn wir Schüler:innen Probleme ansprechen, ändert sich auch etwas." |
| `voice` | „Ich würde gern direkt mit Politiker:innen über Schule sprechen." *(zählt nicht in den Score, nur Verteilung)* |
| `safety` | „Wenn es an meiner Schule Streit gibt, wird er gut gelöst." |

### Rückmeldung auf Antworten der Politik (P1)

Wenn eine Antwort/Maßnahme der Politik angezeigt wird (Feature „Politik antwortet", siehe `docs/PRODUCT_SPEC.md` §3.9), kann sie bewertet werden:
- `mood5`: „Hilft dir diese Antwort?" – wird **nicht** in den Themen-Score eingerechnet, sondern als eigene Kennzahl „Resonanz" pro Antwort gezeigt.

## 3. Datenformat (Vorschlag für `topics.ts`)

```ts
type QuestionType = 'mood5' | 'swipe' | 'choice' | 'multichoice';
type Audience = 'student' | 'teacher';

interface Topic {
  slug: string;          // 'stress'
  title: string;         // 'Stress & Leistungsdruck'
  icon: string;          // '🧯'
  audience: Audience[];
  mandatory: boolean;    // immer im Mood-Check?
  priority: 'P0' | 'P1';
}

interface Question {
  id: string;            // 'stress.core', 'stress.deep', 'ai.swipe.rules'
  topic: string;         // Topic-Slug
  type: QuestionType;
  text: string;
  options?: { value: string; label: string }[];
  invert?: boolean;      // nur wenn nicht positiv formulierbar
  weight: number;        // Kernfrage 1.0, Swipe 0.5, choice 0 (zählt nicht in Score)
  audience: Audience;
}
```

`choice`/`multichoice`-Fragen fließen **nicht** in den Mood-Score ein, sondern werden als Verteilungen im Detail-Panel gezeigt („42 % stresst am meisten: Klausuren-Häufung").

## 4. Themen für Lehrkräfte (Phase 2 / P2)

| Slug | Thema | Kernfrage |
|---|---|---|
| `t_overall` | Gesamtstimmung | Wie geht es Ihnen derzeit mit Ihrer Arbeit an der Schule? |
| `t_workload` | Arbeitsbelastung | Wie gut ist Ihre Arbeitsbelastung derzeit zu bewältigen? |
| `t_bureaucracy` | Verwaltung & Bürokratie | Wie viel Ihrer Zeit können Sie für das eigentliche Unterrichten nutzen? |
| `t_staffing` | Personalsituation | Wie gut ist Ihre Schule personell aufgestellt? |
| `t_inclusion` | Inklusion & Heterogenität | Wie gut fühlen Sie sich unterstützt, allen Schüler:innen gerecht zu werden? |
| `t_ai` | KI im Unterricht | Wie gut fühlen Sie sich auf den Umgang mit KI im Unterricht vorbereitet (Fortbildung, Regeln)? |
| `t_digital` | Digitale Ausstattung | Wie gut ist Ihre Schule digital ausgestattet? |
| `t_leadership` | Rückhalt | Wie gut fühlen Sie sich von Schulleitung und Schulaufsicht unterstützt? |
| `t_violence` | Konflikte & Gewalt | Wie sicher fühlen Sie sich im Schulalltag? |
| `t_health` | Gesundheit | Wie gut gelingt es Ihnen, gesund zu bleiben und abzuschalten? |

**Spannende Kreuz-Auswertung für den Pitch:** Themen, die beide Gruppen haben (`ai`/`t_ai`, `digital`/`t_digital`, `overall`/`t_overall`) → „Schüler und Lehrkräfte sind sich einig: Die KI-Regeln fehlen."

## 5. Formulierungsregeln

- Kurz (max. ~12 Wörter), du-Form, Alltagssprache, keine Doppelverneinung.
- Positiv formuliert (hoch = gut).
- Keine Fragen, die einzelne Lehrkräfte oder Mitschüler identifizierbar machen („Wie findest du Herrn X?" ❌).
- Keine Fragen zu Gesundheitsdiagnosen, Religion, Herkunft, sexueller Orientierung (besondere Kategorien nach DSGVO Art. 9) ❌.
- Bei sensiblen Themen (Wohlbefinden, Mobbing) nach dem Mood-Check **Hilfsangebote** einblenden (z. B. Nummer gegen Kummer 116 111, Schulpsychologie, Schulsozialarbeit).
