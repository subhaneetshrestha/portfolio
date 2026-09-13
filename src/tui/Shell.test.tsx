import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { stubMatchMedia } from '../../tests/setup';
import { Shell } from './Shell';

const at = (path: string) => window.history.replaceState(null, '', path);
const current = () => screen.getByRole('link', { current: 'page' }).textContent ?? '';

beforeEach(() => at('/tui'));

describe('Shell frame', () => {
  it('renders title bar, pane region and status line', () => {
    render(<Shell boot={false} />);
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('contentinfo')).toBeTruthy();
  });

  it('lists the four panes as real links, so Tab reaches them natively', () => {
    render(<Shell boot={false} />);
    const nav = screen.getByRole('navigation', { name: /panes/i });
    const hrefs = within(nav).getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/tui', '/tui/resume', '/tui/projects', '/tui/deployments']);
  });

  it('opens on about when no pane is given', () => {
    render(<Shell boot={false} />);
    expect(current()).toMatch(/about/);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/about/);
  });

  it('deep-links straight to a pane on a cold load', () => {
    at('/tui/resume');
    render(<Shell boot={false} />);
    expect(current()).toMatch(/resume/);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/resume/);
  });

  it('shows an in-frame error for an unknown pane and keeps the tabs', () => {
    at('/tui/nope');
    render(<Shell boot={false} />);
    expect(screen.getByRole('main').textContent).toMatch(/no such pane: nope/);
    expect(screen.getByRole('navigation', { name: /panes/i })).toBeTruthy();
    expect(screen.queryByRole('link', { current: 'page' })).toBeNull();
  });
});

describe('Shell keyboard', () => {
  it('1-4 jump to panes', () => {
    render(<Shell boot={false} />);
    fireEvent.keyDown(window, { key: '3' });
    expect(window.location.pathname).toBe('/tui/projects');
    fireEvent.keyDown(window, { key: '1' });
    expect(window.location.pathname).toBe('/tui');
  });

  it('l / ArrowRight cycle forward, h / ArrowLeft back, both wrapping', () => {
    render(<Shell boot={false} />);
    fireEvent.keyDown(window, { key: 'l' });
    expect(window.location.pathname).toBe('/tui/resume');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(window.location.pathname).toBe('/tui');
    fireEvent.keyDown(window, { key: 'h' });
    expect(window.location.pathname).toBe('/tui/deployments');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(window.location.pathname).toBe('/tui');
  });

  it('? opens help, Escape closes it', () => {
    render(<Shell boot={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByRole('dialog').textContent).toMatch(/1-4/);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('leaves shortcuts alone while typing in an input', () => {
    render(
      <>
        <input aria-label="cmd" />
        <Shell boot={false} />
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText('cmd'), { key: '2' });
    expect(window.location.pathname).toBe('/tui');
  });

  it('ignores chords with ctrl/meta/alt so browser shortcuts still work', () => {
    render(<Shell boot={false} />);
    fireEvent.keyDown(window, { key: '2', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'l', metaKey: true });
    expect(window.location.pathname).toBe('/tui');
  });
});

describe('Boot sequence', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // Each boot step schedules its timeout only after React re-renders, and act()
  // flushes once at the end — so advance in short steps, one act per step.
  const runBoot = () => {
    for (let i = 0; i < 20; i++) act(() => vi.advanceTimersByTime(400));
  };

  it('types the boot log, then reveals the frame', () => {
    render(<Shell />);
    expect(screen.queryByRole('main')).toBeNull();
    expect(screen.getByRole('log')).toBeTruthy();
    runBoot();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.queryByRole('log')).toBeNull();
  });

  it('any key skips straight to the frame', () => {
    render(<Shell />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByRole('main')).toBeTruthy();
  });

  it('does not replay within the same session', () => {
    render(<Shell />);
    runBoot();
    cleanup();
    render(<Shell />);
    expect(screen.getByRole('main')).toBeTruthy();
  });

  it('is skipped entirely under prefers-reduced-motion', () => {
    stubMatchMedia(true);
    render(<Shell />);
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.queryByRole('log')).toBeNull();
  });
});
