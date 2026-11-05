import { fireEvent, render, screen } from '@testing-library/react';
import type { MapFilters } from './filters';
import { MapSearch } from './MapSearch';

function filters(over: Partial<MapFilters> = {}): MapFilters {
  return { schoolForm: [], gradeBand: [], period: 'week', directory: true, ...over };
}

const baseProps = {
  onSelectSchool: vi.fn(),
  onSelectCity: vi.fn(),
  onSelectRegion: vi.fn(),
};

describe('MapSearch filters (#303)', () => {
  it('shows the school form chips when the search is focused', () => {
    render(<MapSearch {...baseProps} filters={filters()} onChangeFilters={vi.fn()} />);

    fireEvent.focus(screen.getByRole('searchbox'));

    expect(screen.getByRole('group', { name: 'Treffer nach Schulform filtern' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gymnasium' })).toBeInTheDocument();
  });

  it('adds and removes a school form in the shared map filters', () => {
    const onChangeFilters = vi.fn();
    const { rerender } = render(
      <MapSearch {...baseProps} filters={filters()} onChangeFilters={onChangeFilters} />,
    );
    fireEvent.focus(screen.getByRole('searchbox'));

    fireEvent.click(screen.getByRole('button', { name: 'Gymnasium' }));
    expect(onChangeFilters).toHaveBeenLastCalledWith(filters({ schoolForm: ['gymnasium'] }));

    rerender(
      <MapSearch
        {...baseProps}
        filters={filters({ schoolForm: ['gymnasium'] })}
        onChangeFilters={onChangeFilters}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Gymnasium' }));
    expect(onChangeFilters).toHaveBeenLastCalledWith(filters());
  });

  it('resets only the school forms, not the directory switch', () => {
    const onChangeFilters = vi.fn();
    render(
      <MapSearch
        {...baseProps}
        filters={filters({ schoolForm: ['gymnasium'], directory: false })}
        onChangeFilters={onChangeFilters}
      />,
    );
    fireEvent.focus(screen.getByRole('searchbox'));

    fireEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }));

    expect(onChangeFilters).toHaveBeenLastCalledWith(filters({ directory: false }));
  });

  it('toggles directory schools in the shared map filters', () => {
    const onChangeFilters = vi.fn();
    render(<MapSearch {...baseProps} filters={filters()} onChangeFilters={onChangeFilters} />);
    fireEvent.focus(screen.getByRole('searchbox'));

    fireEvent.click(screen.getByRole('switch', { name: 'Auch Verzeichnis-Standorte anzeigen' }));

    expect(onChangeFilters).toHaveBeenLastCalledWith(filters({ directory: false }));
  });

  it('keeps the filter row visible while a filter is active', () => {
    render(
      <MapSearch {...baseProps} filters={filters({ schoolForm: ['gymnasium'] })} onChangeFilters={vi.fn()} />,
    );

    expect(screen.getByRole('group', { name: 'Treffer nach Schulform filtern' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zurücksetzen' })).toBeInTheDocument();
  });
});
