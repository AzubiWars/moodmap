import { render, screen } from '@testing-library/react';
import { AppLogo } from './AppLogo';
import { LOGO_HEX, logoSvg } from './logoMarkup';
import { NRW_OUTLINE_PATH } from './nrwOutline';

describe('AppLogo', () => {
  it('is decorative without a label', () => {
    const { container } = render(<AppLogo variant="smiley" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('exposes the label as an image', () => {
    render(<AppLogo variant="handshake" label="Moodmap" />);
    expect(screen.getByRole('img', { name: 'Moodmap' })).toBeInTheDocument();
  });

  it('draws the derived NRW outline in both variants', () => {
    expect(NRW_OUTLINE_PATH.startsWith('M')).toBe(true);
    for (const variant of ['smiley', 'handshake'] as const) {
      expect(logoSvg(variant, LOGO_HEX)).toContain(NRW_OUTLINE_PATH);
    }
  });
});
