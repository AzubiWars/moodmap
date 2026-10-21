import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrivacyPage } from './PrivacyPage';

const SECTION_TITLES = [
  'Was wir speichern',
  'Was wir nie speichern',
  'Warum dich niemand erkennen kann',
  'Was das Gerätekennzeichen ist',
  'Frühwarn-Radar: wofür es da ist und wofür nicht',
  'Das ist ein Prototyp',
];

describe('PrivacyPage', () => {
  it('renders the page title and one accordion per section', () => {
    const { container } = render(<PrivacyPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Datenschutz' })).toBeInTheDocument();
    expect(container.querySelectorAll('details')).toHaveLength(SECTION_TITLES.length);
  });

  it.each(SECTION_TITLES)('shows the section heading "%s" inside a summary', (title) => {
    const { container } = render(<PrivacyPage />);
    const heading = screen.getByRole('heading', { level: 2, name: title });
    expect(heading.closest('summary')).not.toBeNull();
    expect(container.querySelector('details')).not.toBeNull();
  });

  it('states what the radar is not used for', () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/Es überwacht keine Schüler:innen/)).toBeInTheDocument();
    expect(screen.getByText(/Keine Weitergabe an Polizei/)).toBeInTheDocument();
  });

  it('shows the help number for people who need support', () => {
    render(<PrivacyPage />);
    expect(screen.getByText('116 111')).toBeInTheDocument();
  });
});
