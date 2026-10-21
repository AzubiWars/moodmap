import type { Question, QuestionOption, Topic } from '@/types';

/**
 * Themen- und Fragenkatalog als Code.
 * Quelle der Wahrheit: docs/SURVEY_TOPICS.md – Slugs und IDs müssen dort passen.
 *
 * P0 für den Prototyp: Themen 0–8 und 15 (`voice`).
 * Themen 9–14 sind als Daten vorhanden (P1), Lehrkräfte-Themen folgen in #37.
 */

export const TOPICS: readonly Topic[] = [
  {
    slug: 'overall',
    title: 'Gesamtstimmung',
    icon: '🌡️',
    audience: ['student'],
    mandatory: true,
    sort: 0,
    priority: 'P0',
  },
  {
    slug: 'learning',
    title: 'Lernstoff & Unterricht',
    icon: '📚',
    audience: ['student'],
    mandatory: true,
    sort: 1,
    priority: 'P0',
  },
  {
    slug: 'stress',
    title: 'Stress & Leistungsdruck',
    icon: '🧯',
    audience: ['student'],
    mandatory: true,
    sort: 2,
    priority: 'P0',
  },
  {
    slug: 'ai',
    title: 'KI im Schulalltag',
    icon: '🤖',
    audience: ['student'],
    mandatory: true,
    sort: 3,
    priority: 'P0',
  },
  {
    slug: 'wellbeing',
    title: 'Wohlbefinden & mentale Gesundheit',
    icon: '💚',
    audience: ['student'],
    mandatory: true,
    sort: 4,
    priority: 'P0',
  },
  {
    slug: 'community',
    title: 'Klassengemeinschaft & Zugehörigkeit',
    icon: '🤝',
    audience: ['student'],
    mandatory: false,
    sort: 5,
    priority: 'P0',
  },
  {
    slug: 'teachers',
    title: 'Verhältnis zu Lehrkräften',
    icon: '🧑‍🏫',
    audience: ['student'],
    mandatory: false,
    sort: 6,
    priority: 'P0',
  },
  {
    slug: 'digital',
    title: 'Digitale Ausstattung',
    icon: '💻',
    audience: ['student'],
    mandatory: false,
    sort: 7,
    priority: 'P0',
  },
  {
    slug: 'building',
    title: 'Schulgebäude & Toiletten',
    icon: '🏫',
    audience: ['student'],
    mandatory: false,
    sort: 8,
    priority: 'P0',
  },
  {
    slug: 'cancellation',
    title: 'Unterrichtsausfall',
    icon: '📉',
    audience: ['student'],
    mandatory: false,
    sort: 9,
    priority: 'P1',
  },
  {
    slug: 'participation',
    title: 'Mitbestimmung',
    icon: '🗳️',
    audience: ['student'],
    mandatory: false,
    sort: 10,
    priority: 'P1',
  },
  {
    slug: 'future',
    title: 'Zukunft & Berufsorientierung',
    icon: '🧭',
    audience: ['student'],
    mandatory: false,
    sort: 11,
    priority: 'P1',
  },
  {
    slug: 'safety',
    title: 'Sicherheit',
    icon: '🛡️',
    audience: ['student'],
    mandatory: false,
    sort: 12,
    priority: 'P1',
  },
  {
    slug: 'food',
    title: 'Mensa & Pausen',
    icon: '🥪',
    audience: ['student'],
    mandatory: false,
    sort: 13,
    priority: 'P1',
  },
  {
    slug: 'phones',
    title: 'Handy & Social Media',
    icon: '📱',
    audience: ['student'],
    mandatory: false,
    sort: 14,
    priority: 'P1',
  },
  {
    slug: 'voice',
    title: 'Gehört werden – Politik & Schüler',
    icon: '📣',
    audience: ['student'],
    mandatory: true,
    sort: 15,
    priority: 'P0',
  },
];

const mood5 = (topicSlug: string, text: string): Question => ({
  id: `${topicSlug}.core`,
  topicSlug,
  type: 'mood5',
  text,
  weight: 1,
  audience: 'student',
});

const choice = (
  topicSlug: string,
  text: string,
  options: QuestionOption[],
  multiple = false,
): Question => ({
  id: `${topicSlug}.deep`,
  topicSlug,
  type: 'choice',
  text,
  options,
  multiple,
  weight: 0,
  audience: 'student',
});

const swipe = (topicSlug: string, key: string, text: string, weight = 0.5): Question => ({
  id: `${topicSlug}.swipe.${key}`,
  topicSlug,
  type: 'swipe',
  text,
  weight,
  audience: 'student',
});

export const QUESTIONS: readonly Question[] = [
  // Kernfragen (mood5, Gewicht 1.0)
  mood5('overall', "Wie geht's dir gerade mit Schule insgesamt?"),
  mood5('learning', 'Wie gut kommst du gerade mit dem Unterrichtsstoff mit?'),
  mood5('stress', 'Wie gut kommst du mit dem Druck (Tests, Noten, Hausaufgaben) klar?'),
  mood5('ai', 'Wie gut fühlst du dich beim Thema KI (ChatGPT & Co.) in der Schule begleitet?'),
  mood5('wellbeing', 'Wie gut geht es dir zurzeit seelisch?'),
  mood5('community', 'Wie wohl fühlst du dich in deiner Klasse / Stufe?'),
  mood5('teachers', 'Wie fair und respektvoll fühlst du dich von deinen Lehrkräften behandelt?'),
  mood5('digital', 'Wie gut ist deine Schule digital ausgestattet (WLAN, Geräte, Tafeln)?'),
  mood5('building', 'Wie wohl fühlst du dich im Schulgebäude (Räume, Toiletten, Schulhof)?'),
  mood5('cancellation', 'Wie zuverlässig findet dein Unterricht statt?'),
  mood5('participation', 'Wie sehr hast du das Gefühl, an deiner Schule mitreden zu können?'),
  mood5('future', 'Wie gut bereitet dich die Schule auf deine Zukunft vor?'),
  mood5('safety', 'Wie sicher fühlst du dich in der Schule und auf dem Schulweg?'),
  mood5('food', 'Wie zufrieden bist du mit Pausen, Essen und Trinken an der Schule?'),
  mood5('phones', 'Wie gut findest du die Handy-Regeln an deiner Schule?'),
  mood5(
    'voice',
    'Wie sehr hast du das Gefühl, dass die Politik sich für die Meinung von Schüler:innen interessiert?',
  ),

  // Vertiefungen (choice, Gewicht 0 – nur Verteilungen)
  choice('learning', "Woran liegt's?", [
    { value: 'too_fast', label: 'zu schnell' },
    { value: 'too_much', label: 'zu viel' },
    { value: 'boring', label: 'zu langweilig' },
    { value: 'unclear', label: 'unklar erklärt' },
    { value: 'fits', label: 'passt' },
  ]),
  choice('stress', 'Was stresst am meisten?', [
    { value: 'exams', label: 'Klausuren-Häufung' },
    { value: 'homework', label: 'Hausaufgaben' },
    { value: 'grades_future', label: 'Noten/Zukunftsangst' },
    { value: 'parents', label: 'Erwartungen Eltern' },
    { value: 'comparison', label: 'Vergleich mit anderen' },
  ]),
  choice(
    'ai',
    'Wie nutzt du KI für die Schule?',
    [
      { value: 'none', label: 'gar nicht' },
      { value: 'explain', label: 'Erklären lassen' },
      { value: 'homework', label: 'Hausaufgaben' },
      { value: 'writing', label: 'Texte schreiben' },
      { value: 'practice', label: 'Lernen/Üben' },
      { value: 'unsure_rules', label: 'Ich weiß nicht, ob ich darf' },
    ],
    true,
  ),
  choice('wellbeing', 'Hast du in der Schule jemanden, an den du dich wenden kannst?', [
    { value: 'yes', label: 'ja' },
    { value: 'unsure', label: 'weiß nicht' },
    { value: 'no', label: 'nein' },
  ]),
  choice('community', 'Hast du in letzter Zeit Mobbing mitbekommen (auch online)?', [
    { value: 'no', label: 'nein' },
    { value: 'others', label: 'ja, bei anderen' },
    { value: 'me', label: 'ja, bei mir' },
    { value: 'no_answer', label: 'keine Angabe' },
  ]),
  choice('digital', 'Was nervt am meisten?', [
    { value: 'wifi', label: 'WLAN' },
    { value: 'devices', label: 'keine Geräte' },
    { value: 'broken', label: 'Technik kaputt' },
    { value: 'teachers_dont_use', label: 'Lehrkräfte nutzen es nicht' },
    { value: 'fits', label: 'passt' },
  ]),
  choice('building', 'Größte Baustelle?', [
    { value: 'toilets', label: 'Toiletten' },
    { value: 'temperature', label: 'Hitze/Kälte' },
    { value: 'broken_rooms', label: 'kaputte Räume' },
    { value: 'space', label: 'zu wenig Platz' },
    { value: 'cleanliness', label: 'Sauberkeit' },
    { value: 'fits', label: 'passt' },
  ]),
  choice('cancellation', 'Wie oft fällt bei dir pro Woche etwas aus?', [
    { value: 'never', label: 'nie' },
    { value: '1_2', label: '1–2 Std.' },
    { value: '3_5', label: '3–5 Std.' },
    { value: 'more', label: 'mehr' },
  ]),
  choice('phones', 'Wie lautet die Regel?', [
    { value: 'banned', label: 'komplett verboten' },
    { value: 'breaks_only', label: 'nur in Pausen' },
    { value: 'allowed_in_class', label: 'im Unterricht erlaubt' },
    { value: 'unknown', label: 'weiß nicht' },
  ]),
  choice(
    'voice',
    'Wie würdest du am liebsten mitreden?',
    [
      { value: 'online', label: 'Online wie hier' },
      { value: 'sv', label: 'über die SV' },
      {
        value: 'politicians_at_school',
        label: 'Gespräch mit Politiker:innen an der Schule',
      },
      {
        value: 'youth_parliament',
        label: 'Jugendparlament/Schülervertretung auf Landesebene',
      },
      { value: 'none', label: 'gar nicht' },
    ],
    true,
  ),

  // Swipe-Aussagen (P1, Gewicht 0.5; Zustimmung = 100, Ablehnung = 0)
  swipe('ai', 'explain', 'Meine Lehrkräfte erklären, wie man KI sinnvoll nutzt.'),
  swipe('ai', 'rules', 'Es ist klar geregelt, wann ich KI benutzen darf.'),
  swipe('stress', 'freetime', 'Ich habe genug Freizeit neben der Schule.'),
  swipe('learning', 'why', 'Ich weiß, wofür ich das lerne, was wir gerade machen.'),
  swipe('wellbeing', 'sleep', 'Ich schlafe unter der Woche genug.'),
  swipe('digital', 'wifi', 'Das WLAN funktioniert, wenn wir es brauchen.'),
  swipe('participation', 'sv', 'Unsere SV kann wirklich etwas verändern.'),
  swipe('building', 'toilet', 'Ich gehe in der Schule ohne Bedenken auf die Toilette.'),
  swipe('voice', 'change', 'Wenn wir Schüler:innen Probleme ansprechen, ändert sich auch etwas.'),
  // Zählt nicht in den Score, nur in die Verteilung (docs/SURVEY_TOPICS.md §2).
  swipe(
    'voice',
    'talk',
    'Ich würde gern direkt mit Politiker:innen über Schule sprechen.',
    0,
  ),
  swipe('safety', 'conflict', 'Wenn es an meiner Schule Streit gibt, wird er gut gelöst.'),
];

export const P0_TOPIC_SLUGS: readonly string[] = TOPICS.filter(
  (topic) => topic.priority === 'P0',
).map((topic) => topic.slug);

export const P1_TOPIC_SLUGS: readonly string[] = TOPICS.filter(
  (topic) => topic.priority === 'P1',
).map((topic) => topic.slug);

export const MANDATORY_TOPIC_SLUGS: readonly string[] = TOPICS.filter(
  (topic) => topic.mandatory,
).map((topic) => topic.slug);

export const TOPICS_BY_SLUG: Readonly<Record<string, Topic>> = Object.fromEntries(
  TOPICS.map((topic) => [topic.slug, topic]),
);

export const QUESTIONS_BY_ID: Readonly<Record<string, Question>> = Object.fromEntries(
  QUESTIONS.map((question) => [question.id, question]),
);

export function getTopic(slug: string): Topic | undefined {
  return TOPICS_BY_SLUG[slug];
}

export function getQuestionsForTopic(topicSlug: string): Question[] {
  return QUESTIONS.filter((question) => question.topicSlug === topicSlug);
}

export function getCoreQuestion(topicSlug: string): Question | undefined {
  return QUESTIONS.find(
    (question) => question.topicSlug === topicSlug && question.type === 'mood5',
  );
}
