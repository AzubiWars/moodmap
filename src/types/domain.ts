/**
 * Fachliche Stammtypen – der Vertrag zwischen UI, Mock und Supabase.
 * Details: docs/ARCHITECTURE.md §3–4.
 */

export const ROLES = ['student', 'teacher'] as const;
export type Role = (typeof ROLES)[number];

export const SCHOOL_FORMS = [
  'grundschule',
  'hauptschule',
  'realschule',
  'sekundarschule',
  'gesamtschule',
  'gymnasium',
  'foerderschule',
  'berufskolleg',
] as const;
export type SchoolForm = (typeof SCHOOL_FORMS)[number];

export const GRADE_BANDS = ['5-7', '8-10', 'oberstufe', 'berufskolleg'] as const;
export type GradeBand = (typeof GRADE_BANDS)[number];

export const SCOPE_LEVELS = ['regbez', 'kreis', 'school'] as const;
export type ScopeLevel = (typeof SCOPE_LEVELS)[number];

export const DATA_LEVELS = ['nrw', 'regbez', 'kreis', 'school'] as const;
export type DataLevel = (typeof DATA_LEVELS)[number];

/** `freetext` ist bewusst nicht Teil des Prototyps (docs/PRIVACY.md §1). */
export const QUESTION_TYPES = ['mood5', 'swipe', 'choice'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const KREIS_TYPES = ['kreis', 'kreisfreie_stadt'] as const;
export type KreisType = (typeof KREIS_TYPES)[number];

export const TOPIC_PRIORITIES = ['P0', 'P1', 'P2'] as const;
export type TopicPriority = (typeof TOPIC_PRIORITIES)[number];

export const TENSION_LEVELS = ['stable', 'watch', 'talk'] as const;
export type TensionLevel = (typeof TENSION_LEVELS)[number];

export const POLICY_SCOPES = ['nrw', 'regbez', 'kreis'] as const;
export type PolicyScope = (typeof POLICY_SCOPES)[number];

export const POLICY_AUTHOR_ROLES = ['ministerium', 'bezreg'] as const;
export type PolicyAuthorRole = (typeof POLICY_AUTHOR_ROLES)[number];

export const POLICY_ANSWER_STATUSES = ['listening', 'reviewing', 'planned', 'done'] as const;
export type PolicyAnswerStatus = (typeof POLICY_ANSWER_STATUSES)[number];

export type RegbezId = string;
export type KreisId = string;
export type SchoolId = string;
export type WaveId = string;
export type TopicSlug = string;

export interface Regbez {
  id: RegbezId;
  name: string;
}

export interface Kreis {
  /** Amtlicher Gemeindeschlüssel (AGS). */
  id: KreisId;
  name: string;
  regbezId: RegbezId;
  type: KreisType;
}

export interface School {
  /** Schulnummer. */
  id: SchoolId;
  name: string;
  schoolForm: SchoolForm;
  kreisId: KreisId;
  city: string;
  lat: number;
  lon: number;
  studentCount: number | null;
  /** Nicht erratbarer Join-Code für QR-Links (`/s/:code`). */
  joinCode: string;
  /** Isolierter Pitch-Standort; nur per Test-Code erreichbar, nie Teil einer NRW-Auswertung. */
  isTest?: boolean;
}

/** Öffentliches Schulverzeichnis (`public/data/schools.real.json`): nie mit Join-Code (#257). */
export type DirectorySchool = Omit<School, 'joinCode' | 'isTest'>;

export interface Topic {
  slug: TopicSlug;
  title: string;
  /** Emoji oder Icon-Name für die UI. */
  icon: string;
  audience: Role[];
  mandatory: boolean;
  sort: number;
  priority: TopicPriority;
}

export interface QuestionOption {
  /** Stabiler Wert für Speicherung/Auswertung. */
  value: string;
  /** Anzeigetext in der UI. */
  label: string;
}

export interface Question {
  id: string;
  topicSlug: TopicSlug;
  type: QuestionType;
  text: string;
  /** Nur bei `choice` gesetzt. */
  options?: QuestionOption[];
  /** Bei `choice`: Mehrfachauswahl erlaubt. */
  multiple?: boolean;
  /** Bei `true` wird der Score invertiert (z. B. „Stress" hoch = Stimmung schlecht). */
  invert?: boolean;
  /** Gewicht im Themen-Score; Kernfrage 1.0, Swipe 0.5, Verteilung 0. */
  weight?: number;
  audience?: Role;
}

export interface Wave {
  /** z. B. `2026-W43`. */
  id: WaveId;
  /** ISO-8601. */
  startsAt: string;
  /** ISO-8601. */
  endsAt: string;
}
