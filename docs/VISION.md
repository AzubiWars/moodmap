# Vision – Moodmap NRW

## Elevator Pitch (30 Sekunden)

> In NRW gibt es über 5.000 Schulen und rund 2,5 Millionen Schülerinnen und Schüler. Wie es ihnen gerade geht – mit dem Stoff, dem Stress, der KI, den kaputten Toiletten – erfährt die Politik meist erst Jahre später aus Studien.
> **Moodmap** ändert das: Schüler geben in 60 Sekunden anonym ihre Stimmung ab, und das Ministerium sieht auf einer Live-Karte, wo es brennt – landesweit, pro Kreis, pro Schule, pro Thema.
> Moodmap ist das **Stimmungs-Wetterradar für NRWs Schulen** – und ein **Dialogkanal**: Politik hört nicht nur zu, sie antwortet sichtbar.
> Was in Frankreich passiert ist, zeigt: Wenn sich junge Menschen über lange Zeit nicht gehört fühlen, kann Frust eskalieren. Moodmap setzt **vorher** an.

*(Zahlen und das Frankreich-Beispiel vor dem Pitch verifizieren – siehe `docs/PITCH.md` §4.)*

## Die zweite Säule: Prävention durch Dialog – Politik und Schüler gemeinsam

Moodmap ist nicht nur ein Messinstrument für das Ministerium, sondern eine **Brücke zwischen Schüler:innen und Politik**.

**Leitgedanke:** Eskalationen – Gewalt an Schulen, Wut auf „die da oben", Proteste, die kippen – entstehen selten aus dem Nichts. Ihnen gehen oft lange Phasen voraus, in denen Frust, Unsicherheit und das Gefühl, nicht gehört zu werden, wachsen. Genau das macht Moodmap **früh sichtbar** und gibt ihm einen **konstruktiven Kanal**.

**Belegtes Beispiel:** Am 27. Juni 2023 wurde der 17-jährige Nahel Merzouk in Nanterre bei einer Polizeikontrolle erschossen. In den folgenden Tagen kam es in mehr als 500 Städten und Gemeinden Frankreichs zu Ausschreitungen. Analysen nennen als strukturellen Hintergrund unter anderem Segregation und Bildungsungleichheit in den Banlieues – kein Rechtfertigungsgrund für Gewalt, sondern ein Warnsignal für aufgestaute Frustration (The Guardian, 2.7.2023; Le Gall & Oberti, Sciences-Po-Arbeitspapier zu den strukturellen Wurzeln der Unruhen).

Drei Bausteine:

1. **Frühwarn-Radar (für Politik):** Kennzahlen, die auf wachsende Spannungen hinweisen – sinkendes Sicherheitsgefühl, zunehmende Konflikte/Mobbing, schlechtes Wohlbefinden und vor allem ein sinkendes **„Gehört-werden"-Gefühl** – werden pro Region beobachtet. Wo sie kippen, kann die Politik **Unterstützung schicken** (Schulsozialarbeit, Schulpsychologie, Gesprächsformate), bevor etwas passiert.
2. **„Politik antwortet" (Rückkanal):** Das Ministerium bzw. die Bezirksregierungen veröffentlichen zu Themen und Regionen sichtbare Antworten und Maßnahmen („Ihr habt gesagt: KI-Regeln fehlen → Wir erarbeiten bis März einen Leitfaden"). Schüler:innen sehen sie nach dem Mood-Check und auf der Karte und können bewerten, ob die Antwort hilft. **Zuhören allein reicht nicht – Gehört-werden muss man erleben.**
3. **Gemeinsame Formate:** Die Daten werden Grundlage für echte Begegnungen: Schülervertretungen (SV, Bezirks- und Landesschülervertretung) und Politik besprechen die Moodmap gemeinsam, z. B. in regelmäßigen Dialogrunden pro Regierungsbezirk. Schüler:innen werden **Mitgestaltende statt Betroffene**.

**Abgrenzung (wichtig für Vertrauen):** Das Frühwarn-Radar ist ein Unterstützungs- und Dialoginstrument, **kein Überwachungs- oder Sicherheitsinstrument**. Es identifiziert keine Personen, meldet nichts an Polizei oder Ordnungsbehörden und führt nicht zu Sanktionen gegen Schulen (siehe `docs/PRIVACY.md` §7).

## Das Problem

1. **Schulpolitik fliegt auf Sicht mit veralteten Instrumenten.** Große Studien (Schulbarometer, PISA, Landesbefragungen) erscheinen selten, mit Verzögerung und selten flächendeckend auf Schulebene.
2. **Schüler werden selten gefragt – und wenn, passiert danach nichts Sichtbares.** Umfragemüdigkeit entsteht, wenn Feedback im Nichts verschwindet.
3. **Probleme sind regional unterschiedlich.** Digitale Ausstattung im ländlichen Sauerland, Lehrkräftemangel im Ruhrgebiet, Prüfungsstress am Gymnasium – ein Landesdurchschnitt verschleiert das.
4. **Neue Themen entwickeln sich schnell.** Z. B. KI-Nutzung im Unterricht: Wie nutzen Schüler KI wirklich? Fühlen sie sich gut begleitet? Dafür gibt es kaum aktuelle Daten.

## Die Lösung

Eine **niedrigschwellige, spielerische Umfrage-App** + **ein Lagebild als interaktive Karte**.

- **Für Schüler:** 60-Sekunden-„Mood-Check" mit Emojis und Swipe-Karten, anonym, auf dem Handy, als PWA installierbar. Direkt danach sehen sie, wie ihre Schule und NRW insgesamt drauf sind („Give to get").
- **Für Schulen (Schulleitung, SV):** Eigenes Stimmungsbild der Schule, Trends, Vergleich mit ähnlichen Schulen. Optional: „Ihr habt gesagt – wir haben getan"-Board, damit Schüler sehen, dass ihr Feedback wirkt.
- **Für das Ministerium / die Politik:** Moodmap von NRW (Regierungsbezirk → Kreis → Schule), Filter nach Thema, Schulform, Jahrgang, Zeitraum; Hotspots & Trends; Frühwarn-Radar; automatischer KI-Lagebericht; Rückkanal „Politik antwortet".

## Zielgruppen & Rollen

| Rolle | Phase | Bedürfnis | Sieht |
|---|---|---|---|
| **Schüler:in** (Sek I, Sek II, Berufskolleg) | Prototyp | Gehört werden, schnell, anonym, cool | Umfrage, eigene Schule vs. NRW, öffentliche Karte |
| **Lehrkraft** | Phase 2 (im Prototyp angedeutet) | Belastung sichtbar machen | Eigene Lehrkräfte-Umfrage, Ergebnisse ihrer Schule |
| **Schulleitung / SV** | Prototyp (einfach) | Wo müssen wir ansetzen? | Schul-Dashboard |
| **Ministerium / Bezirksregierung / Schulträger** | Prototyp (Kern der Demo) | Lagebild, Prioritäten, Wirkung von Maßnahmen | Volle Moodmap, Drill-down, Filter, Trends, KI-Lagebericht, Export |
| **Öffentlichkeit / Presse** | Später, bewusst eingeschränkt | Transparenz | Nur aggregierte Karte auf Kreisebene |

## Was Moodmap NICHT ist

- **Kein Schul-Ranking zum Anprangern.** Schulebene ist für Ministerium & die Schule selbst – öffentlich nur aggregiert (siehe `docs/PRIVACY.md`).
- **Kein Kontrollinstrument für einzelne Lehrkräfte oder Klassen.** Keine Auswertung unterhalb der Mindestanzahl.
- **Keine wissenschaftliche Studie.** Moodmap ist ein *Puls* – schnell, häufig, indikativ. Es ergänzt Studien, ersetzt sie nicht.

## Mehrwert (für den Pitch)

| Für wen | Mehrwert |
|---|---|
| Ministerium | Echtzeit-Lagebild statt Jahresbericht; Ressourcen gezielt dorthin, wo es brennt; Wirkung von Maßnahmen messbar (vorher/nachher); direkter Draht zu Schüler:innen |
| Schulen | Kostenloses Schulklima-Barometer ohne eigenen Aufwand |
| Schüler | Echte, einfache Beteiligung mit sichtbarer Antwort der Politik – Demokratiebildung im Alltag |
| Gesellschaft | Prävention statt Reaktion: Spannungen früh erkennen und im Dialog lösen, bevor sie eskalieren; Vertrauen junger Menschen in Politik stärken |

## Leitmetapher: Das Stimmungswetter

Die Karte funktioniert wie eine Wetterkarte: ☀️ sonnig (gute Stimmung) bis ⛈️ Gewitter (schlechte Stimmung). Das ist intuitiv für Schüler, Politiker und Presse gleichermaßen und gibt der App eine eigene Identität. Details in `docs/DESIGN.md`.

## Erfolg im Hackathon bedeutet

1. Ein Jurymitglied scannt einen QR-Code, macht auf dem eigenen Handy den Mood-Check – und sieht die Karte **live** reagieren.
2. Die Karte zeigt ein glaubwürdiges, farbiges NRW mit Drill-down bis zur Schule.
3. Ein Themenfilter (z. B. „KI im Unterricht") zeigt sofort ein anderes Bild als der Gesamt-Mood → „Aha-Moment".
4. Die Jury sieht, wie eine **Antwort der Politik** beim Schüler auf dem Handy ankommt – der Kreis schließt sich.
5. Datenschutz-Fragen und die Frage „Ist das nicht Überwachung?" können souverän beantwortet werden.
