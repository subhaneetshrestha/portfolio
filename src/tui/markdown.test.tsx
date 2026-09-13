import { render, screen } from '@testing-library/react';
import { Markdown } from './markdown';

describe('Markdown', () => {
  it('turns a "# " line into a level-2 heading', () => {
    render(<Markdown text={'# space-z\n\nA roguelite.'} />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('space-z');
  });

  it('keeps hard-wrapped lines in one paragraph, breaks intact, and splits paragraphs on blank lines', () => {
    render(<Markdown text={'One line\nwraps here.\n\nSecond paragraph.'} />);
    expect(screen.getByText('One line wraps here.').textContent).toBe('One line\nwraps here.');
    expect(screen.getByText('Second paragraph.')).toBeTruthy();
  });

  it('starts a new paragraph at status: and stack: lines and marks the key', () => {
    render(<Markdown text={'status: content-complete;\nbalancing.\nstack: Lua, LÖVE 11'} />);
    const status = screen.getByText('status:');
    expect(status.parentElement?.textContent).toBe('status: content-complete;\nbalancing.');
    expect(screen.getByText('stack:').parentElement?.textContent).toBe('stack: Lua, LÖVE 11');
  });

  it('links bare URLs, leaving trailing punctuation as text', () => {
    render(<Markdown text={'See https://example.com/a_b. Then https://x.dev'} />);
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['https://example.com/a_b', 'https://x.dev']);
    expect(links[0]!.textContent).toBe('https://example.com/a_b');
  });

  it('renders [fill in] and [fill in: hint] as a visible placeholder, never the hint', () => {
    render(<Markdown text={'[fill in: one paragraph — what it is.]\n\nstatus: [fill in]'} />);
    expect(screen.getAllByText('[to be filled]')).toHaveLength(2);
    expect(screen.queryByText(/one paragraph/)).toBeNull();
  });
});
