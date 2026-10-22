import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { K_MIN } from '@/lib/env';
import { HOTSPOT, TENSION_THRESHOLDS, TENSION_WEIGHTS } from '@/lib/score';

const SOURCES = [
  {
    id: 'oecd-pisa-2022',
    label:
      'OECD (2023): PISA 2022 Results (Volume II) – Learning During – and From – Disruption. Kapitel zu Wohlbefinden, Zugehörigkeit und Schulsicherheit.',
    href: 'https://www.oecd.org/en/publications/pisa-2022-results-volume-ii_a97db61c-en.html',
  },
  {
    id: 'hbsc-2022',
    label:
      'WHO/Europe (2023): A focus on adolescent mental health and well-being in Europe, central Asia and Canada. HBSC 2021/2022, Volume 1.',
    href: 'https://www.who.int/europe/publications/i/item/9789289060356',
  },
  {
    id: 'wang-degol-2016',
    label:
      'Wang, M.-T. & Degol, J. L. (2016): School Climate: a Review of the Construct, Measurement, and Impact on Student Outcomes. Educational Psychology Review, 28, 315–352.',
    href: 'https://doi.org/10.1007/s10648-015-9319-1',
  },
  {
    id: 'deci-ryan-2000',
    label:
      'Deci, E. L. & Ryan, R. M. (2000): The “What” and “Why” of Goal Pursuits: Human Needs and the Self-Determination of Behavior. Psychological Inquiry, 11(4), 227–268.',
    href: 'https://doi.org/10.1207/S15327965PLI1104_01',
  },
  {
    id: 'likert-1932',
    label:
      'Likert, R. (1932): A Technique for the Measurement of Attitudes. Archives of Psychology, 22(140), 5–55.',
  },
  {
    id: 'jamieson-2004',
    label: 'Jamieson, S. (2004): Likert Scales: How to (Ab)use Them. Medical Education, 38(12), 1217–1218.',
    href: 'https://doi.org/10.1111/j.1365-2929.2004.02012.x',
  },
  {
    id: 'sweeney-2002',
    label:
      'Sweeney, L. (2002): k-Anonymity: A Model for Protecting Privacy. International Journal of Uncertainty, Fuzziness and Knowledge-Based Systems, 10(5), 557–570.',
    href: 'https://doi.org/10.1142/S0218488502001648',
  },
  {
    id: 'robinson-1950',
    label:
      'Robinson, W. S. (1950): Ecological Correlations and the Behavior of Individuals. American Sociological Review, 15(3), 351–357.',
    href: 'https://doi.org/10.2307/2087176',
  },
  {
    id: 'groves-peytcheva-2008',
    label:
      'Groves, R. M. & Peytcheva, E. (2008): The Impact of Nonresponse Rates on Nonresponse Bias. Public Opinion Quarterly, 72(2), 167–189.',
    href: 'https://doi.org/10.1093/poq/nfn011',
  },
] as const;

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <code className="block overflow-x-auto rounded-lg bg-subtle px-3 py-2 text-xs leading-relaxed text-fg">
      {children}
    </code>
  );
}

/** Öffentliche Methodik: Rechenwege, Grenzen und Forschungsbezug. */
export function MethodologyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header>
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
          <ArrowLeft className="size-4" aria-hidden /> Zurück zum Lagebild
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Methodik & Quellen</h1>
        <p className="mt-2 text-muted">
          Wie aus anonymen Antworten Kennzahlen werden – nachvollziehbar, mit Grenzen und ohne diagnostische
          oder kausale Aussagen.
        </p>
        <p className="mt-1 text-xs text-muted">
          Stand: Oktober 2026 · Berechnung und Darstellung werden versioniert.
        </p>
      </header>

      <section className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">1. Datengrundlage</h2>
        <p className="text-sm leading-relaxed">
          Das Lagebild nutzt ausschließlich Antworten aus der laufenden anonymen Befragung. Jede Teilnahme ist
          einer Schule und einer Kalenderwoche zugeordnet. Es werden keine Namen, E-Mail-Adressen oder
          IP-Adressen gespeichert; die Doppelteilnahme-Sperre nutzt einen gehashten Geräte-Token.
          Teststandorte (`is_test`) und Demo-Modus sind von den öffentlichen Auswertungen ausgeschlossen.
        </p>
        <p className="text-sm leading-relaxed">
          Die Stichprobe ist <strong>keine Zufallsstichprobe</strong>. Wer teilnimmt, entscheidet selbst;
          Schulen und Klassen nehmen unterschiedlich stark teil. Die Werte beschreiben die teilnehmenden
          Antworten, nicht alle Schüler:innen in NRW.
        </p>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">2. Antworten und Score</h2>
        <p className="text-sm leading-relaxed">
          Die Kernfragen nutzen eine 5er-Skala. „Weiß nicht“ und übersprungene Fragen werden nicht gewertet.
          Swipe-Aussagen sind binär (stimmt / stimmt nicht) und werden mit halbem Gewicht einbezogen.
          Auswahlfragen dienen der Verteilung und gehen nicht in den Score ein.
        </p>
        <Formula>mood5: Punkte = (Antwort − 1) × 25 → 0, 25, 50, 75, 100</Formula>
        <Formula>swipe: Zustimmung = 100, Ablehnung = 0; Gewicht = 0,5</Formula>
        <Formula>invertiert: Punkte = 100 − Punkte</Formula>
        <p className="text-sm leading-relaxed">
          Der Themenscore ist der <strong>gewichtete Mittelwert</strong> aller gewerteten Antworten zu diesem
          Thema. `n` ist die Zahl unterschiedlicher Teilnahmen mit mindestens einer gewerteten Antwort – nicht
          die Zahl der Einzelantworten.
        </p>
        <Formula>Score(Thema) = Σ(Punkte × Gewicht) / Σ(Gewicht)</Formula>
        <p className="text-sm leading-relaxed">
          Der Gesamt-Mood ist der ungewichtete Mittelwert der Themenscores, die mindestens {K_MIN} Teilnahmen
          haben. `overall` zählt dabei als eigenes Thema. Themen unter der Schwelle verzerren den Gesamtwert
          nicht.
        </p>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">3. Mindestzahl, Verteilung und Trend</h2>
        <p className="text-sm leading-relaxed">
          Unter <strong>{K_MIN} Teilnahmen</strong> zeigen wir keine Werte („zu wenige Daten“). Das ist eine
          Schutz- und Robustheitsregel, keine statistische Signifikanzprüfung. Sie reduziert die Offenlegung
          kleiner Gruppen und verhindert, dass einzelne Stimmen als Gruppenwert erscheinen.
        </p>
        <p className="text-sm leading-relaxed">
          Verteilungen zählen nur gültige 5er-Antworten, gedreht bei invertierten Fragen. Prozentwerte werden
          mit dem Hare-Niemeyer-Verfahren auf ganze Zahlen verteilt, damit die Summe exakt 100 % ergibt.
          „Unzufrieden“ = Stufe 1 + 2, „zufrieden“ = Stufe 4 + 5.
        </p>
        <p className="text-sm leading-relaxed">
          Δ zur Vorwoche ist die Differenz der beiden Scores. Er wird nur gezeigt, wenn beide Perioden
          mindestens {K_MIN} Teilnahmen haben. Es sind <strong>nicht dieselben Personen</strong>;
          Veränderungen können daher auch durch eine andere Zusammensetzung der Teilnehmenden entstehen.
        </p>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">4. Brennpunkte und Spannungs-Index</h2>
        <p className="text-sm leading-relaxed">
          Ein Thema ist ein Brennpunkt, wenn bei n ≥ {HOTSPOT.minN} der Score unter {HOTSPOT.scoreBelow} liegt
          oder der Trend um mindestens {Math.abs(HOTSPOT.deltaAtMost)} Punkte fällt. Im Dashboard werden die
          Brennpunkte nach der <em>absoluten Zahl</em> unzufriedener Stimmen sortiert – viele Betroffene
          wiegen damit schwerer als ein kleiner, aber extrem negativer Jahrgang.
        </p>
        <p className="text-sm leading-relaxed">
          Der Frühwarn-Radar ist ein zusätzlicher Orientierungswert, kein Diagnoseinstrument. Er gewichtet die
          Themen{' '}
          {Object.entries(TENSION_WEIGHTS)
            .map(([k, v]) => `${k} ${v}`)
            .join(', ')}
          . Voraussetzung sind das Thema Stimme/Gehört-werden und mindestens zwei weitere Themen mit
          ausreichend Daten. Ab {TENSION_THRESHOLDS.watch} heißt die Stufe „beobachten“, ab{' '}
          {TENSION_THRESHOLDS.talk} „ins Gespräch kommen“.
        </p>
        <Formula>Spannung = 100 − gewichteter Mittelwert der Themenscores (+10 bei 3-Wellen-Abfall)</Formula>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">5. Forschungsbezug</h2>
        <p className="text-sm leading-relaxed">
          Die Auswahl der Dimensionen orientiert sich an Forschung zu Schulklima, Wohlbefinden und
          Selbstbestimmung. Die Quellen begründen die Themen und die Grenzen der Interpretation; sie
          validieren nicht den konkreten Moodmap-Index als Messinstrument.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            Schulklima ist multidimensional; Sicherheit, Beziehungen, Unterricht und Umwelt sollten getrennt
            betrachtet werden (Wang &amp; Degol, 2016).
          </li>
          <li>
            Zugehörigkeit und Sicherheit hängen mit Wohlbefinden zusammen; PISA 2022 zeigt diese Zusammenhänge
            für 15-Jährige (OECD, 2023).
          </li>
          <li>
            HBSC erhebt Gesundheit und Wohlbefinden von 11-, 13- und 15-Jährigen im Schulkontext und liefert
            Vergleichspunkte für Jugendgesundheit (WHO/Europe, 2023).
          </li>
          <li>
            Autonomie, Kompetenzerleben und soziale Eingebundenheit sind zentrale psychologische
            Grundbedürfnisse (Deci &amp; Ryan, 2000) – sie motivieren die Themen „Gehört werden“ und
            „Gemeinschaft“.
          </li>
          <li>
            Likert-Antworten werden hier als Punkte auf einer Skala behandelt. Das ist eine pragmatische
            Annahme; Abstände zwischen den Stufen sind nicht automatisch gleich (Likert, 1932; Jamieson,
            2004).
          </li>
          <li>
            Kleine Fallzahlen werden unterdrückt, um Offenlegung zu begrenzen (k-Anonymität; Sweeney, 2002).
            Die konkrete Schwelle {K_MIN} ist eine Produktentscheidung, kein universeller wissenschaftlicher
            Standard.
          </li>
          <li>
            Aggregierte Flächen dürfen nicht als Aussagen über jede einzelne Person gelesen werden
            (ökologischer Fehlschluss; Robinson, 1950).
          </li>
          <li>
            Selbstselektion und unterschiedliche Antwortquoten können Ergebnisse verzerren; eine hohe Quote
            allein garantiert keine Repräsentativität (Groves &amp; Peytcheva, 2008).
          </li>
        </ul>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">6. Was die Zahlen nicht sind</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          <li>Kein repräsentatives Stimmungsbild aller Schulen in NRW.</li>
          <li>Keine Diagnose, kein Screening und kein Ersatz für schulpsychologische Beratung.</li>
          <li>Kein kausaler Nachweis, dass ein Thema eine bestimmte Entwicklung verursacht.</li>
          <li>Keine Aussage über einzelne Personen oder kleine Gruppen unter der Mindestzahl.</li>
        </ul>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">7. Quellen</h2>
        <ol className="space-y-3 text-sm leading-relaxed">
          {SOURCES.map((source) => (
            <li key={source.id} className="flex gap-2">
              <span className="text-muted tabular-nums">[{SOURCES.indexOf(source) + 1}]</span>
              <span>
                {source.label}
                {'href' in source && source.href && (
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 inline-flex items-center gap-0.5 text-accent underline"
                  >
                    Quelle öffnen <ExternalLink className="size-3" aria-hidden />
                  </a>
                )}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted">
          Die Liste wird bei methodischen Änderungen aktualisiert. Berechnungen und Schwellen sind zusätzlich
          in `src/lib/score.ts` und den Supabase-Migrationen dokumentiert.
        </p>
      </section>
    </article>
  );
}
