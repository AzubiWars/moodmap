import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders the landing page', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: /wie geht's nrws schulen/i })).toBeInTheDocument();
  });
});
