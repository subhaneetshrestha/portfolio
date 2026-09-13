import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { PROMPT, resume } from '../content/resume';
import { stubMatchMedia } from '../../tests/setup';
import { Shell } from './Shell';

const at = (path: string) => window.history.replaceState(null, '', path);
const current = () => screen.getByRole('link', { current: 'page' }).textContent ?? '';

beforeEach(() => at('/tui'));
// Touch mode is the default stub (no query matches); the session flag skips boot.
const booted = () => sessionStorage.setItem('tui.booted', '1');

describe('Shell frame', () => {
  beforeEach(booted);
  it('renders title bar, pane region and status line', () => {
    render(<Shell />);
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('contentinfo')).toBeTruthy();
  });

  it('lists the four panes as real links, so Tab reaches them natively', () => {
    render(<Shell />);
    const nav = screen.getByRole('navigation', { name: /panes/i });
    const hrefs = within(nav).getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/tui', '/tui/resume', '/tui/projects', '/tui/deployments']);
  });

  it('names each tab by its pane alone; the key hint is visual only', () => {
    render(<Shell />);
    const nav = screen.getByRole('navigation', { name: /panes/i });
    for (const id of ['about', 'resume', 'projects', 'deployments']) {
      expect(within(nav).getByRole('link', { name: id })).toBeTruthy();
    }
  });

  it('opens on about when no pane is given', () => {
    render(<Shell />);
    expect(current()).toMatch(/about/);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/about/);
  });

  it('titles the frame with the prompt, minus its $, on every pane', () => {
    at('/tui/resume');
    render(<Shell />);
    expect(screen.getByRole('banner').textContent).toContain(PROMPT.slice(0, -1));
    expect(screen.getByRole('banner').textContent).not.toContain('~/resume');
  });

  it('deep-links straight to a pane on a cold load', () => {
    at('/tui/resume');
    render(<Shell />);
    expect(current()).toMatch(/resume/);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/resume/);
  });

  it('shows an in-frame error for an unknown pane and keeps the tabs', () => {
    at('/tui/nope');
    render(<Shell />);
    expect(screen.getByRole('main').textContent).toMatch(/no such pane: nope/);
    expect(screen.getByRole('navigation', { name: /panes/i })).toBeTruthy();
    expect(screen.queryByRole('link', { current: 'page' })).toBeNull();
  });
});

describe('Shell keyboard', () => {
  beforeEach(booted);
  it('1-4 jump to panes', () => {
    render(<Shell />);
    fireEvent.keyDown(window, { key: '3' });
    expect(window.location.pathname).toBe('/tui/projects');
    fireEvent.keyDown(window, { key: '1' });
    expect(window.location.pathname).toBe('/tui');
  });

  it('l / ArrowRight cycle forward, h / ArrowLeft back, both wrapping', () => {
    render(<Shell />);
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
    render(<Shell />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByRole('dialog').textContent).toMatch(/1-4/);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('help names tab as completion inside the prompt and carries no developer notes', () => {
    render(<Shell />);
    fireEvent.keyDown(window, { key: '?' });
    const text = screen.getByRole('dialog').textContent ?? '';
    expect(text).toMatch(/complete/);
    expect(text).not.toMatch(/browser-native/);
  });

  it('leaves shortcuts alone while typing in an input', () => {
    render(
      <>
        <input aria-label="cmd" />
        <Shell />
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText('cmd'), { key: '2' });
    expect(window.location.pathname).toBe('/tui');
  });

  it(': focuses the command line, vim-style', () => {
    render(<Shell />);
    expect(fireEvent.keyDown(window, { key: ':' })).toBe(false);
    expect(document.activeElement).toBe(screen.getByLabelText('command'));
  });

  it('mounts the command line between the pane and the status line', () => {
    render(<Shell />);
    const form = screen.getByLabelText('command').closest('form')!;
    expect(screen.getByRole('main').compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(form.compareDocumentPosition(screen.getByRole('contentinfo')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('ignores chords with ctrl/meta/alt so browser shortcuts still work', () => {
    render(<Shell />);
    fireEvent.keyDown(window, { key: '2', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'l', metaKey: true });
    expect(window.location.pathname).toBe('/tui');
  });
});

describe('Shell desktop', () => {
  // Every query matches: a fine pointer at desktop width, and reduced motion, so boot is skipped.
  beforeEach(() => stubMatchMedia(true));
  const log = () => screen.getByRole('log', { name: 'terminal output' });

  it('renders the terminal full-screen with no tab nav', () => {
    render(<Shell />);
    expect(within(screen.getByRole('main')).getByRole('log', { name: 'terminal output' })).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.getByRole('banner').textContent).toBe(PROMPT.slice(0, -1));
    expect(screen.getByRole('contentinfo').textContent).toMatch(/\?:help/);
    expect(screen.getByRole('contentinfo').textContent).toMatch(/tab:complete/);
  });

  it('focuses the prompt and follows its cwd in the title bar', () => {
    render(<Shell />);
    const input = screen.getByLabelText('command') as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: 'cd projects' } });
    fireEvent.submit(input.closest('form')!);
    expect(screen.getByRole('banner').textContent).toBe('hyzii@arch:~/projects');
  });

  it('shows the greeting only at /tui', () => {
    render(<Shell />);
    expect(within(log()).getAllByRole('listitem')).toHaveLength(1);
    expect(log().textContent).toMatch(/type help/);
  });

  it.each([
    ['/tui/resume', `${PROMPT} cat ~/resume.md`, resume.profile.name],
    ['/tui/projects', `${PROMPT} ls ~/projects`, 'space-z/'],
    ['/tui/deployments', `${PROMPT} cat ~/deployments/live.txt`, 'checked:'],
    ['/tui/nope', `${PROMPT} cd ~/nope`, 'cd: ~/nope: No such file or directory'],
  ])('%s runs its command in the terminal', (path, echo, expected) => {
    at(path);
    render(<Shell />);
    expect(log().textContent).toContain(echo);
    expect(log().textContent).toContain(expected);
  });

  it('leaves pane keys alone and lists shell keys in help', () => {
    render(<Shell />);
    fireEvent.keyDown(window, { key: 'Escape' });
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(window, { key: '2' });
    expect(window.location.pathname).toBe('/tui');
    fireEvent.keyDown(window, { key: '?' });
    const text = screen.getByRole('dialog').textContent ?? '';
    expect(text).toMatch(/ctrl\+l/);
    expect(text).toMatch(/ctrl\+c/);
    expect(text).not.toMatch(/1-4/);
  });

  it('boots once, then hands to the terminal', () => {
    vi.useFakeTimers();
    stubMatchMedia((q) => q.includes('pointer')); // desktop, motion allowed
    render(<Shell />);
    expect(screen.queryByRole('log')).toBeNull();
    for (let i = 0; i < 20; i++) act(() => vi.advanceTimersByTime(400));
    expect(log()).toBeTruthy();
    vi.useRealTimers();
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
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByText(/tty1/)).toBeTruthy();
    runBoot();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.queryByText(/tty1/)).toBeNull();
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
    expect(screen.queryByText(/tty1/)).toBeNull();
  });
});

// jsdom computes neither ::before content nor :focus-visible, so the two
// brand rules the shell's stylesheet must keep are read from the source.
describe('Shell stylesheet', () => {
  const css = readFileSync('src/tui/tui.module.css', 'utf8');

  it('draws every focus ring in --primary', () => {
    const rings = css.match(/focus-visible[^{]*\{[^}]*\}/g) ?? [];
    expect(rings.length).toBeGreaterThan(0);
    for (const rule of rings) expect(rule).toContain('var(--primary)');
    expect(rings.join('')).not.toContain('--accent');
  });

  it('hides the decorative heading glyph from assistive tech', () => {
    expect(css).toMatch(/content:\s*'# '\s*\/\s*''/);
  });
});
