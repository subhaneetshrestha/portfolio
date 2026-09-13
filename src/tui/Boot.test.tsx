import { act, render, screen } from '@testing-library/react';
import { resume } from '../content/resume';
import { Boot } from './Boot';

// Boot's numbers are computed at module load, so the content is mocked here
// rather than read: one 200, one 301, one 404 makes "live" unambiguous.
vi.mock('../content/deployments', () => ({
  deployments: [
    { id: 'a', kind: 'live', label: 'a', url: 'https://a' },
    { id: 'b', kind: 'live', label: 'b', url: 'https://b' },
    { id: 'c', kind: 'retired', label: 'c', url: 'https://c' },
    { id: 'd', kind: 'release', label: 'd' },
  ],
}));
vi.mock('../content/github', () => ({
  github: { checkedAt: '2026-09-13T00:00:00Z', liveness: { 'https://a': 200, 'https://b': 301, 'https://c': 404 }, repos: [{}, {}] },
}));

const runBoot = () => {
  for (let i = 0; i < 20; i++) act(() => vi.advanceTimersByTime(200));
};
const text = () => document.body.textContent ?? '';

describe('Boot lines', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reports counts derived from the content, treating 2xx/3xx as live like the deployments pane', () => {
    render(<Boot onDone={() => {}} />);
    runBoot();
    expect(text()).toContain('indexed 2 repositories');
    expect(text()).toContain('checked 3 deployments — 2 live');
  });

  it('names no version: the only numbers are the counts', () => {
    render(<Boot onDone={() => {}} />);
    runBoot();
    expect(text()).not.toMatch(/\d+\.\d+\.\d+/);
  });

  it('mounts the home of, and logs in as, the profile handle', () => {
    render(<Boot onDone={() => {}} />);
    runBoot();
    expect(text()).toContain(`mounted /home/${resume.profile.handle}`);
    expect(text()).toContain(`login: ${resume.profile.handle}`);
  });

  it('stays silent to assistive tech while typing and announces once when the login line lands', () => {
    render(<Boot onDone={() => {}} />);
    act(() => vi.advanceTimersByTime(300));
    expect(screen.queryByRole('log')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('');
    runBoot();
    expect(screen.getByRole('status').textContent).toContain(`login: ${resume.profile.handle}`);
  });
});
