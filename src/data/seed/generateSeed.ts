/**
 * Pure, deterministic seed generator for synthetic survey responses (#8).
 * Generates realistic student responses across 10 waves adhering to
 * docs/ARCHITECTURE.md §7 and docs/SCIENTIFIC_FOUNDATION.md.
 */
import { P0_TOPIC_SLUGS, QUESTIONS, QUESTIONS_BY_ID } from '../topics.ts';
import type { PolicyAnswer } from '../../types/dialog.ts';
import type { GradeBand, Role, School, SchoolForm, Wave } from '../../types/domain.ts';
import type { SeedData, SeedResponse } from '../../types/seed.ts';
import type { AnswerInput } from '../../types/survey.ts';
import { createRandom } from '../../lib/random.ts';

export const DEFAULT_SEED = 424242;
export const DEFAULT_WAVE_COUNT = 10;
export const LAST_WAVE_ID = '2026-W43';

// Target Hotspot districts for the pitch story
export const HOTSPOT_TENSION_KREIS = '05562'; // Kreis Recklinghausen: Spannungs-Index -> 'talk'
export const HOTSPOT_CANCELLATION_KREIS = '05112'; // Duisburg: starker Unterrichtsausfall
export const RURAL_KREISE = new Set(['05762', '05366', '05966']); // Höxter, Euskirchen, Olpe: digital schwächer
export const METROPOL_KREISE = new Set(['05111', '05315']); // Düsseldorf, Köln: digital stärker

const SWIPES_BY_TOPIC = new Map(
  P0_TOPIC_SLUGS.map((slug) => [
    slug,
    QUESTIONS.filter(
      (q) => q.topicSlug === slug && q.type === 'swipe' && (!q.audience || q.audience === 'student'),
    ),
  ]),
);

/** Montag (UTC) der ISO-Woche `week` im Jahr `year`. */
export function isoWeekMonday(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Weekday = (jan4.getUTCDay() + 6) % 7; // Mo = 0
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Weekday + (week - 1) * 7);
  return monday;
}

/** ISO-Wochen-ID (z. B. `2026-W44`) des Tages, in dem `date` liegt. */
export function isoWeekId(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Generates ISO waves (Mo 00:00 – So 23:59:59 UTC) ending at `lastWaveId`. */
export function generateWaves(count = DEFAULT_WAVE_COUNT, lastWaveId = LAST_WAVE_ID): Wave[] {
  const match = /^(\d{4})-W(\d{2})$/.exec(lastWaveId);
  if (!match) throw new Error(`Ungültige letzte Welle: ${lastWaveId}`);
  const lastMonday = isoWeekMonday(Number(match[1]), Number(match[2]));
  const waves: Wave[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(lastMonday);
    start.setUTCDate(lastMonday.getUTCDate() - i * 7);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 0);
    waves.push({
      id: isoWeekId(start),
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
    });
  }
  return waves;
}

/** Generates realistic PolicyAnswers matching the pitch story */
export function generatePolicyAnswers(): PolicyAnswer[] {
  return [
    {
      id: 'pol-01',
      topic: 'voice',
      scope: 'kreis',
      regionId: HOTSPOT_TENSION_KREIS,
      title: 'Schulministerin lädt Schülervertretungen des Kreises zum Dialoggipfel ein',
      body: 'Wir haben euren Frust über mangelnde Mitwirkung gehört. Nächste Woche treffen sich die SV-Sprecher:innen des Kreises Recklinghausen direkt mit der Schulaufsicht und dem Ministerium, um konkrete Maßnahmen zu vereinbaren.',
      status: 'planned',
      publishedAt: '2026-10-18',
      resonance: {
        n: 48,
        score: 82,
      },
      topicDeltaSincePublished: 8.5,
    },
    {
      id: 'pol-02',
      topic: 'cancellation',
      scope: 'kreis',
      regionId: HOTSPOT_CANCELLATION_KREIS,
      title: 'Sofortprogramm mobile Vertretungslehrkräfte für Duisburg',
      body: 'Um den akuten Unterrichtsausfall an weiterführenden Schulen abzufedern, entsendet die Bezirksregierung ab sofort einen mobilen Vertretungspool aus 15 Lehrkräften.',
      status: 'done',
      publishedAt: '2026-10-12',
      resonance: {
        n: 64,
        score: 71,
      },
      topicDeltaSincePublished: 6.2,
    },
    {
      id: 'pol-03',
      topic: 'ai',
      scope: 'nrw',
      regionId: null,
      title: 'Landesweiter Leitfaden und Schüler-Workshops für KI im Unterricht',
      body: 'Schluss mit der Verunsicherung: Das Schulministerium veröffentlicht transparente Richtlinien für den didaktischen Einsatz von generativer KI bei Hausaufgaben und Prüfungen.',
      status: 'reviewing',
      publishedAt: '2026-10-15',
      resonance: {
        n: 142,
        score: 76,
      },
      topicDeltaSincePublished: 3.8,
    },
    {
      id: 'pol-04',
      topic: 'building',
      scope: 'nrw',
      regionId: null,
      title: 'Schulsanierungsfonds NRW: Sonderprogramm für Schultoiletten aufgestockt',
      body: 'Das Land stellt zusätzliche 50 Millionen Euro bereit, die Schulträger unbürokratisch für die Sanierung maroder Sanitäranlagen abrufen können.',
      status: 'planned',
      publishedAt: '2026-10-19',
      resonance: {
        n: 95,
        score: 80,
      },
      topicDeltaSincePublished: null,
    },
    {
      id: 'pol-05',
      topic: 'stress',
      scope: 'kreis',
      regionId: '05913', // Dortmund
      title: 'Pilotprojekt: Klausurenfreie Erholungswoche in der Sekundarstufe II',
      body: 'Gemeinsam mit der Bezirksschülervertretung Dortmund testen drei Gesamtschulen und Gymnasien eine Entzerrung der Klausurenphasen.',
      status: 'listening',
      publishedAt: '2026-10-16',
      resonance: {
        n: 38,
        score: 84,
      },
      topicDeltaSincePublished: 4.1,
    },
  ];
}

/** Determines grade band based on school form and random pick */
function determineGradeBand(form: SchoolForm, random: () => number): GradeBand {
  if (form === 'grundschule') return '5-7'; // lowest allowed in grade bands
  if (form === 'berufskolleg') return 'berufskolleg';
  if (form === 'gymnasium' || form === 'gesamtschule') {
    const r = random();
    if (r < 0.35) return '5-7';
    if (r < 0.7) return '8-10';
    return 'oberstufe';
  }
  // realschule, hauptschule, sekundarschule, foerderschule
  return random() < 0.5 ? '5-7' : '8-10';
}

/** Stable demo climate per identity; independent of response RNG and school ordering. */
function climateOffset(id: string, amplitude: number): number {
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (createRandom(hash)() * 2 - 1) * amplitude;
}

/**
 * Calculates the target mood5 score (1–5 scale) for a specific question,
 * school, wave index, and student profile based on story rules.
 */
function sampleMoodScore(
  topicSlug: string,
  school: School,
  waveIndex: number, // 0 to 9
  gradeBand: GradeBand,
  random: () => number,
): number {
  // Baseline mean around 3.3 (approx 57 points on 0–100 scale)
  let targetMean = 3.3;

  // 1. Voice is chronically low statewide (~2.5 = 37.5 points)
  if (topicSlug === 'voice') {
    targetMean = 2.45;
  }

  // 2. AI is confusing & unsupported statewide (~2.6 = 40 points)
  if (topicSlug === 'ai') {
    targetMean = 2.55;
  }

  // 3. Stress: higher in Gymnasien, Oberstufe, and peaks in recent weeks (W41-W43)
  if (topicSlug === 'stress') {
    // Positively phrased core question: lower coping value means more stress (no inversion).
    targetMean = 3.2;
    if (school.schoolForm === 'gymnasium' || gradeBand === 'oberstufe') {
      targetMean -= 0.6; // high stress
    }
    if (waveIndex >= 7) {
      targetMean -= 0.4; // exam peak in recent weeks
    }
  }

  // 4. Digital equipment: rural vs metropolitan
  if (topicSlug === 'digital') {
    if (RURAL_KREISE.has(school.kreisId)) {
      targetMean = 2.7;
    } else if (METROPOL_KREISE.has(school.kreisId)) {
      targetMean = 3.9;
    }
  }

  // Synthetic regional contrast for the choropleth (#120), not observations about real districts.
  // Keep the two pitch-story districts and the positive demo school at their authored baselines.
  if (
    school.id !== '900000' &&
    school.kreisId !== HOTSPOT_TENSION_KREIS &&
    school.kreisId !== HOTSPOT_CANCELLATION_KREIS
  ) {
    targetMean += climateOffset(`kreis:${school.kreisId}`, 1.05) + climateOffset(`school:${school.id}`, 0.45);
  }

  // 5. Cancellation: hotspot Duisburg drops heavily over last 4 weeks
  if (topicSlug === 'cancellation' && school.kreisId === HOTSPOT_CANCELLATION_KREIS) {
    if (waveIndex < 6) {
      targetMean = 3.4;
    } else {
      targetMean = 3.4 - (waveIndex - 5) * 0.5; // drops down to ~1.4
    }
  }

  // 6. Early-warning tension hotspot: Recklinghausen
  if (school.kreisId === HOTSPOT_TENSION_KREIS) {
    if (topicSlug === 'voice' || topicSlug === 'safety' || topicSlug === 'community') {
      if (waveIndex < 5) {
        targetMean = 3.1;
      } else if (waveIndex < 9) {
        // Continuous decay over 4 waves -> triggers CUSUM trend bonus
        targetMean = 3.1 - (waveIndex - 4) * 0.35;
      } else {
        // Wave 9 (W43): slight recovery due to policy answer pol-01
        targetMean = 2.0;
      }
    }
  }

  // 7. Buildings/Toilets: wide variance across schools
  if (topicSlug === 'building') {
    const schoolHash = (Number(school.id) % 10) / 10;
    if (schoolHash < 0.2) {
      targetMean = 2.0; // very poor toilets
    } else if (schoolHash > 0.8) {
      targetMean = 4.1; // renovated
    }
  }

  // 8. Demo school DEMO42: overall positive showcase
  if (school.id === '900000') {
    targetMean = Math.min(4.2, targetMean + 0.5);
  }

  // Clamp targetMean to valid bounds [1.3, 4.7]
  targetMean = Math.max(1.3, Math.min(4.7, targetMean));

  // Gaussian noise approximation using Irwin-Hall (sum of 3 uniforms)
  const noise = (random() + random() + random() - 1.5) * 1.1;
  const raw = Math.round(targetMean + noise);
  return Math.max(1, Math.min(5, raw));
}

/** Generates answers for a single student response */
function generateAnswersForResponse(
  school: School,
  waveIndex: number,
  gradeBand: GradeBand,
  random: () => number,
): AnswerInput[] {
  const answers: AnswerInput[] = [];

  // P0 topics are answered by almost every respondent
  for (const slug of P0_TOPIC_SLUGS) {
    // Core question (mood5)
    const val = sampleMoodScore(slug, school, waveIndex, gradeBand, random);
    answers.push({
      questionId: `${slug}.core`,
      value: val,
    });

    // Only existing student swipe questions; values are 0/1, scoring converts them to points.
    const swipes = SWIPES_BY_TOPIC.get(slug)!;
    if (random() < 0.5 && swipes.length > 0) {
      // Swipe positive if mood >= 3
      const isPositive = random() < (val >= 3 ? 0.75 : 0.25) ? 1 : 0;
      const swipe = swipes[Math.floor(random() * swipes.length)]!;

      answers.push({
        questionId: swipe.id,
        value: isPositive,
      });
    }

    if ((slug === 'ai' || slug === 'voice') && random() < 0.4) {
      const question = QUESTIONS_BY_ID[`${slug}.deep`];
      const options = question?.options;
      if (question?.type === 'choice' && options?.length) {
        answers.push({
          questionId: question.id,
          choice: [options[Math.floor(random() * options.length)]!.value],
        });
      }
    }
  }

  // Add 1-2 P1 topics occasionally
  const p1Slugs = ['cancellation', 'building', 'safety', 'participation'];
  for (const p1 of p1Slugs) {
    if (P0_TOPIC_SLUGS.includes(p1)) continue; // building is already a core question above.
    if (random() < 0.35) {
      const val = sampleMoodScore(p1, school, waveIndex, gradeBand, random);
      answers.push({
        questionId: `${p1}.core`,
        value: val,
      });
    }
  }

  return answers;
}

export interface GenerateSeedOptions {
  seed?: number;
  waveCount?: number;
  /** Letzte erzeugte ISO-Woche; default ist der feste Demo-Stichtag `LAST_WAVE_ID`. */
  lastWaveId?: string;
}

/**
 * Main generator function.
 * Produces deterministic SeedData for schools and waves.
 */
export function generateSeedData(schools: School[], options: GenerateSeedOptions = {}): SeedData {
  const seed = options.seed ?? DEFAULT_SEED;
  const waveCount = options.waveCount ?? DEFAULT_WAVE_COUNT;
  const lastWaveId = options.lastWaveId ?? LAST_WAVE_ID;
  const random = createRandom(seed);
  const waves = generateWaves(waveCount, lastWaveId);
  const policyAnswers = generatePolicyAnswers();

  const responses: SeedResponse[] = [];
  let responseCounter = 1;

  for (let wIdx = 0; wIdx < waves.length; wIdx++) {
    const wave = waves[wIdx]!;

    // Every school participates in every wave so the map and timeline have no gray gaps.
    for (const school of schools) {
      const isDemoSchool = school.id === '900000';

      // Determine number of respondents for this school and wave:
      // - Demo school gets ~45–60 respondents in every wave
      // - Current wave gets 24–36 respondents per school (stable school/topic scores)
      // - Older waves get 12–18 respondents per school (above K_MIN, enough for the timeline)
      // K_MIN edge cases are covered by fixtures/unit tests, not by intentionally empty demo schools.
      let respondentCount: number;
      if (isDemoSchool) {
        respondentCount = 45 + Math.floor(random() * 16);
      } else if (wIdx === waves.length - 1) {
        respondentCount = 24 + Math.floor(random() * 13);
      } else {
        respondentCount = 12 + Math.floor(random() * 7);
      }

      for (let r = 0; r < respondentCount; r++) {
        const gradeBand = determineGradeBand(school.schoolForm, random);
        // Tag innerhalb der Welle, auf Tag gerundet (docs/PRIVACY.md §1)
        const day = new Date(wave.startsAt);
        day.setUTCDate(day.getUTCDate() + Math.floor(random() * 7));
        const submittedAt = day.toISOString().slice(0, 10);

        const answers = generateAnswersForResponse(school, wIdx, gradeBand, random);
        const id = `resp_${wave.id}_${school.id}_${responseCounter.toString().padStart(5, '0')}`;
        responseCounter++;

        responses.push({
          id,
          schoolId: school.id,
          waveId: wave.id,
          role: 'student' as Role,
          gradeBand,
          deviceToken: `dev_token_${id}`,
          submittedAt,
          answers,
        });
      }
    }
  }

  return {
    seed,
    generatedFor: lastWaveId,
    waves,
    responses,
    policyAnswers,
  };
}
