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
  it('renders the catalog and can search measures', () => {
    open();
    expect(screen.getByRole('heading', { name: 'Maßnahmenkatalog' })).toBeInTheDocument();
    expect(screen.getAllByRole('article').length).toBeGreaterThan(10);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Maßnahmen durchsuchen' }), {
      target: { value: 'Toiletten' },
    });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: 'Toiletten und Gebäude zuverlässig instand halten' }),
    ).toBeInTheDocument();
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

  it('shows an empty state and resets filters', () => {
    open();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Maßnahmen durchsuchen' }), {
      target: { value: 'gibtesnicht' },
    });
    expect(screen.getByText('Keine Maßnahme passt zu dieser Suche.')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Filter zurücksetzen' })[0]!);
    expect(screen.getAllByRole('article').length).toBeGreaterThan(10);
  });
});
