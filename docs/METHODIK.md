# Methodik und Forschungsbezug

Stand: Oktober 2026. Diese Datei ist die fachliche Referenz für die öffentliche Seite `/methodik` und für Änderungen an `src/lib/score.ts`, den Supabase-Aggregaten und der Dashboard-Darstellung.

## 1. Zweck und Grenzen

Moodmap erhebt eine **anonyme, selbstselektive Momentaufnahme** der Stimmung an teilnehmenden Schulen. Es ist kein repräsentatives Monitoring und kein Diagnoseinstrument.

Nicht behauptet werden:

- Repräsentativität für alle Schüler:innen oder Schulen in NRW,
- kausale Wirkungen von Themen auf Stimmung oder Leistung,
- Aussagen über einzelne Personen oder Gruppen unter der Mindestzahl,
- eine klinische oder schulpsychologische Einschätzung.

## 2. Datengrundlage

- Quelle: Antworten aus der laufenden Befragung in der aktiven Supabase-Datenbank.
- Zuordnung: eine Schule, eine Kalenderwoche, eine Rolle (Schüler:in/Lehrkraft) und optional eine Stufengruppe.
- Keine Namen, E-Mail-Adressen, IP-Adressen oder Freitext-Identifikatoren in den Aggregaten.
- Doppelteilnahme: gehashter Geräte-Token pro Welle; der Roh-Token wird nicht gespeichert.
- Teststandorte (`schools.is_test`) sind aus öffentlichen Aggregaten ausgeschlossen. Der Demo-Modus ist nur für lokale Entwicklung und Tests gedacht, nicht für Produktionsdaten.

## 3. Antwortskala und Punktwerte

Kernfragen (`mood5`) haben fünf Stufen. „Weiß nicht“ und übersprungene Fragen zählen nicht.

```
mood5:  Punkte = (Antwort − 1) × 25
        Antwort 1 → 0, 2 → 25, 3 → 50, 4 → 75, 5 → 100
swipe:  Zustimmung = 100, Ablehnung = 0
invert: Punkte = 100 − Punkte
choice: kein Score (nur Verteilung)
```

Swipe-Antworten werden mit **0,5** gewichtet, Kernfragen mit **1,0**. Das ist eine bewusste Produktentscheidung: Eine einzelne binäre Aussage soll den Score weniger stark verschieben als eine vollständige 5er-Frage.

## 4. Aggregation

### Themenscore

Gewichteter Mittelwert aller gültigen Antworten eines Themas:

```
Score(Thema) = Σ(Punkte × Gewicht) / Σ(Gewicht)
```

`n` ist die Zahl **unterschiedlicher Teilnahmen** mit mindestens einer gewerteten Antwort zu diesem Thema, nicht die Zahl der Antworten. Mehrere Antworten derselben Person zum selben Thema zählen für `n` nur einmal.

### Gesamt-Mood

Der Gesamt-Mood ist der ungewichtete Mittelwert der Themenscores, die mindestens `K_MIN` Teilnahmen haben. `overall` zählt als eigenes Thema. Themen unter der Schwelle werden nicht einbezogen. Es wird **nicht** der Mittelwert von Schulmittelwerten gebildet; die Aggregation erfolgt auf den Rohantworten der gewählten Einheit.

### Mindestzahl

`K_MIN = 10` (konfigurierbar über `VITE_K_MIN`, serverseitig nicht unterschreitbar). Unter dieser Zahl werden Score, Trend und Verteilung als „zu wenige Daten“ ausgegeben. Das ist eine Schutz- und Robustheitsregel, **kein** Signifikanztest und keine Validierung der Stichprobe.

### Verteilungen

- Nur gültige 5er-Antworten, invertierte Fragen werden gedreht.
- Prozentwerte je Stufe werden mit dem Hare-Niemeyer-Verfahren auf ganze Zahlen verteilt; Summe exakt 100 %.
- „Unzufrieden“ = Stufe 1 + 2; „neutral“ = Stufe 3; „zufrieden“ = Stufe 4 + 5.
- `negativeVotes` ist die absolute Zahl der Stimmen auf Stufe 1 + 2.

### Trend

```
Δ = Score(aktuelle Welle) − Score(Vorwelle)
```

Nur wenn beide Perioden mindestens `K_MIN` Teilnahmen haben. Die Personen in beiden Wellen sind **nicht identisch**; Δ ist deshalb keine individuelle Veränderungsmessung.

### Brennpunkte

Ein Thema ist ein Brennpunkt, wenn bei `n ≥ 30`:

- `Score < 40` oder
- `Δ ≤ −10`.

Die Dashboard-Reihenfolge nutzt die absolute Zahl unzufriedener Stimmen, damit viele Betroffene schwerer wiegen als eine kleine, extrem negative Gruppe.

### Spannungs-Index (Frühwarn-Radar)

Gewichte (Summe 1,0):

| Thema | Gewicht |
|---|---:|
| voice / Gehört werden | 0,30 |
| safety / Sicherheit | 0,20 |
| community / Gemeinschaft | 0,15 |
| wellbeing / Wohlbefinden | 0,15 |
| participation / Beteiligung | 0,10 |
| teachers / Lehrkräfte | 0,10 |

```
Spannung = 100 − Σ(Score × Gewicht) / Σ(Gewicht)
```

Voraussetzung: `voice` plus mindestens zwei weitere Themen mit ausreichend Daten. Fehlende Themen werden über die Gewichte der vorhandenen normiert. Bei einem Abfall von `voice` oder `safety` über drei Wellen werden 10 Punkte addiert (auf 0–100 begrenzt). Schwellen: `< 45` stabil, `45–59,9` beobachten, `≥ 60` ins Gespräch kommen. Der Index ist ein Gesprächsanlass, kein Urteil.

### Beteiligung

`Beteiligung = 100 × n / Σ Schülerzahl der einbezogenen Schulen`. Die Schülerzahl stammt aus den Schulstammdaten und ist teilweise geschätzt oder nicht vorhanden (`−1` = unbekannt). Die Quote ist deshalb eine Orientierung, keine amtliche Response-Rate.

## 5. Forschungsbezug

Die Quellen begründen die Themenauswahl und die Grenzen – **nicht** die Validität des konkreten Index.

- **Wang & Degol (2016):** Schulklima ist multidimensional; Sicherheit, Beziehungen, Unterricht und Umwelt getrennt betrachten. DOI: [10.1007/s10648-015-9319-1](https://doi.org/10.1007/s10648-015-9319-1)
- **OECD PISA 2022, Volume II (2023):** Zugehörigkeit, Sicherheit und Wohlbefinden hängen zusammen. [Report](https://www.oecd.org/en/publications/pisa-2022-results-volume-ii_a97db61c-en.html)
- **WHO/Europe HBSC 2021/22, Volume 1 (2023):** Internationale Vergleichsdaten zu psychischer Gesundheit und Wohlbefinden im Jugendalter. [Report](https://www.who.int/europe/publications/i/item/9789289060356)
- **Deci & Ryan (2000):** Autonomie, Kompetenz und soziale Eingebundenheit als Grundbedürfnisse. DOI: [10.1207/S15327965PLI1104_01](https://doi.org/10.1207/S15327965PLI1104_01)
- **Likert (1932):** Grundlage der skalierten Einstellungsmessung.
- **Jamieson (2004):** Likert-Skalen sind ordinal; gleiche Abstände dürfen nicht selbstverständlich angenommen werden. DOI: [10.1111/j.1365-2929.2004.02012.x](https://doi.org/10.1111/j.1365-2929.2004.02012.x)
- **Sweeney (2002):** k-Anonymität und Schutz kleiner Zellen. DOI: [10.1142/S0218488502001648](https://doi.org/10.1142/S0218488502001648)
- **Robinson (1950):** Ökologischer Fehlschluss bei Aggregatdaten. DOI: [10.2307/2087176](https://doi.org/10.2307/2087176)
- **Groves & Peytcheva (2008):** Nonresponse und Verzerrung; hohe Quote allein reicht nicht. DOI: [10.1093/poq/nfn011](https://doi.org/10.1093/poq/nfn011)

## 6. Änderungsregeln

Jede Änderung an Score, Gewicht, Schwelle, Aggregation oder Darstellung:

1. muss die Formel in dieser Datei und auf `/methodik` aktualisieren,
2. braucht einen Paritätstest zwischen TypeScript und SQL,
3. darf keine Demo- oder Testdaten in Produktionsaggregate einschließen,
4. muss die Auswirkungen auf kleine Fallzahlen und Anonymität prüfen.
