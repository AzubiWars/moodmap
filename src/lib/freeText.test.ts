import { clearFreeText, loadFreeText, MAX_FREE_TEXT_LENGTH, moderateLocally, saveFreeText } from './freeText';

describe('moderateLocally', () => {
  it('allows normal feedback and assigns a topic', () => {
    const result = moderateLocally('Die Toiletten sind oft kaputt und im Winter ist es zu kalt.');
    expect(result.allowed).toBe(true);
    expect(result.topics).toContain('building');
    expect(result.cluster).toBe('Schulgebäude & Toiletten');
    expect(result.concern).toBe(false);
  });

  it('removes personal names', () => {
    const result = moderateLocally('Herr Müller ist oft zu schnell und erklärt zu wenig.');
    expect(result.allowed).toBe(true);
    expect(result.cleaned).not.toContain('Müller');
    expect(result.cleaned).toContain('eine Lehrkraft');
  });

  it('masks simple insults instead of storing them', () => {
    const result = moderateLocally('Der Unterricht ist gut, aber du bist ein Idiot.');
    expect(result.allowed).toBe(true);
    expect(result.cleaned).not.toMatch(/idiot/i);
    expect(result.cleaned).toContain('…');
  });

  it('rejects threats', () => {
    const result = moderateLocally('Ich will dich umbringen.');
    expect(result.allowed).toBe(false);
    expect(result.cleaned).toBe('');
    expect(result.reason).toMatch(/Drohung|Gewalt/);
  });

  it('flags crisis signals and allows help to be shown', () => {
    const result = moderateLocally('Ich will nicht mehr leben.');
    expect(result.allowed).toBe(true);
    expect(result.concern).toBe(true);
  });

  it('limits the cleaned text to the maximum length', () => {
    const result = moderateLocally('Gute Schule. '.repeat(40));
    expect(result.cleaned.length).toBeLessThanOrEqual(MAX_FREE_TEXT_LENGTH);
  });

  it('rejects empty text', () => {
    expect(moderateLocally('   ').allowed).toBe(false);
  });
});

describe('free text storage', () => {
  beforeEach(() => localStorage.clear());

  it('saves and loads the moderated result', () => {
    const result = moderateLocally('Die Mensa ist zu teuer.');
    saveFreeText(result);
    expect(loadFreeText()).toEqual(result);
  });

  it('clears the stored result', () => {
    saveFreeText(moderateLocally('Die Mensa ist zu teuer.'));
    clearFreeText();
    expect(loadFreeText()).toBeNull();
  });
});
