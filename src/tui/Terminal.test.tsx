import { fireEvent, render, screen, within } from '@testing-library/react';
import { PROMPT, resume } from '../content/resume';
import { Terminal } from './Terminal';

const at = (path: string) => window.history.replaceState(null, '', path);
const input = () => screen.getByLabelText('command') as HTMLInputElement;
const log = () => screen.getByRole('log', { name: 'terminal output' });
const items = () => within(log()).queryAllByRole('listitem');
const type = (value: string) => fireEvent.change(input(), { target: { value } });
const enter = (value: string) => {
  type(value);
  fireEvent.submit(input().closest('form')!);
};

beforeEach(() => at('/tui'));

describe('Terminal frame', () => {
  it('shows the prompt as the visible label of the input and follows cwd', () => {
    render(<Terminal />);
    expect(screen.getByText(PROMPT, { selector: 'label' })).toBeTruthy();
    expect(input().getAttribute('autocomplete')).toBe('off');
    expect(input().getAttribute('spellcheck')).toBe('false');
    enter('cd projects');
    expect(screen.getByText('hyzii@arch:~/projects$', { selector: 'label' })).toBeTruthy();
  });

  it('keeps the scrollback in a focusable polite live region', () => {
    render(<Terminal />);
    expect(log().getAttribute('aria-live')).toBe('polite');
    expect(log().tabIndex).toBe(0);
  });

  it('greets once with a message that ends in "type help", and only once', () => {
    render(<Terminal />);
    expect(items()).toHaveLength(1);
    expect(log().textContent).toMatch(/type help/);
    enter('whoami');
    expect(log().textContent?.match(/type help/g)).toHaveLength(1);
  });

  it('runs an initial command after the greeting', () => {
    render(<Terminal initial="cat ~/resume.md" />);
    const [motd, first] = items();
    expect(motd!.textContent).toMatch(/type help/);
    expect(first!.textContent).toContain(`${PROMPT} cat ~/resume.md`);
    expect(first!.textContent).toContain(resume.profile.name);
  });

  it('clicking anywhere in the terminal focuses the input', () => {
    render(<Terminal />);
    fireEvent.click(log());
    expect(document.activeElement).toBe(input());
  });
});

describe('Terminal output', () => {
  it('runs the command on Enter and clears the input', () => {
    render(<Terminal />);
    enter('whoami');
    expect(log().textContent).toContain(resume.profile.name);
    expect(input().value).toBe('');
  });

  it('echoes the prompt as it was when the line ran', () => {
    render(<Terminal />);
    enter('whoami');
    enter('cd projects');
    enter('pwd');
    expect(items()[1]!.textContent).toContain(`${PROMPT} whoami`);
    expect(items()[3]!.textContent).toContain('hyzii@arch:~/projects$ pwd');
  });

  it('renders cat of a .md file as markdown, keeping its line breaks', () => {
    render(<Terminal />);
    enter('cat ~/projects/space-z/README.md');
    expect(within(log()).getByRole('heading', { level: 2 }).textContent).toBe('space-z');
    enter('cat ~/resume.md');
    const p = within(log()).getByText(/EXPERIENCE/);
    expect(p.textContent).toContain('\n');
  });

  it('prints anything else preformatted with URLs as real links', () => {
    render(<Terminal />);
    enter('cat ~/about.txt');
    expect(within(log()).queryByRole('heading')).toBeNull();
    const github = resume.profile.links.find((l) => l.label === 'github')!.url;
    expect(within(log()).getByRole('link', { name: github }).getAttribute('href')).toBe(github);
  });

  it('open goes through a new tab, never the router', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<Terminal />);
    enter('open https://example.com/');
    expect(open).toHaveBeenCalledWith('https://example.com/', '_blank', 'noopener');
    expect(window.location.pathname).toBe('/tui');
    open.mockRestore();
  });

  it('tells you when a command does not exist', () => {
    render(<Terminal />);
    enter('nope');
    expect(log().textContent).toContain('bash: nope: command not found. try help.');
  });

  it('clear empties the screen', () => {
    render(<Terminal />);
    enter('whoami');
    enter('clear');
    expect(items()).toHaveLength(0);
  });

  it('keeps at most 500 lines of scrollback, dropping the oldest whole entries', () => {
    render(<Terminal />);
    for (let i = 0; i < 40; i++) enter('help');
    const linesOf = (li: HTMLElement) => li.textContent!.split('\n').length; // echo + one per output line
    const total = items().reduce((n, li) => n + linesOf(li), 0);
    expect(total).toBeLessThanOrEqual(500);
    expect(total).toBeGreaterThan(500 - linesOf(items()[0]!));
    expect(items()[0]!.textContent).not.toMatch(/type help/);
  });

  it('keeps a surviving entry\'s own DOM node and text stable when older entries are dropped', () => {
    // Regression for keying scrollback <li>s by array index: once cap() drops the
    // oldest entry, every remaining index shifts, and an index key makes React
    // rewrite each surviving node's content in place — silently showing the wrong
    // entry's text at that position (and re-announcing it, since the log is
    // aria-live=polite). A stable per-entry id keeps each node tied to its own
    // entry regardless of how many older ones get dropped around it.
    render(<Terminal />);
    for (let i = 0; i < 20; i++) enter(`echo warm-${i}`); // comfortably short of CAP
    const before = items();
    const survivor = before[before.length - 5]!; // will not itself be evicted below
    const survivorText = survivor.textContent;
    for (let i = 0; i < 235; i++) enter(`echo fill-${i}`); // forces many drops from the front
    const after = items();
    expect(after).toContain(survivor);
    expect(survivor.textContent).toBe(survivorText);
  });

  it('ignores an empty Enter', () => {
    render(<Terminal />);
    enter('   ');
    expect(items()).toHaveLength(1);
  });
});

describe('Terminal keys', () => {
  it('ArrowUp recalls the previous input, ArrowDown walks back to empty', () => {
    render(<Terminal />);
    enter('whoami');
    enter('help');
    expect(fireEvent.keyDown(input(), { key: 'ArrowUp' })).toBe(false);
    expect(input().value).toBe('help');
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(input().value).toBe('whoami');
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(input().value).toBe('whoami');
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(input().value).toBe('help');
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(input().value).toBe('');
  });

  it('ArrowUp parks the half-typed line as a draft and ArrowDown past the newest entry restores it', () => {
    render(<Terminal />);
    enter('whoami');
    type('hel');
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(input().value).toBe('whoami');
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(input().value).toBe('hel');
  });

  it('ArrowUp with no history and ArrowDown at the live line leave the input alone', () => {
    render(<Terminal />);
    type('abc');
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(input().value).toBe('abc');
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(input().value).toBe('abc');
  });

  it('Tab completes a single match in place', () => {
    render(<Terminal />);
    type('cat re');
    expect(fireEvent.keyDown(input(), { key: 'Tab' })).toBe(false);
    expect(input().value).toBe('cat resume.md ');
  });

  it('Tab lists several matches in the scrollback and leaves the input alone', () => {
    render(<Terminal />);
    type('p');
    fireEvent.keyDown(input(), { key: 'Tab' });
    expect(input().value).toBe('p');
    expect(log().textContent).toMatch(/projects/);
    expect(log().textContent).toMatch(/poweroff/);
  });

  it('Tab with no match does nothing', () => {
    render(<Terminal />);
    type('zzz');
    fireEvent.keyDown(input(), { key: 'Tab' });
    expect(input().value).toBe('zzz');
    expect(items()).toHaveLength(1);
  });

  it('Ctrl+L clears the screen', () => {
    render(<Terminal />);
    enter('whoami');
    expect(fireEvent.keyDown(input(), { key: 'l', ctrlKey: true })).toBe(false);
    expect(items()).toHaveLength(0);
  });

  it('Ctrl+C prints ^C after the line, drops it, and keeps it out of history', () => {
    render(<Terminal />);
    enter('whoami');
    type('hel');
    expect(fireEvent.keyDown(input(), { key: 'c', ctrlKey: true })).toBe(false);
    expect(input().value).toBe('');
    expect(items().at(-1)!.textContent).toBe(`${PROMPT} hel^C`);
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(input().value).toBe('whoami');
  });

  it('Ctrl+C with text selected in the input is left to the browser to copy', () => {
    render(<Terminal />);
    type('hello');
    input().setSelectionRange(0, 5);
    expect(fireEvent.keyDown(input(), { key: 'c', ctrlKey: true })).toBe(true);
    expect(input().value).toBe('hello');
  });

  it('Ctrl+U clears the line', () => {
    render(<Terminal />);
    type('hel');
    expect(fireEvent.keyDown(input(), { key: 'u', ctrlKey: true })).toBe(false);
    expect(input().value).toBe('');
    expect(items()).toHaveLength(1);
  });

  it('Escape blurs the input so shell shortcuts resume', () => {
    render(<Terminal />);
    input().focus();
    expect(document.activeElement).toBe(input());
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(document.activeElement).not.toBe(input());
  });
});
