import { beforeEach, describe, expect, it } from 'vitest';
import { useRoleStore } from './role';

describe('useRoleStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useRoleStore.setState({ role: 'student' });
  });

  it('defaults to student', () => {
    expect(useRoleStore.getState().role).toBe('student');
  });

  it('persists the role under moodmap.role', () => {
    useRoleStore.getState().setRole('ministry');
    expect(JSON.parse(localStorage.getItem('moodmap.role')!).state.role).toBe('ministry');
  });
});
