import { fireEvent, render, screen, within } from '@testing-library/react';
import { PROMPT } from '../content/resume';
import { CommandLine } from './CommandLine';

const at = (path: string) => window.history.replaceState(null, '', path);
const input = () => screen.getByLabelText('command') as HTMLInputElement;
const type = (value: string) => fireEvent.change(input(), { target: { value } });
const enter = (value: string) => {
  type(value);
  fireEvent.submit(input().closest('form')!);
};

beforeEach(() => at('/tui'));

describe('CommandLine', () => {
  it('shows the prompt as the visible label of the input', () => {
    render(<CommandLine />);
    expect(screen.getByText('hyzii@arch:~$', { selector: 'label' })).toBeTruthy();
    expect(input().getAttribute('autocomplete')).toBe('off');
    expect(input().getAttribute('spellcheck')).toBe('false');
  });

  it('runs the command on Enter and clears the input', () => {
    render(<CommandLine />);
    enter('resume');
    expect(window.location.pathname).toBe('/tui/resume');
    expect(input().value).toBe('');
  });

  it('logs what was typed and what came back in a live region', () => {
    render(<CommandLine />);
    enter('whoami');
    const log = screen.getByRole('log');
    expect(log.getAttribute('aria-live')).toBe('polite');
    const items = within(log).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]!.textContent).toContain(`${PROMPT} whoami`);
    expect(items[0]!.textContent).toContain('Subhaneet Shrestha');
  });

  it('tells you when a command does not exist', () => {
    render(<CommandLine />);
    enter('nope');
    expect(screen.getByRole('log').textContent).toContain('bash: nope: command not found. try help.');
  });

  it('clear empties the log', () => {
    render(<CommandLine />);
    enter('whoami');
    enter('clear');
    expect(within(screen.getByRole('log')).queryAllByRole('listitem')).toHaveLength(0);
  });

  it('keeps at most 50 entries', () => {
    render(<CommandLine />);
    for (let i = 0; i < 55; i++) enter(`whoami`);
    expect(within(screen.getByRole('log')).getAllByRole('listitem')).toHaveLength(50);
  });

  it('ignores an empty Enter', () => {
    render(<CommandLine />);
    enter('   ');
    expect(within(screen.getByRole('log')).queryAllByRole('listitem')).toHaveLength(0);
  });

  it('ArrowUp recalls the previous input, ArrowDown walks back to empty', () => {
    render(<CommandLine />);
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
    render(<CommandLine />);
    enter('whoami');
    type('hel');
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(input().value).toBe('whoami');
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(input().value).toBe('hel');
  });

  it('ArrowUp with no history and ArrowDown at the live line leave the input alone', () => {
    render(<CommandLine />);
    type('abc');
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(input().value).toBe('abc');
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(input().value).toBe('abc');
  });

  it('Tab completes a single match in place', () => {
    render(<CommandLine />);
    type('dep');
    expect(fireEvent.keyDown(input(), { key: 'Tab' })).toBe(false);
    expect(input().value).toBe('deployments ');
  });

  it('Tab lists several matches in the log and leaves the input alone', () => {
    render(<CommandLine />);
    type('p');
    fireEvent.keyDown(input(), { key: 'Tab' });
    expect(input().value).toBe('p');
    expect(screen.getByRole('log').textContent).toMatch(/projects/);
    expect(screen.getByRole('log').textContent).toMatch(/poweroff/);
  });

  it('Tab with no match does nothing', () => {
    render(<CommandLine />);
    type('zzz');
    fireEvent.keyDown(input(), { key: 'Tab' });
    expect(input().value).toBe('zzz');
    expect(within(screen.getByRole('log')).queryAllByRole('listitem')).toHaveLength(0);
  });

  it('Escape blurs the input so shell shortcuts resume', () => {
    render(<CommandLine />);
    input().focus();
    expect(document.activeElement).toBe(input());
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(document.activeElement).not.toBe(input());
  });
});
