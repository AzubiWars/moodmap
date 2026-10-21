import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Timeline } from './Timeline';

const WAVES = ['2026-W41', '2026-W42', '2026-W43'];

function Harness({ onSelect }: { onSelect?: (w: string | undefined) => void }) {
  const [selected, setSelected] = useState<string | undefined>();
  const [playing, setPlaying] = useState(false);
  return (
    <Timeline
      waves={WAVES}
      selected={selected}
      playing={playing}
      onSelect={(w) => {
        onSelect?.(w);
        setSelected(w);
      }}
      onPlayingChange={setPlaying}
    />
  );
}

describe('Timeline (#34)', () => {
  afterEach(() => vi.useRealTimers());

  it('plays through the waves from the start and stops at the end', () => {
    vi.useFakeTimers();
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    expect(screen.getByText('aktuelle Woche')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Zeitachse abspielen' }));
    expect(onSelect).toHaveBeenLastCalledWith('2026-W41');
    act(() => vi.advanceTimersByTime(1200));
    expect(onSelect).toHaveBeenLastCalledWith('2026-W42');
    act(() => vi.advanceTimersByTime(1200));
    expect(onSelect).toHaveBeenLastCalledWith('2026-W43');
    act(() => vi.advanceTimersByTime(1200));
    expect(screen.getByRole('button', { name: 'Zeitachse abspielen' })).toBeInTheDocument();
    expect(onSelect).toHaveBeenCalledTimes(3);
  });

  it('selects a week with the slider and returns to the current week', () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole('slider', { name: 'Woche wählen' }), { target: { value: '1' } });
    expect(screen.getByText(/KW 42 · /)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zurück zur aktuellen Woche' }));
    expect(screen.getByText('aktuelle Woche')).toBeInTheDocument();
  });
});
