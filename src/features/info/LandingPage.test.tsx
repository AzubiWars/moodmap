import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  it('links the CTAs and the privacy page', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Mood-Check starten' })).toHaveAttribute('href', '/check');
    expect(screen.getByRole('link', { name: 'Karte ansehen' })).toHaveAttribute('href', '/map');
    expect(screen.getByRole('link', { name: 'Datenschutz' })).toHaveAttribute('href', '/privacy');
  });
});
