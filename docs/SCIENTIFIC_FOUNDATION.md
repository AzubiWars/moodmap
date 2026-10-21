# Wissenschaftliches Fundament & Methodik – Moodmap NRW

> **Zweck dieses Dokuments:**  
> Dieses Dokument definiert die theoretische, statistische und methodische Grundlage für Moodmap NRW. Es dient dem gesamten Entwickler-Team (Lead, Frontend, Backend/Data, QA) als Referenz, um Algorithmen, Aggregationen, Seed-Generatoren und Datenvisualisierungen wissenschaftlich fundiert, pädagogisch zielführend und rechtlich reflektiert aufzubauen.

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
  Um intuitive Interpretierbarkeit (0 = maximale Unzufriedenheit / Belastung, 100 = maximale Zufriedenheit / Wohlbefinden) über heterogene Zielgruppen (Schüler:innen, Lehrkräfte, Politik) hinweg zu gewährleisten, wird die ordinale 5-Stufen-Skala metrisiert (analog zum Vorgehen des *WHO-5 Well-Being Index*):
  
  $$P(v) = (v - 1) \cdot 25 \quad \text{für } v \in \{1, 2, 3, 4, 5\}$$
  
  * Stufe 1: ⛈️ 😫 (Gewitter / stark unzufrieden, Rot / Accent) $\rightarrow 0$ Punkte
  * Stufe 2: 🌧️ 😕 (Regen / unzufrieden, Orange / Warm) $\rightarrow 25$ Punkte
  * Stufe 3: ⛅ 😐 (Bewölkt / teils-teils, Gelb / Neutral) $\rightarrow 50$ Punkte
  * Stufe 4: 🌤️ 🙂 (Sonne & Wolken / zufrieden, Hellblau / Milde) $\rightarrow 75$ Punkte
  * Stufe 5: ☀️ 🤩 (Sonne / sehr zufrieden, Blau / Positiv) $\rightarrow 100$ Punkte
  
  *(Farbpalette orientiert sich an `docs/DESIGN.md` und `src/lib/colors.ts`: barrierefrei und farbfehlsichtigkeits-freundlich gestaltet ohne klassisches Rot-Grün).*

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

### 3.1 Das Zusammenspiel von $k$-Anonymität und statistischer Stichprobengröße
Es wird methodisch zwischen zwei Schwellenwerten unterschieden:
1. **Entwurfsentscheidung zum Re-Identifikationsschutz ($k \ge 10$):**  
   Um jegliches Re-Identifizierungsrisiko in kleinen Schulumgebungen praxistauglich zu minimieren, folgt Moodmap dem Prinzip der $k$-Anonymität ($k \ge 10$). Liegen für eine Auswertungseinheit weniger als 10 Antworten vor, erfolgt **keine Score-Berechnung oder aggregierte Detailanzeige** (`score = null`, `status: suppressed`).
2. **Statistische Faustregel für Stichprobengrößen ($n \ge 30$):**  
   Gemäß dem *Zentralen Grenzwertsatz (Central Limit Theorem)* gilt $n \approx 30$ in der empirischen Sozialforschung als pragmatische Faustregel, ab der sich der Stichprobenmittelwert einer Normalverteilung annähert, wodurch Konfidenzintervalle hinreichend eng werden.

### 3.2 Standardfehler und Konfidenzintervalle
Unter Annahme einer exemplarischen Standardabweichung auf Schulebene von $\sigma \approx 25$ Punkten errechnet sich der Standardfehler ($SE$) und das 95%-Konfidenzintervall ($CI_{95\%} = \pm 1.96 \cdot SE$):

| Fallzahl $n$ | Standardfehler $SE = \frac{\sigma}{\sqrt{n}}$ | 95%-Konfidenzintervall ($CI_{95\%}$) | Methodische Einstufung | UI-Darstellung (Design-Empfehlung) |
|---|---|---|---|---|
| **$n < 10$** | $> 7.9$ | $> \pm 15.5$ Punkte | **Unterdrückt (Anonymitätsschutz)** | Ausgegraut, Status „Zu wenige Daten“ |
| **$10 \le n < 30$** | $4.6 \dots 7.9$ | $\pm 9.0 \dots \pm 15.5$ Punkte | **Geringe Fallzahl (Orientierungswert)** | Regulärer Score, optional als vorläufig gekennzeichnet |
| **$30 \le n < 100$** | $2.5 \dots 4.5$ | $\pm 4.9 \dots \pm 8.9$ Punkte | **Statistisch robust** | Standard-Farbfläche |
| **$n \ge 100$** | $\le 2.5$ | $\le \pm 4.9$ Punkte | **Hohe Präzision** | Hohe Verlässlichkeit |

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

### 5.1 Theoretischer Hintergrund: Soziale Entfremdung & dialogorientierte Prävention
Der *Spannungs-Index (Tension Index)* dient als theoriegeleiteter Indikator für Dialog- und Unterstützungsbedarf an Schulen. Er soll Schulleitungen und Bildungsadministration frühzeitig signalisieren, wo Jugendliche das Gefühl verloren haben, gehört zu werden oder das Schulklima als belastend empfinden. Die theoretische Motivation stützt sich auf etablierte soziologische Ansätze:
* **Entfremdungstheorie (Melvin Seeman, 1959):** Fünf Dimensionen der Entfremdung – insbesondere *Machtlosigkeit (Powerlessness)* und *Bedeutungslosigkeit (Meaninglessness)*. Ein Mangel an wahrgenommener Selbstwirksamkeit und Partizipation begünstigt Rückzug, Resignation und Frustration.
* **Theorie der sozialen Desintegration (Wilhelm Heitmeyer, 1997):** Das Fehlen emotionaler, sozialer und institutioneller Anerkennung schwächt das Gemeinschaftsgefühl und erhöht Spannungen im Gruppenkontext.
* **Social Bond Theory (Travis Hirschi, 1969):** Eine gelebte Bindung an die Institution Schule (Vertrauen in Bezugspersonen, Mitsprache, Sicherheit) stärkt Resilienz und prosoziales Verhalten.

> [!IMPORTANT]
> **Leitprinzip gemäß `docs/PRIVACY.md` §7:**  
> Moodmap erstellt **keine Prognosen über Kriminalität oder Gewalt** und kategorisiert Schüler:innen nicht in Gefährdungsprofile. Der Spannungs-Index ist kein Überwachungsinstrument, sondern ein **Barometer für Dialog- und Unterstützungsbedarf**, das der Prämisse *„Prävention durch Dialog“* folgt.

### 5.2 Mathematische Formulierung des Spannungs-Index ($T$)

Der Index bewegt sich auf einer Skala von $0$ (sehr entspanntes, positives Klima) bis $100$ (hoher Handlungs- und Dialogbedarf). Die Gewichte sind theoriegeleitete, heuristische Startwerte und keine empirisch kalibrierten Regressionskoeffizienten.

#### 1. Themenauswahl & Heuristische Gewichtung
Die Indikatoren spiegeln zentrale Aspekte des Schulklimas wider:

| Thema | Slug | Gewicht $w_t$ | Theoretische Begründung |
|---|---|---|---|
| **Gehört werden** | `voice` | **0.30** | Zentraler Hebel: Erlebte Selbstwirksamkeit vs. institutionelle Ohnmacht |
| **Sicherheit & Mobbing** | `safety` | **0.20** | Physische und psychische Unversehrtheit im Sozialraum Schule |
| **Gemeinschaft & Klima** | `community` | **0.15** | Peer-Group-Zusammenhalt und Schulkultur |
| **Seelisches Wohlbefinden** | `wellbeing` | **0.15** | Allgemeiner Wohlbefindens- und Belastungsgrad |
| **Mitsprache** | `participation` | **0.10** | Institutionalisierte Mitwirkungsmöglichkeiten (§ 74 SchulG NRW) |
| **Verhältnis zu Lehrkräften** | `teachers` | **0.10** | Vertrauen in pädagogische Ansprechpersonen |

#### 2. Roh-Spannungsindex ($T_{\text{raw}}$)
Liegen für eine Schule oder Region nicht alle Themen mit $n \ge K_{\text{MIN}}$ vor, werden die vorhandenen Gewichte normiert (Bedingung: `voice` + mindestens zwei weitere Themen liegen vor):

$$T_{\text{raw}} = 100 - \frac{\sum_{t \in T_{\text{obs}}} w_t \cdot S_t}{\sum_{t \in T_{\text{obs}}} w_t}$$

#### 3. Dynamische Drift-Erkennung (CUSUM-Prinzip)
Statische Querschnitte erfassen nur Momentaufnahmen. Eine kontinuierliche Stimmungsverschlechterung über mehrere Erhebungswellen hinweg signalisiert verfestigte Problemlagen.
* **Referenz-Spezifikation (`docs/ARCHITECTURE.md` §5.8):**  
  Die Basis-Trendberechnung basiert auf der Differenz zur Vorwelle ($\Delta S = S_{\text{aktuell}} - S_{\text{vorher}}$).
* **Heuristische Verfeinerung für das Frühwarn-Radar:**  
  Fällt der Stimmungs-Score in Kernbereichen (`voice` oder `safety`) über drei aufeinanderfolgende Erhebungswellen signifikant ab (z. B. $\Delta S_t \le -3$ Punkte pro Welle), kann ein dynamischer Trend-Aufschlag von $+10$ Punkten vergeben werden:

$$T = \min\left(100, \, T_{\text{raw}} + T_{\text{trend\_bonus}}\right)$$

#### 4. Kategoriale Schwellenwerte
* **$T < 45$ (`stable`):** Positives Schulklima. Keine akuten Dialogbedarfe erkennbar.
* **$45 \le T < 60$ (`watch`):** Erhöhte Irritation. Empfehlung: Aufmerksamkeit schärfen, SV-Themen ansprechen.
* **$T \ge 60$ (`talk`):** **Frühwarnung.** Konkreter Unterstützungsbedarf. Empfehlung: Proaktiver Dialog von Schulleitung, SV und Schulsozialarbeit.

#### 5. Driver-Attribution (Ursachenidentifikation)
Um passgenaue Maßnahmen zu ermöglichen, berechnet das System die Haupttreiber (*Drivers*) des Handlungsbedarfs:

$$D_t = w_t \cdot (100 - S_t)$$

Die Themen mit den höchsten $D_t$-Werten erklären den größten Anteil am Handlungsdruck und geben Schulen konkrete Ansatzpunkte für den Dialog (z. B. gezielte SV-Gespräche zu Toilettenzuständen oder Prüfungsdruck).

---

## 6. Kausalitätsisolierung bei „Politik antwortet“

Reagiert die Politik auf einen Frust-Hotspot mit einer Veröffentlichung (z. B. Zusage für Schulsozialarbeit oder Dialogtermine), misst Moodmap die Resonanz.

### 6.1 Direkte Resonanz
* Schüler:innen bewerten die Antwort direkt auf dem Danke-Screen (`mood5`: „Hilft dir das?“).
* Aggregation erfolgt ab $k \ge 10$ gehashten Bewertungen.

### 6.2 Quasi-experimentelle Wirkungsmessung (Difference-in-Differences)
Um zu beobachten, wie sich eine Stimmungsverbesserung in einer Region im zeitlichen Umfeld einer politischen Maßnahme verhält (unter Kontrolle überregionaler Einflüsse wie Ferienbeginn oder Saison), verwendet das System einen vereinfachten **Difference-in-Differences (DiD)** Ansatz:

$$\text{Effekt} = \left(S_{\text{Region, post}} - S_{\text{Region, pre}}\right) - \left(S_{\text{Landesweit, post}} - S_{\text{Landesweit, pre}}\right)$$

Ein Wert $\text{Effekt} > 0$ deutet darauf hin, dass die gezielte Maßnahme der Region über den allgemeinen landesweiten Trend hinaus mit einer überdurchschnittlichen Stimmungsaufhellung korrespondiert. In einem späteren Produktivbetrieb sollte dieser deskriptive Trendindikator durch inferenzstatistische Panelanalysen oder Standardfehler-Bootstrapping methodisch untermauert werden.

---

## 7. Rechtliche Leitplanken („Privacy by Design“)

### 7.1 Schulgesetzlicher Rahmen (z. B. § 120 Abs. 4 SchulG NRW & BASS 10-45 Nr. 2)
Befragungen an Schulen unterliegen im deutschen Schulrecht strengen Vorgaben (u. a. Erlass „Wissenschaftliche Untersuchungen und Befragungen an Schulen“, BASS 10-45 Nr. 2):
1. **Keine Beeinträchtigung des Unterrichts:** Durch die Begrenzung auf einen ultrakurzen Puls (60 Sekunden) kann die Befragung flexibel in Pausen, Freistunden oder in der Schülervertretungsarbeit stattfinden.
2. **Absolute Freiwilligkeit:** Die Teilnahme ist vollkommen freiwillig und darf an keinerlei Benachteiligung oder Bevorzugung gekoppelt sein.
3. **Anonymität als Grundvoraussetzung:** Es dürfen zu keinem Zeitpunkt Rückschlüsse auf einzelne Personen möglich sein.
4. **Projektstatus & Legitimation:** Moodmap ist ein studentischer Prototyp im Hackathon-Kontext. Als Zielbild für einen späteren Echtbetrieb ist eine Trägerschaft durch das Ministerium für Schule und Bildung (MSB NRW) in Kooperation mit den gewählten Schülervertretungen (§ 74 SchulG NRW) denkbar, vorbehaltlich ministerieller Genehmigung.

### 7.2 Anonymität nach DSGVO (ErwGr. 26 DSGVO)
* **Zielsetzung:** Nach Erwägungsgrund 26 der DSGVO finden die Grundsätze des Datenschutzes keine Anwendung auf Informationen, die sich nicht auf eine identifizierte oder identifizierbare natürliche Person beziehen (echte Anonymität). Im Echtbetrieb ist dies durch behördliche Datenschutzbeauftragte und eine Datenschutz-Folgenabschätzung (DSFA) formal zu prüfen.
* **Architektonische Maßnahmen zur Re-Identifikationsvermeidung:**
  * Keine Erfassung oder Persistierung von IP-Adressen (vollständiger Verzicht bereits auf Netzwerkebene).
  * Kein User-Agent-Logging, kein Canvas-Fingerprinting.
  * Keine Freitextfelder im regulären Survey (vollständiger Ausschluss von PII und Klarnamen).
  * Datumsstempel werden tagesgenau gehasht bzw. gerundet.
  * Verhinderung von Mehrfachteilnahmen über kryptographische Einweg-Hashes:  
    $\text{DeviceHash} = \text{SHA256}(\text{ClientToken} \,\|\, \text{WaveId})$. Da Geräte-Hashes rechtlich im Grenzbereich von pseudonymen Daten diskutiert werden können, speichert das System keinerlei Verknüpfungstabellen zu echten Nutzerprofilen.

### 7.3 Schutz vor Schul-Pranger (Pädagogisches & organisatorisches Prinzip)
* Öffentliche Rankings („Die schlechtesten Schulen des Landes“) sind pädagogisch hochgradig kontraproduktiv, erzeugen Stigmatisierung und falsche Anreize zur Datenverzerrung.
* **Differenziertes Rollen- und Sichtbarkeitsmodell:**
  * **Öffentlichkeit / Schüler:innen:** Landes- und Kreisebene aggregiert; Einzelschule nur die eigene Schule über Code.
  * **Schulleitung & SV:** Eigene Schule im Vergleich zum aggregierten Landesmittelwert der gleichen Schulform.
  * **Schulaufsicht / Ministerium:** Aggregierte Übersicht (ab $k \ge 10$) zur bedarfsgerechten Mittel- und Unterstützungsplanung.

### 7.4 Fürsorge & Krisenintervention
* Moodmap ist ein Stimmungsbarometer und **kein Notfallmeldesystem**. Um falsche Rettungserwartungen auszuschließen, verspricht das System zu keinem Zeitpunkt individuelles Eingreifen.
* Bei kritischen Selbsteinschätzungen (z. B. zu Mobbing oder seelischem Wohlbefinden) blendet die Anwendung automatisch die Kontaktdaten bundesweiter und regionaler Hilfsdienste ein (*Nummer gegen Kummer 116 111, Krisenchat.de, Schulpsychologischer Dienst NRW*).

---

## 8. Methodische Empfehlungen & P2-Diskussionsbeiträge für das Team

Die verbindliche Feature- und Task-Planung verbleibt zentral in den GitHub Issues und `docs/ROADMAP.md`. Folgende Punkte dienen den jeweiligen Agenten-Rollen als wissenschaftliche Orientierung:

| Agent-Rolle | Relevanter Bereich | Methodische Orientierung / Diskussionsbeiträge |
|---|---|---|
| **`data`** (Backend) | Datenmodell & Aggregation | • Sicherstellung serverseitiger Filterung für $k \ge 10$.<br>• Unterdrückung von Kleinst-Antwortmustern ($< 3$ Antworten je Option $\rightarrow \text{null}$) zum Schutz vor Differenzangriffen.<br>• *P2-Vorschlag:* Bereitstellung eines abgeleiteten Indikator-Feldes `confidence` (`low` bei $10 \le n < 30$, `robust` bei $n \ge 30$). |
| **`qa`** (Algorithmen & Tests) | `src/lib/score.ts`, Seed | • Unit-Tests für Grenzfälle bei Schwellen ($n=9$ vs. $n=10$, $n=29$ vs. $n=30$).<br>• Trend-Logik und Driver-Zerlegung mit deterministischen Testfällen absichern.<br>• Seed-Generator (`generate-seed.ts`) auf soziologisch plausible Verteilungen abstimmen. |
| **`fe` / `map`** (UI & Karten) | Charts, MapLibre, UI-Tokens | • Barrierefreie Farbskala nach `docs/DESIGN.md` (Wetterstufen ⛈️ bis ☀️, Rot/Gelb/Blau).<br>• *P2-Vorschlag:* Dezente visuelle Kennzeichnung für Regionen/Schulen mit geringer Fallzahl ($10 \le n < 30$, z. B. Dotted Border / `~`).<br>• Notfall-Hilfe-Hinweis (`Nummer gegen Kummer`) bei kritischen Scores. *(Keine statischen Rechtsbehauptungen oder Paragraphen im UI-Footer).* |
| **`lead`** (Architektur & Pitch) | Storyline & Gesamtintegration | • Zahlen aus dem Deutschen Schulbarometer 2025/2026 und der 19. Shell Jugendstudie 2024 für Problem-Validierung nutzen.<br>• Kernbotschaft: „Prävention durch Dialog“ (Entfremdung früh erkennen, bevor Resignation entsteht). |
