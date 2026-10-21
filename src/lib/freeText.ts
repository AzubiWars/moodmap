import { getTopic } from '@/data/topics';
import type { TopicSlug } from '@/types';

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
 * Die echte Moderation läuft serverseitig über die Edge Function `moderate-text`.
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

function normalize(value: unknown): FreeTextModeration {
  if (!value || typeof value !== 'object') return DISCARDED;
  const raw = value as Partial<FreeTextModeration>;
  if (raw.allowed !== true) {
    return {
      ...DISCARDED,
      reason: typeof raw.reason === 'string' ? raw.reason : DISCARDED.reason,
      concern: raw.concern === true,
    };
  }
  return {
    allowed: true,
    reason: '',
    cleaned: typeof raw.cleaned === 'string' ? raw.cleaned.slice(0, MAX_FREE_TEXT_LENGTH) : '',
    topics: Array.isArray(raw.topics) ? raw.topics.filter((t): t is string => typeof t === 'string') : [],
    cluster: typeof raw.cluster === 'string' ? raw.cluster : '',
    concern: raw.concern === true,
  };
}

/**
 * Wenn Supabase konfiguriert ist, läuft die Prüfung über die Edge Function
 * (`moderate-text` → OpenRouter), unabhängig vom Datenmodus. Ohne Supabase-Env
 * (z. B. reiner Mock/Dev) greift der lokale Demo-Fallback.
 */
export async function moderateFreeText(input: string): Promise<FreeTextModeration> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return moderateLocally(input);

  try {
    const response = await fetch(`${url}/functions/v1/moderate-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ text: input.slice(0, MAX_FREE_TEXT_LENGTH) }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return DISCARDED;
    return normalize(await response.json());
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
