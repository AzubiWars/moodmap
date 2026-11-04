import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OPEN_DATASETS } from '@/data/openData';
import { SourcesPage } from './SourcesPage';

describe('SourcesPage', () => {
  it('links every dataset and every catalogue study', () => {
    render(
      <MemoryRouter>
        <SourcesPage />
      </MemoryRouter>,
    );
    for (const dataset of OPEN_DATASETS) {
      expect(screen.getByRole('heading', { name: dataset.title })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('link', { name: 'Zur Quelle' })).toHaveLength(OPEN_DATASETS.length);
    expect(screen.getByRole('link', { name: 'doi:10.1111/j.1467-8624.2010.01564.x' })).toHaveAttribute(
      'href',
      'https://doi.org/10.1111/j.1467-8624.2010.01564.x',
    );
  });
});
