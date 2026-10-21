import {
  GRADE_BANDS,
  KREIS_TYPES,
  POLICY_ANSWER_STATUSES,
  POLICY_SCOPES,
  QUESTION_TYPES,
  ROLES,
  SCHOOL_FORMS,
  SCOPE_LEVELS,
  TENSION_LEVELS,
  DATA_LEVELS,
  type DataLevel,
  type GradeBand,
  type KreisType,
  type PolicyAnswerStatus,
  type PolicyScope,
  type QuestionType,
  type Role,
  type SchoolForm,
  type ScopeLevel,
  type TensionLevel,
} from './domain';

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

export function isRole(value: unknown): value is Role {
  return isOneOf(ROLES, value);
}

export function isSchoolForm(value: unknown): value is SchoolForm {
  return isOneOf(SCHOOL_FORMS, value);
}

export function isGradeBand(value: unknown): value is GradeBand {
  return isOneOf(GRADE_BANDS, value);
}

export function isScopeLevel(value: unknown): value is ScopeLevel {
  return isOneOf(SCOPE_LEVELS, value);
}

export function isDataLevel(value: unknown): value is DataLevel {
  return isOneOf(DATA_LEVELS, value);
}

export function isQuestionType(value: unknown): value is QuestionType {
  return isOneOf(QUESTION_TYPES, value);
}

export function isKreisType(value: unknown): value is KreisType {
  return isOneOf(KREIS_TYPES, value);
}

export function isTensionLevel(value: unknown): value is TensionLevel {
  return isOneOf(TENSION_LEVELS, value);
}

export function isPolicyScope(value: unknown): value is PolicyScope {
  return isOneOf(POLICY_SCOPES, value);
}

export function isPolicyAnswerStatus(value: unknown): value is PolicyAnswerStatus {
  return isOneOf(POLICY_ANSWER_STATUSES, value);
}
