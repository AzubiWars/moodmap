import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MethodologyPage } from './MethodologyPage';

describe('MethodologyPage', () => {
  it('explains scoring, suppression and research limits', () => {
    render(
      <MemoryRouter>
        <MethodologyPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Methodik & Quellen' })).toBeInTheDocument();
    expect(screen.getByText(/score\(thema\) =/i)).toBeInTheDocument();
    expect(screen.getByText(/keine zufallsstichprobe/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '7. Quellen' })).toBeInTheDocument();
    expect(screen.getByText(/Wang, M.-T. & Degol/)).toBeInTheDocument();
    expect(screen.getByText(/OECD \(2023\)/)).toBeInTheDocument();
  });
});
