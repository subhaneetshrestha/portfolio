import { render, screen } from '@testing-library/react';
import { PROMPT } from '../content/resume';
import Landing from './Landing';

// The front door must show the same mark as the shell behind it — one
// PROMPT constant, never a hand-typed copy. See src/content/resume.ts.
describe('Landing', () => {
  it('shows the shell prompt, not a hardcoded copy of it', () => {
    render(<Landing />);
    expect(screen.getByText(PROMPT, { exact: false })).toBeTruthy();
  });
});
