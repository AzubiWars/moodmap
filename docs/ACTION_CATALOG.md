# Maßnahmenkatalog für Schulen

Der Maßnahmenkatalog übersetzt die Moodmap-Themen in konkrete Handlungsoptionen für Schulleitung, Lehrkräfte, Schülervertretungen und Schulträger. Er ist **kein starres Rezept** und ersetzt keine pädagogische Einschätzung vor Ort.

- **In der App:** `/massnahmen`
- **Datenquelle:** `src/features/actions/catalog.ts`
- **Filter:** Thema, Zielgruppe, Evidenzstufe, Freitextsuche
- **Ziel:** Schulen bekommen nach der Moodmap-Auswertung einen schnellen, nachvollziehbaren Einstieg in Maßnahmen – inklusive Aufwand, Zeitrahmen, Indikatoren und Quellen.

## Evidenzsystematik

| Stufe | Bedeutung |
| --- | --- |
| **A** | Systematische Reviews oder Meta-Analysen mit über mehrere Studien hinweg konsistenten positiven Effekten. |
| **B** | Experimentelle/quasi-experimentelle Studien oder eine gemischte, insgesamt robuste Befundlage. |
| **C** | Praxisstandard, rechtlicher Rahmen oder vielversprechendes Modell; Wirkung noch nicht ausreichend untersucht oder stark kontextabhängig. |

Evidenz ist **keine Wirkungsgarantie**. Sie beschreibt, wie gut eine Maßnahme untersucht ist – nicht, ob sie an einer konkreten Schule unter konkreten Bedingungen wirkt. Deshalb sind Beteiligung, klare Ziele, eine verlässliche Umsetzung und eine ehrliche Auswertung Teil jeder Maßnahme.

## Nutzung im Schulalltag

1. **Daten lesen:** Top-Baustellen aus der Moodmap nehmen, nicht einzelne Personen.
2. **Fokus setzen:** Ein bis zwei Themen auswählen.
3. **Mit Schüler:innen planen:** SV, Klassenrat oder eine offene Runde entscheiden mit.
4. **Umsetzen und messen:** Verantwortliche Person, Termin und einen Indikator festlegen; nach 6–8 Wochen prüfen.
5. **Zurückmelden:** „Ihr habt gesagt – wir haben getan“ – Ergebnisse sichtbar machen, auch bei Absagen.
6. **Nachjustieren:** Nach der nächsten Moodmap-Welle erneut schauen.

## Rote Linien

- Keine öffentlichen Rankings oder individuelle Diagnosen aus Moodmap-Daten.
- Keine Maßnahmen über die Köpfe der Schüler:innen hinweg.
- Bei Hinweisen auf Gewalt, Missbrauch oder akute Selbstgefährdung: sofort Schulleitung, Schulsozialarbeit bzw. Schulpsychologie einschalten – nicht die KI.
- Akute Hilfe: Notruf **112**, Telefonseelsorge **0800 111 0 111**, Nummer gegen Kummer **116 111**.

## Pflege

Neue Maßnahmen brauchen mindestens:

- ein oder mehrere Moodmap-Themen,
- Zielgruppe, Aufwand und Zeitrahmen,
- 3–5 Umsetzungsschritte,
- messbare Indikatoren,
- eine Evidenzeinstufung mit Begründung,
- mindestens eine belastbare Quelle.

Die Quellen liegen direkt am Eintrag in `catalog.ts`. Wenn neue Studien auftauchen, wird die Evidenzstufe angepasst – nicht die Maßnahme „schöngeredet“.
