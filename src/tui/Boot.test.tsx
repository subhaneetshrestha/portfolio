import { act, render, screen } from '@testing-library/react';
import { github } from '../content/github';
import { Boot } from './Boot';

describe('Boot lines', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reports counts derived from the generated content, not hardcoded', () => {
    render(<Boot onDone={() => {}} />);
    for (let i = 0; i < 20; i++) act(() => vi.advanceTimersByTime(200));
    const log = screen.getByRole('log').textContent ?? '';
    expect(log).toContain(`indexed ${github.repos.length} repositories`);
    expect(log).toMatch(/checked \d+ deployments — \d+ live/);
  });
});
