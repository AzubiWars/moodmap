import { getTopic } from '@/data/topics';
import type { TopicSlug } from '@/types';
import { edgeFunctionHeaders } from './edgeFunctions';

export const MAX_FREE_TEXT_LENGTH = 280;

export interface FreeTextModeration {
  allowed: boolean;
  reason: string;
  cleaned: string;
  topics: TopicSlug[];
  cluster: string;
  concern: boolean;
}

const DISCARDED: FreeTextModeration = {
  allowed: false,
  reason: 'Der Text konnte nicht geprüft werden und wurde verworfen.',
  cleaned: '',
  topics: [],
  cluster: '',
  concern: false,
};

/**
 * Lokaler Demo-Fallback für den Mock-Modus (ADR-016).
 * Die echte Moderation läuft serverseitig über die Edge Function `submit-freetext`
 * (erst nach der Umfrage-Abgabe).
 */
const SOFT_WORDS = /\b(idiot(?:en)?|depp(?:en)?|dummkopf|arschloch|wichser|hurensohn|spast(?:i)?)\b/gi;
const HARD_BLOCK = /\b(umbringen|töten|abstechen|vergewaltigen|verpfeifen\s+wir|hass\s+auf)\b/i;
const CONCERN =
  /\b(suizid|selbstmord|ritzen|selbstverletz|nicht\s+mehr\s+leben|will\s+nicht\s+mehr|gewalt\s+gegen)\b/i;
const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;
const PHONE = /\b(?:\+49|0)[\d\s/()-]{8,}\b/g;
const PERSON = /\b(?:Herr|Frau)\s+[A-ZÄÖÜ][a-zäöüß-]+\b/g;
const CLASS = /\b(?:Klasse|Jahrgang)\s+\d+[a-zA-Z]?\b/gi;

const TOPIC_KEYWORDS: ReadonlyArray<[TopicSlug, RegExp]> = [
  ['ai', /\b(ki|chatgpt|künstliche intelligenz|gemini|copilot)\b/i],
  ['stress', /\b(stress|druck|klausur|prüfung|note|hausaufgabe|überfordert)\b/i],
  ['teachers', /\b(lehrer|lehrerin|lehrkraft|respekt|ungerecht)\b/i],
  ['learning', /\b(unterricht|stoff|erklär|lerne|schule)\b/i],
  ['digital', /\b(wlan|tablet|ipad|computer|digital|technik)\b/i],
  ['building', /\b(toilette|gebäude|raum|schulhof|sanierung|kaputt)\b/i],
  ['food', /\b(mensa|essen|pause|kantine)\b/i],
  ['voice', /\b(politik|gehört|mitbestimm|ernst genommen)\b/i],
  ['safety', /\b(sicher|angst|mobbing|streit|gewalt)\b/i],
  ['community', /\b(klasse|klassengemeinschaft|freunde|einsam)\b/i],
  ['wellbeing', /\b(wohl|psychisch|gesundheit|schlaf)\b/i],
  ['phones', /\b(handy|smartphone|social media|instagram|tiktok)\b/i],
];

function topicFor(text: string): TopicSlug | null {
  for (const [slug, pattern] of TOPIC_KEYWORDS) {
    if (pattern.test(text)) return slug;
  }
  return null;
}

function cleanText(input: string): string {
  return input
    .replace(EMAIL, '[E-Mail entfernt]')
    .replace(PHONE, '[Telefon entfernt]')
    .replace(PERSON, 'eine Lehrkraft')
    .replace(CLASS, 'eine Klasse')
    .replace(SOFT_WORDS, '…')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_FREE_TEXT_LENGTH);
}

export function moderateLocally(input: string): FreeTextModeration {
  const text = input.trim().slice(0, MAX_FREE_TEXT_LENGTH);
  if (!text) return { ...DISCARDED, reason: 'Der Text ist leer.' };

  const topic = topicFor(text);
  const concern = CONCERN.test(text);
  const blocked = HARD_BLOCK.test(text);
  const cleaned = cleanText(text);

  if (blocked) {
    return {
      allowed: false,
      reason: 'Bitte formuliere sachlich – der Text enthält eine Drohung oder Aufforderung zu Gewalt.',
      cleaned: '',
      topics: [],
      cluster: '',
      concern,
    };
  }
  if (cleaned.replace(/[…\s]/g, '').length < 3) {
    return {
      allowed: false,
      reason: 'Bitte schreibe noch einen sachlichen Satz.',
      cleaned: '',
      topics: [],
      cluster: '',
      concern,
    };
  }

  const topicInfo = topic ? getTopic(topic) : undefined;
  return {
    allowed: true,
    reason: '',
    cleaned,
    topics: topic ? [topic] : [],
    cluster: topicInfo?.title ?? 'Sonstiges',
    concern,
  };
}

export interface SubmitFreeTextInput {
  schoolId: string;
  waveId: string;
  deviceToken: string;
  text: string;
}

interface SubmitFreeTextResponse {
  ok?: unknown;
  stored?: unknown;
  reason?: unknown;
  concern?: unknown;
  cluster?: unknown;
  topics?: unknown;
}

const NOT_STORED = 'Dein Hinweis konnte nicht übernommen werden.';

/** Server-Codes wie `storage_failed` nie anzeigen – nur echte Moderationsgründe. */
function readableReason(reason: unknown, fallback: string): string {
  return typeof reason === 'string' && reason.trim() && !/^[a-z_]+$/.test(reason) ? reason : fallback;
}

/**
 * Nach der Umfrage-Abgabe: serverseitige Moderation + Speicherung über `submit-freetext`.
 * Nur im Supabase-Modus – im Mock-Modus liegt die Abgabe nicht in der DB (`no_response`),
 * dann greift wie ohne Supabase-Env der lokale Demo-Fallback.
 */
export async function submitFreeText(input: SubmitFreeTextInput): Promise<FreeTextModeration> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (import.meta.env.VITE_DATA_MODE !== 'supabase' || !url || !anonKey) return moderateLocally(input.text);

  try {
    const response = await fetch(`${url}/functions/v1/submit-freetext`, {
      method: 'POST',
      headers: edgeFunctionHeaders(anonKey),
      body: JSON.stringify({ ...input, text: input.text.slice(0, MAX_FREE_TEXT_LENGTH) }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return DISCARDED;

    const data = (await response.json()) as SubmitFreeTextResponse;
    const concern = data.concern === true;
    if (data.ok !== true) {
      return {
        ...DISCARDED,
        reason: readableReason(data.reason, DISCARDED.reason),
        concern,
      };
    }

    const already = data.stored !== true && data.reason === 'already_submitted';
    if (data.stored !== true && !already) {
      return {
        allowed: false,
        reason: readableReason(data.reason, NOT_STORED),
        cleaned: '',
        topics: [],
        cluster: '',
        concern,
      };
    }

    return {
      allowed: true,
      reason: '',
      cleaned: '',
      topics: Array.isArray(data.topics)
        ? data.topics.filter((topic): topic is TopicSlug => typeof topic === 'string')
        : [],
      cluster: typeof data.cluster === 'string' ? data.cluster : '',
      concern,
    };
  } catch {
    return DISCARDED;
  }
}

const STORAGE_KEY = 'moodmap.freetext.v1';

export function saveFreeText(result: FreeTextModeration): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    /* Privatmodus: Demo funktioniert auch ohne Speicherung */
  }
}

export function loadFreeText(): FreeTextModeration | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FreeTextModeration) : null;
  } catch {
    return null;
  }
}

export function clearFreeText(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
