import { fireEvent, render, screen } from '@testing-library/react';
import { MoodBadge } from './MoodBadge';
import { MoodScaleInput } from './MoodScaleInput';
import { ScoreBar } from './ScoreBar';
import { TopicChip } from './TopicChip';
import { WeatherIcon } from './WeatherIcon';

describe('WeatherIcon', () => {
  it('labels the weather for screen readers', () => {
    render(<WeatherIcon score={85} />);
    expect(screen.getByRole('img', { name: 'sehr gut' })).toHaveTextContent('☀️');
  });

  it('shows fog for missing data', () => {
    render(<WeatherIcon score={null} />);
    expect(screen.getByRole('img', { name: 'zu wenige Daten' })).toBeInTheDocument();
  });
});

describe('MoodBadge', () => {
  it('shows rounded score, label and n', () => {
    render(<MoodBadge score={63.6} n={42} />);
    expect(screen.getByText('64')).toBeInTheDocument();
    expect(screen.getByText('gut')).toBeInTheDocument();
    expect(screen.getByText('· n = 42')).toBeInTheDocument();
  });

  it('hides the score below K_MIN', () => {
    render(<MoodBadge score={null} />);
    expect(screen.getByText('zu wenige Daten')).toBeInTheDocument();
    expect(screen.getByText('zu wenige Daten').parentElement).toHaveClass('no-data');
  });
});

describe('ScoreBar', () => {
  it('exposes the score as meter', () => {
    render(<ScoreBar score={47.2} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '47');
  });
});

describe('TopicChip', () => {
  it('reports its slug on click and pressed state', () => {
    const onClick = vi.fn();
    render(<TopicChip topic={{ slug: 'ai', title: 'KI', icon: '🤖' }} selected onClick={onClick} />);
    const chip = screen.getByRole('button', { name: /KI/ });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(chip);
    expect(onClick).toHaveBeenCalledWith('ai');
  });
});

describe('MoodScaleInput', () => {
  it('emits 1–5 and null for "weiß nicht"', () => {
    const onChange = vi.fn();
    render(<MoodScaleInput label="Wie geht's?" onChange={onChange} />);
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    fireEvent.click(screen.getByRole('radio', { name: 'eher gut' }));
    expect(onChange).toHaveBeenLastCalledWith(4);
    fireEvent.click(screen.getByRole('button', { name: /weiß nicht/ }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('marks the selected value as checked', () => {
    render(<MoodScaleInput label="Wie geht's?" value={2} onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'eher schlecht' })).toHaveAttribute('aria-checked', 'true');
  });
});
