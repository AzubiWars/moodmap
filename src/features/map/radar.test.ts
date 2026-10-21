import { parseMapMode } from './modes';
import { publishAnswerHref, suggestionsFor, TENSION_FILL_EXPRESSION, TENSION_INFO } from './radar';

describe('radar helpers (#42)', () => {
  it('parses the map mode with mood as safe default', () => {
    expect(parseMapMode('radar')).toBe('radar');
    expect(parseMapMode(null)).toBe('mood');
    expect(parseMapMode('alarm')).toBe('mood');
  });

  it('uses dialog language instead of alarm language', () => {
    const labels = Object.values(TENSION_INFO).map((i) => i.label.toLowerCase());
    expect(labels).toEqual(['stabil', 'beobachten', 'gespräch suchen']);
    expect(labels.join(' ')).not.toMatch(/risiko|gefahr|alarm/);
  });

  it('maps every level to its color and unknown values to no-data grey', () => {
    expect(TENSION_FILL_EXPRESSION).toContain(TENSION_INFO.talk.color);
    expect(TENSION_FILL_EXPRESSION.at(-1)).toBe('#B8BCC6');
  });

  it('suggests actions per driver and links to the answer form with region and topic', () => {
    expect(suggestionsFor(['voice', 'food'])).toEqual(['Dialogrunde mit den Schülervertretungen anbieten']);
    expect(publishAnswerHref('kreis', '05562', 'voice')).toBe(
      '/dashboard?publish=1&scope=kreis&region=05562&topic=voice',
    );
    expect(publishAnswerHref('regbez', '055', undefined)).toBe(
      '/dashboard?publish=1&scope=regbez&region=055',
    );
  });
});
