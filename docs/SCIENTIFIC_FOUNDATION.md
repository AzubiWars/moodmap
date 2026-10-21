# Wissenschaftliches Fundament & Methodik – Moodmap NRW

> **Zweck dieses Dokuments:**  
> Dieses Dokument definiert die theoretische, statistische und methodische Grundlage für Moodmap NRW. Es dient dem gesamten Entwickler-Team (Lead, Frontend, Backend/Data, QA) als Referenz, um Algorithmen, Aggregationen, Seed-Generatoren und Datenvisualisierungen wissenschaftlich fundiert und rechtlich unangreifbar aufzubauen.

---

## 1. Einleitung & Zielsetzung

Moodmap NRW ist kein statisches Umfragewerkzeug, sondern ein **hochfrequenter Stimmungs-Puls (High-Frequency Sentiment Pulse)** für das Schulwesen in Nordrhein-Westfalen. Ziel ist es, ein valides, verzerrungsarmes und datenschutzkonformes Frühwarn- und Dialogsystem bereitzustellen.

In der empirischen Bildungsforschung stehen klassische Studien (z. B. PISA, TIMSS, Deutsches Schulbarometer) vor dem Problem langer Erhebungs- und Auswertungszyklen (Monate bis Jahre). Moodmap schließt die Lücke zwischen:
1. **Makro-Periodizität** (repräsentative, aber träge Panelstudien) und
2. **Echtzeit-Dynamik** (kontinuierlicher 60-Sekunden-Puls an Schulen).

Daraus ergeben sich besondere methodische Anforderungen an Skalierung, Aggregation, Trenddetektion und rechtliche Absicherung.

---

## 2. Psychometrisches Messmodell & Skalentransformation

### 2.1 Skalenebene & Metrisierung
Die Erfassung erfolgt über standardisierte 5-stufige Likert-Items (`mood5`) sowie dichotome evaluative Statements (`swipe`).

* **Likert-Transformation:**  
  Um intuitive Interpretierbarkeit (0 = maximaler Frust / Unzufriedenheit, 100 = maximale Zufriedenheit / Wohlbefinden) über heterogene Zielgruppen (Schüler:innen, Lehrkräfte, Politik) hinweg zu gewährleisten, wird die ordinale 5-Stufen-Skala metrisiert (analog zum Vorgehen des *WHO-5 Well-Being Index*):
  
  $$P(v) = (v - 1) \cdot 25 \quad \text{für } v \in \{1, 2, 3, 4, 5\}$$
  
  * Stufe 1 (😡 Tiefrot) $\rightarrow 0$ Punkte
  * Stufe 2 (🙁 Rot) $\rightarrow 25$ Punkte
  * Stufe 3 (😐 Gelb) $\rightarrow 50$ Punkte
  * Stufe 4 (🙂 Grün) $\rightarrow 75$ Punkte
  * Stufe 5 (😄 Dunkelgrün) $\rightarrow 100$ Punkte

* **Reverse-Coding (Negativ polare Items):**  
  Fragen, die Belastung, Stress oder Ausfall messen (z. B. `stress.core`, `cancellation.core`), werden vor der Aggregation invertiert:
  
  $$P_{\text{invert}}(v) = 100 - P(v) = (5 - v) \cdot 25$$
  
  *Wissenschaftliche Begründung:* Ein hoher Gesamt-Score steht systemweit immer für ein positives, gesundes Schulumfeld.

* **Dichotome Swipe-Aussagen:**  
  Swipe-Items dienen der schnellen Verifikation von Einzelfaktoren:
  * Zustimmung (👍) $\rightarrow 100$ Punkte (bzw. 0 bei Invertierung)
  * Ablehnung (👎) $\rightarrow 0$ Punkte (bzw. 100 bei Invertierung)
  * Standardgewichtung: $w_{\text{swipe}} = 0.5$, während Kernfragen $w_{\text{core}} = 1.0$ tragen.

### 2.2 Umgang mit Non-Response & Antworttendenzen
* **Vermeidung von Midpoint-Bias:** Schüler:innen tendieren bei Unsicherheit oft zur Mitte (Stufe 3). Aus diesem Grund bietet Moodmap die explizite Option „Weiß nicht / Keine Angabe“.
* **Missing Data Handling:** Antworten mit „Weiß nicht“ werden als Item-Non-Response gewertet und **vollständig aus dem Zähler und Nenner des Mittelwerts ausgeschlossen** (Verhinderung einer künstlichen Regression zur Mitte von 50 Punkten).

---

## 3. Statistische Inferenz, Stichprobenfehler & Konfidenz

### 3.1 Das Spannungsfeld zwischen $k$-Anonymität und statistischer Power
Es muss strikt zwischen zwei Schwellenwerten unterschieden werden:
1. **Datenschutzgrenze ($k \ge 10$):**  
   Rechtlich zwingend nach Art. 4 Nr. 1 i.V.m. ErwGr. 26 DSGVO zur Verhinderung von Re-Identifizierungen. Unter $n = 10$ erfolgt **keine Datenanzeige** (`score = null`).
2. **Statistische Belastbarkeitsschwelle ($n \ge 30$):**  
   Gemäß dem *Zentralen Grenzwertsatz (Central Limit Theorem)* konvergiert die Verteilung des Stichprobenmittelwerts erst ab $n \approx 30$ verlässlich gegen eine Normalverteilung, unabhängig von der Verteilung der Grundgesamtheit.

### 3.2 Standardfehler und Konfidenzintervalle
Unter Annahme einer konservativen Standardabweichung auf Schulebene von $\sigma \approx 25$ Punkten errechnet sich der Standardfehler ($SE$) und das 95%-Konfidenzintervall ($CI_{95\%} = \pm 1.96 \cdot SE$):

| Fallzahl $n$ | Standardfehler $SE = \frac{\sigma}{\sqrt{n}}$ | 95%-Konfidenzintervall ($CI_{95\%}$) | Methodische Einstufung | Empfohlene UI-Darstellung |
|---|---|---|---|---|
| **$n < 10$** | $> 7.9$ | $> \pm 15.5$ Punkte | **Nicht zulässig (Datenschutz)** | Ausgegraut, Status „Zu wenige Daten“ |
| **$10 \le n < 30$** | $4.6 \dots 7.9$ | $\pm 9.0 \dots \pm 15.5$ Punkte | **Geringe Stichprobe (Indikator)** | Punktwert mit Kennzeichnung `~` / Dotted Border |
| **$30 \le n < 100$** | $2.5 \dots 4.5$ | $\pm 4.9 \dots \pm 8.9$ Punkte | **Statistisch belastbar** | Vollflächige Farbfläche, Standardwert |
| **$n \ge 100$** | $\le 2.5$ | $\le \pm 4.9$ Punkte | **Hohe Präzision** | Hohe Konfidenz (optionaler Badge) |

---

## 4. Mehrebenen-Aggregation & Simpson-Paradoxon

### 4.1 Die Mehrebenen-Struktur des Schulsystems
Moodmap aggregiert Daten über vier hierarchische Ebenen:
1. **Mikro-Ebene:** Einzelne Schülerin / Schüler
2. **Meso-Ebene:** Einzelschule (organisatorische Einheit)
3. **Makro-Ebene I:** Kreis / kreisfreie Stadt (Schulträger-Ebene)
4. **Makro-Ebene II:** Regierungsbezirk & Land NRW (Schulaufsicht & Ministerium)

### 4.2 Mikro- vs. Meso-Aggregation
Wird auf Kreisebene der Mittelwert der Schul-Mittelwerte gebildet (ungewichtete Meso-Aggregation), haben kleine Schulen (z. B. Förderschule mit 80 Schüler:innen) denselben Hebel wie Groß-Gesamtschulen mit 1.500 Schüler:innen. Wird umgekehrt rein über Schülerantworten aggregiert (Mikro-Aggregation), dominieren wenige Großschulen den Kreis-Score.

**Wissenschaftlicher Standard in Moodmap:**
* **Primär-Reporting für Land & Kreise (Mikro-Aggregation):**  
  Jede Schülerstimme zählt gleich. Die Kreis- und Landeswerte berechnen sich direkt aus der Grundgesamtheit aller Antworten der Region:
  
  $$\bar{S}_{\text{Kreis}} = \frac{\sum_{i=1}^{N_{\text{Kreis}}} w_i \cdot P_i}{\sum_{i=1}^{N_{\text{Kreis}}} w_i}$$
  
* **Schulentwicklungs-Reporting (Meso-Kontrolle im Dashboard):**  
  Um strukturelle Benachteiligungen einzelner Schulen nicht durch Schulgrößen zu verdecken, wird im Ministeriums-Dashboard zusätzlich die Streuung über die Schulen des Kreises (Standardabweichung und Interquartilsabstand) ausgewiesen.

---

## 5. Das Frühwarn-Radar: Sozialwissenschaftliche Modellierung

### 5.1 Theoretischer Hintergrund: Soziale Entfremdung & Anomie
Der *Spannungs-Index (Tension Index)* modelliert das Risiko schulischer und jugendkultureller Eskalationen. Die theoretische Fundierung stützt sich auf:
* **Entfremdungstheorie (Melvin Seeman, 1959):** Fünf Dimensionen der Entfremdung – insbesondere *Machtlosigkeit (Powerlessness)* und *Bedeutungslosigkeit (Meaninglessness)*. Jugendliche eskalieren nicht spontan; Eskalation ist das Endstadium eines Entfremdungsprozesses, in dem die eigene Wirksamkeit nicht erlebt wird.
* **Theorie der sozialen Desintegration (Wilhelm Heitmeyer, 1997):** Desintegration und das Fehlen emotionaler und sozialer Anerkennung führen zu Frustrations- und Aggressionsstau.
* **Social Bond Theory (Travis Hirschi, 1969):** Die Bindung an die Institution Schule (Vertrauen in Lehrkräfte, Gemeinschaft, Gehört-werden) schützt vor Delinquenz und Gewalt.

### 5.2 Mathematische Formulierung des Spannungs-Index ($T$)

Der Index bewegt sich auf einer Skala von $0$ (völlig entspannt / stabil) bis $100$ (akuter Handlungs- und Dialogbedarf).

#### 1. Themenauswahl & Gewichtung
Die Indikatoren sind nach ihrer prognostischen Valenz für soziale Spannungen gewichtet:

| Thema | Slug | Gewicht $w_t$ | Theoretische Begründung |
|---|---|---|---|
| **Gehört werden** | `voice` | **0.30** | Zentraler Hebel: Erlebte Selbstwirksamkeit vs. Ohnmacht |
| **Sicherheit & Mobbing** | `safety` | **0.20** | Physische und psychische Unversehrtheit im Sozialraum Schule |
| **Gemeinschaft & Klima** | `community` | **0.15** | Peer-Group-Zusammenhalt und Diskriminierungsfreiheit |
| **Seelisches Wohlbefinden** | `wellbeing` | **0.15** | Psychischer Belastungsgrad (WHO-5 Anlehnung) |
| **Mitsprache** | `participation` | **0.10** | Institutionalisierte Beteiligung (§ 74 SchulG NRW) |
| **Verhältnis zu Lehrkräften** | `teachers` | **0.10** | Vertrauen in pädagogische Bezugspersonen |

#### 2. Roh-Spannungsindex ($T_{\text{raw}}$)
Liegen für eine Einheit nicht alle Themen mit $n \ge K_{\text{MIN}}$ vor, werden die vorhandenen Gewichte normiert (Bedingung: `voice` + mindestens zwei weitere Themen müssen vorliegen):

$$T_{\text{raw}} = 100 - \frac{\sum_{t \in T_{\text{obs}}} w_t \cdot S_t}{\sum_{t \in T_{\text{obs}}} w_t}$$

#### 3. Dynamische Drift-Erkennung (CUSUM-Prinzip)
Statische Werte zeigen Momentaufnahmen. Eine kontinuierliche Verschlechterung über mehrere Zeitintervalle (Wellen) deutet auf eine sich verfestigende Dynamik hin.  
* **Regel:** Fällt der Score von `voice` oder `safety` über drei aufeinanderfolgende Wellen ($\Delta S_t \le -3$ pro Welle), wird ein Trend-Aufschlag von $+10$ Punkten addiert:

$$T = \min\left(100, \, T_{\text{raw}} + T_{\text{trend\_bonus}}\right)$$

#### 4. Kategoriale Schwellenwerte
* **$T < 45$ (`stable`):** Normales Schulklima. Keine systemischen Risiken erkennbar.
* **$45 \le T < 60$ (`watch`):** Erhöhte Irritation. Empfehlung: Regelmäßige Beobachtung, SV-Gespräche.
* **$T \ge 60$ (`talk`):** **Frühwarnung.** Konkretes Handlungsfeld. Empfehlung: Proaktiver Dialog des Ministeriums / der Schulsozialarbeit vor Ort.

#### 5. Driver-Attribution (Ursachenzerlegung)
Um blinden Aktionismus zu vermeiden, identifiziert der Algorithmus die zwei Haupttreiber (*Drivers*) der Spannung:

$$D_t = w_t \cdot (100 - S_t)$$

Die Themen mit den höchsten $D_t$-Werten erklären den größten Anteil am Frust und geben der Politik konkrete Handlungsfelder vor (z. B. „Sanierung Toiletten“ vs. „Mitsprache bei Handynutzung“).

---

## 6. Kausalitätsisolierung bei „Politik antwortet“

Reagiert die Politik auf einen Frust-Hotspot mit einer Veröffentlichung (z. B. Zusage für Schulsozialarbeit oder Dialogtermine), misst Moodmap die Resonanz.

### 6.1 Direkte Resonanz
* Schüler:innen bewerten die Antwort direkt auf dem Danke-Screen (`mood5`: „Hilft dir das?“).
* Aggregation erfolgt ab $k \ge 10$ gehashten Bewertungen.

### 6.2 Quasi-experimentelle Wirkungsmessung (Difference-in-Differences)
Um nachzuweisen, ob eine Stimmungsverbesserung in einer Region tatsächlich auf die politische Maßnahme zurückzuführen ist (und nicht auf externe Faktoren wie Ferienbeginn oder Sommerwetter), verwendet das System einen vereinfachten **Difference-in-Differences (DiD)** Ansatz:

$$\text{Effekt} = \left(S_{\text{Region, post}} - S_{\text{Region, pre}}\right) - \left(S_{\text{Landesweit, post}} - S_{\text{Landesweit, pre}}\right)$$

Ist $\text{Effekt} > 0$, hat die gezielte Maßnahme der Region über den landesweiten Trend hinaus signifikant geholfen.

---

## 7. Rechtliche Leitplanken („Legal by Design“)

### 7.1 Schulgesetz NRW (§ 120 Abs. 4 SchulG NRW & BASS 10-45 Nr. 2)
Befragungen und wissenschaftliche Untersuchungen an Schulen in NRW unterliegen strengen rechtlichen Voraussetzungen:
1. **Keine Beeinträchtigung des Unterrichts:** Durch die Begrenzung auf 60 Sekunden (maximal 5–8 Klicks) kann die Befragung in Pausen, Freistunden oder im Rahmen der SV-Arbeit durchgeführt werden.
2. **Absolute Freiwilligkeit:** Die Teilnahme darf weder durch Notendruck, noch durch Belohnungen erzwungen werden.
3. **Zwingende Anonymität:** Es dürfen keinerlei Rückschlüsse auf Einzelpersonen möglich sein.
4. **Legitimation:** Moodmap ist als Initiative des Ministeriums für Schule und Bildung (MSB NRW) in Verbindung mit den gewählten Schülervertretungen (**§ 74 SchulG NRW**) konzipiert.

### 7.2 DSGVO-Freiheit durch echte Anonymität (ErwGr. 26 DSGVO)
* Gemäß Erwägungsgrund 26 der DSGVO gelten die Grundsätze des Datenschutzes **nicht für anonyme Informationen**.
* **Technische Garantien für Anonymität:**
  * Keine Speicherung von IP-Adressen (Verwerfung vor Datenbank-Insert).
  * Keine Speicherung von User-Agents oder Canvas-Fingerprints.
  * Keine Freitextfelder (Ausschluss von Klarnamen und Re-Identifizierungsvektoren).
  * Zeitstempel werden server- und clientseitig auf den Kalendertag gerundet.
  * Verhinderung von Mehrfachteilnahme über einen Einweg-Hash:  
    $\text{DeviceHash} = \text{HMAC-SHA256}(\text{ClientToken}, \text{WaveSecret})$. Der Hash lässt keine Rückschlüsse auf das Endgerät zu.

### 7.3 Schutz vor Schul-Pranger (Verwaltungs- & Persönlichkeitsrecht)
* Öffentliche Rankings („Die 10 schlechtesten Schulen NRWs“) sind rechtlich und pädagogisch unzulässig, da sie Schulen stigmatisieren und Anreize zur Manipulation schaffen.
* **Rollenbasiertes Sichtbarkeitsmodell:**
  * **Öffentlichkeit / Schüler:innen:** Landes- und Kreisebene aggregiert; Einzelschule nur die eigene Schule.
  * **Schulleitung & SV:** Eigene Schule im Vergleich zum Landesdurchschnitt der gleichen Schulform.
  * **Ministerium / Schulaufsicht:** Vollständige aggregierte Landeskarte (ab $k \ge 10$) zur gezielten Ressourcenallokation.

### 7.4 Fürsorge & Krisenintervention
* Moodmap ist ein Stimmungsbarometer und **kein Notfallmeldesystem**. Um falsche Rettungserwartungen auszuschließen, verspricht das System zu keinem Zeitpunkt individuelles Eingreifen.
* Bei kritischen Selbsteinschätzungen (z. B. zu Mobbing oder seelischem Wohlbefinden) blendet die Anwendung automatisch die Kontaktdaten bundesweiter und regionaler Hilfsdienste ein (*Nummer gegen Kummer 116 111, Krisenchat.de, Schulpsychologischer Dienst NRW*).

---

## 8. Konkrete Implementierungs-Vorgaben für Agenten

| Agent-Rolle | Zuständigkeit | Konkrete Implementierungs-Aufgabe |
|---|---|---|
| **`data`** (Backend) | Datenmodell, Views, SQL | • Aggregations-Views implementieren, die $k \ge 10$ serverseitig erzwingen.<br>• Felder `n`, `score`, `delta` und `confidence` (`low` bei $10 \le n < 30$, `robust` bei $n \ge 30$) bereitstellen.<br>• Schul-Stammdaten mit Schülerschaftszahlen aus Open Data NRW verknüpfen. |
| **`qa`** (Algorithmen & Tests) | `src/lib/score.ts`, Seed | • Unit-Tests für Grenzfälle implementieren: $n=9$ vs. $n=10$, $n=29$ vs. $n=30$.<br>• Trend-Bonus-Logik und Driver-Zerlegung mit deterministischen Test-Fixtures absichern.<br>• Seed-Generator (`generate-seed.ts`) anpassen, sodass realistische Normalverteilungen und soziologisch plausible Hotspots entstehen. |
| **`fe` / `map`** (UI & Karten) | Charts, MapLibre, UI-Tokens | • Visualisierung von Konfidenzen: Schraffur / Dotted Outline für Gebiete mit $10 \le n < 30$.<br>• Detail-Panel: Anzeige der Top-2 Drivers bei Hotspots.<br>• Notfall-Hilfe-Banner (`Nummer gegen Kummer`) im Survey-Flow verankern.<br>• Kennzeichnung „Freiwillige anonyme Befragung nach § 120 SchulG NRW“ im Footer. |
| **`lead`** (Architektur & Pitch) | Storyline & Gesamtintegration | • Zahlen aus dem Deutschen Schulbarometer 2026 und Shell 2024 in den Pitch einbinden.<br>• Den Begriff „Prävention durch Dialog“ anhand der Entfremdungstheorie und der Frankreich-Recherche als stärkstes Jury-Argument etablieren. |
