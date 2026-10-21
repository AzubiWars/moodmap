import { act, fireEvent, render, screen } from '@testing-library/react';
import { initializeTheme } from '@/lib/theme';
import { ThemeToggle } from './ThemeToggle';

let systemDark = false;
const media = new EventTarget();

beforeEach(() => {
  localStorage.clear();
  systemDark = false;
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return systemDark;
    },
    addEventListener: media.addEventListener.bind(media),
    removeEventListener: media.removeEventListener.bind(media),
  }));
  initializeTheme();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  initializeTheme();
  vi.unstubAllGlobals();
});

it('follows the system until a manual choice and restores that choice after initialization', () => {
  render(<ThemeToggle />);
  act(() => {
    systemDark = true;
    media.dispatchEvent(new Event('change'));
  });
  expect(document.documentElement).toHaveClass('dark');
  fireEvent.click(screen.getByRole('button', { name: 'Hellen Modus aktivieren' }));
  expect(document.documentElement).not.toHaveClass('dark');
  act(() => {
    media.dispatchEvent(new Event('change'));
    initializeTheme();
  });
  expect(document.documentElement).not.toHaveClass('dark');
  expect(screen.getByRole('button', { name: 'Dunklen Modus aktivieren' })).toBeInTheDocument();
});

it('keeps a toggle working when persistent storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Private storage');
  });
  render(<ThemeToggle />);
  fireEvent.click(screen.getByRole('button', { name: 'Dunklen Modus aktivieren' }));
  expect(document.documentElement).toHaveClass('dark');
  fireEvent.click(screen.getByRole('button', { name: 'Hellen Modus aktivieren' }));
  expect(document.documentElement).not.toHaveClass('dark');
});

it('synchronizes a preference changed in another tab', () => {
  render(<ThemeToggle />);
  act(() => {
    localStorage.setItem('moodmap:theme:v1', 'dark');
    window.dispatchEvent(new StorageEvent('storage', { key: 'moodmap:theme:v1' }));
  });
  expect(document.documentElement).toHaveClass('dark');
  expect(screen.getByRole('button', { name: 'Hellen Modus aktivieren' })).toBeInTheDocument();
});
