import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DemoPage } from './DemoPage';
import { demoSchoolUrl, resetDemoData } from './demoData';

vi.mock('@/data', () => ({
  getDataSource: () => ({
    getPitchAggregate: async () => {
      throw new Error('unconfigured');
    },
  }),
}));

describe('DemoPage', () => {
  beforeEach(() => localStorage.clear());

  it('shows the QR link to /s/DEMO42', () => {
    expect(demoSchoolUrl('https://x.test')).toBe('https://x.test/s/DEMO42');
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <DemoPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText(/^https?:\/\/.*\/s\/DEMO42$/)).toBeTruthy();
  });

  it('resetDemoData keeps only the role', () => {
    localStorage.setItem('moodmap.role', 'x');
    localStorage.setItem('moodmap.device', 'y');
    localStorage.setItem('moodmap:participant:v1', 'p');
    localStorage.setItem('other', 'z');
    resetDemoData();
    expect(localStorage.getItem('moodmap:participant:v1')).toBeNull();
    expect(localStorage.getItem('moodmap.role')).toBe('x');
    expect(localStorage.getItem('moodmap.device')).toBeNull();
    expect(localStorage.getItem('other')).toBe('z');
  });
});
