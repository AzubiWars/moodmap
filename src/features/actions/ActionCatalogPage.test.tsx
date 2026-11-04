import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ActionCatalogPage } from './ActionCatalogPage';

function open(url = '/massnahmen') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ActionCatalogPage />
    </MemoryRouter>,
  );
}

describe('ActionCatalogPage', () => {
  it('renders the catalog with visible sources, strongest evidence first', () => {
    open();
    expect(screen.getByRole('heading', { name: 'Maßnahmenkatalog' })).toBeInTheDocument();
    const articles = screen.getAllByRole('article');
    expect(articles.length).toBeGreaterThan(10);
    expect(within(articles[0]!).getByText('Belegt durch:')).toBeInTheDocument();
    expect(within(articles[0]!).getByLabelText('A · starke Evidenz')).toBeInTheDocument();
  });

  it('uses the topic from the URL and filters via topic chips', () => {
    open('/massnahmen?topic=ai');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'KI-Regeln und KI-Kompetenz' })).toBeInTheDocument();

    const topics = screen.getByLabelText('Thema filtern');
    fireEvent.click(within(topics).getByRole('button', { name: /Sicherheit/ }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Anti-Mobbing mit klaren Verfahren' })).toBeInTheDocument();
  });

  it('can hide measures that are only practice standards (C)', () => {
    open('/massnahmen?topic=food');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    fireEvent.click(screen.getByRole('radio', { name: 'Nur A + B' }));
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Alle Maßnahmen zeigen' }));
    expect(screen.getAllByRole('article').length).toBeGreaterThan(10);
  });
});
