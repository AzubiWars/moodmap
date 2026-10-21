import {
  DATA_LEVELS,
  GRADE_BANDS,
  KREIS_TYPES,
  POLICY_ANSWER_STATUSES,
  POLICY_SCOPES,
  QUESTION_TYPES,
  ROLES,
  SCHOOL_FORMS,
  SCOPE_LEVELS,
  TENSION_LEVELS,
} from './domain';
import {
  isDataLevel,
  isGradeBand,
  isKreisType,
  isPolicyAnswerStatus,
  isPolicyScope,
  isQuestionType,
  isRole,
  isSchoolForm,
  isScopeLevel,
  isTensionLevel,
} from './guards';

describe('type guards', () => {
  it('accepts every documented value', () => {
    for (const value of ROLES) expect(isRole(value)).toBe(true);
    for (const value of SCHOOL_FORMS) expect(isSchoolForm(value)).toBe(true);
    for (const value of GRADE_BANDS) expect(isGradeBand(value)).toBe(true);
    for (const value of SCOPE_LEVELS) expect(isScopeLevel(value)).toBe(true);
    for (const value of DATA_LEVELS) expect(isDataLevel(value)).toBe(true);
    for (const value of QUESTION_TYPES) expect(isQuestionType(value)).toBe(true);
    for (const value of KREIS_TYPES) expect(isKreisType(value)).toBe(true);
    for (const value of TENSION_LEVELS) expect(isTensionLevel(value)).toBe(true);
    for (const value of POLICY_SCOPES) expect(isPolicyScope(value)).toBe(true);
    for (const value of POLICY_ANSWER_STATUSES) expect(isPolicyAnswerStatus(value)).toBe(true);
  });

  it('rejects undocumented or removed values', () => {
    expect(isRole('admin')).toBe(false);
    expect(isSchoolForm('')).toBe(false);
    expect(isGradeBand('1-4')).toBe(false);
    expect(isScopeLevel('nrw')).toBe(false);
    expect(isDataLevel('bundesland')).toBe(false);
    expect(isQuestionType('freetext')).toBe(false);
    expect(isKreisType('stadt')).toBe(false);
    expect(isTensionLevel('alarm')).toBe(false);
    expect(isPolicyScope('school')).toBe(false);
    expect(isPolicyAnswerStatus('published')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isRole(1)).toBe(false);
    expect(isSchoolForm(null)).toBe(false);
    expect(isGradeBand(undefined)).toBe(false);
    expect(isPolicyScope({})).toBe(false);
  });
});
