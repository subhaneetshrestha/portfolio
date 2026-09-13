import { fireEvent, render, screen, within } from '@testing-library/react';
import { projects } from '../../content/projects';
import type { Repo } from '../../content/types';
import { Projects } from './Projects';

const repo = (name: string, over: Partial<Repo> = {}): Repo => ({
  name,
  description: `${name} does one thing`,
  homepage: null,
  url: `https://github.com/subhaneetshrestha/${name}`,
  createdAt: '2025-06-01T00:00:00Z',
  pushedAt: '2025-06-01T00:00:00Z',
  stars: 0,
  topics: [],
  archived: false,
  languages: { Go: 1 },
  readme: null,
  releases: null,
  ...over,
});

// Featured out of curated order on purpose; the pane must not re-sort.
const fixture = projects([
  repo('space-z', { languages: { Lua: 100 }, readme: 'A 2D space-themed roguelite for phones and PC.' }),
  repo('zzz', { pushedAt: '2026-01-01T00:00:00Z', homepage: 'https://zzz.example', readme: '' }),
  repo('atomic-launcher', {
    languages: { Go: 600, TypeScript: 250, Lua: 100, Shell: 50 },
    pushedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    readme: 'This project was generated using Angular CLI version 19.2.4.',
  }),
  repo('crwn-clothing', { createdAt: '2021-03-01T00:00:00Z', description: null }),
]);

const list = () => screen.getByRole('region', { name: /project list/i });
const selected = () => screen.getByRole('button', { current: true });
const detail = () => screen.getByRole('region', { name: /project detail/i });

describe('Projects list', () => {
  it('renders featured projects first, in the order the data gives them', () => {
    render(<Projects list={fixture} />);
    const featured = within(screen.getByRole('list', { name: 'featured' })).getAllByRole('button');
    expect(featured.map((b) => b.textContent)).toEqual(['atomic-launcher', 'space-z']);
    expect(within(screen.getByRole('list', { name: 'active' })).getAllByRole('button').map((b) => b.textContent)).toEqual(['zzz']);
  });

  it('selects the first project by default and shows it in the detail', () => {
    render(<Projects list={fixture} />);
    expect(selected().textContent).toBe('atomic-launcher');
    expect(within(detail()).getByRole('heading', { level: 2 }).textContent).toBe('atomic-launcher');
  });

  it('keeps the archive collapsed by default but lists the archived repo inside it', () => {
    render(<Projects list={fixture} />);
    const archive = screen.getByText(/archive/, { selector: 'summary' }).closest('details')!;
    expect(archive.open).toBe(false);
    expect(within(archive).getByRole('button', { name: 'crwn-clothing', hidden: true })).toBeTruthy();
  });

  it('clicking an item selects it', () => {
    render(<Projects list={fixture} />);
    fireEvent.click(screen.getByRole('button', { name: 'zzz' }));
    expect(selected().textContent).toBe('zzz');
    expect(within(detail()).getByRole('heading', { level: 2 }).textContent).toBe('zzz');
  });

  it('says so when there is nothing to list', () => {
    render(<Projects list={[]} />);
    expect(screen.getByText(/no repositories/i)).toBeTruthy();
  });
});

describe('Projects keyboard', () => {
  it('j/k and the arrows move the selection and swallow the key', () => {
    render(<Projects list={fixture} />);
    expect(fireEvent.keyDown(list(), { key: 'j' })).toBe(false);
    expect(selected().textContent).toBe('space-z');
    expect(fireEvent.keyDown(list(), { key: 'ArrowDown' })).toBe(false);
    expect(selected().textContent).toBe('zzz');
    expect(fireEvent.keyDown(list(), { key: 'k' })).toBe(false);
    expect(selected().textContent).toBe('space-z');
    expect(fireEvent.keyDown(list(), { key: 'ArrowUp' })).toBe(false);
    expect(selected().textContent).toBe('atomic-launcher');
  });

  it('stops at the ends instead of wrapping', () => {
    render(<Projects list={fixture} />);
    fireEvent.keyDown(list(), { key: 'k' });
    expect(selected().textContent).toBe('atomic-launcher');
  });

  it('skips archived items while the archive is collapsed, walks them once it is open', () => {
    render(<Projects list={fixture} />);
    fireEvent.keyDown(list(), { key: 'j' });
    fireEvent.keyDown(list(), { key: 'j' });
    fireEvent.keyDown(list(), { key: 'j' });
    expect(selected().textContent).toBe('zzz');
    screen.getByText(/archive/, { selector: 'summary' }).closest('details')!.open = true;
    fireEvent.keyDown(list(), { key: 'j' });
    expect(selected().textContent).toBe('crwn-clothing');
  });

  it('Enter moves focus to the detail, Escape brings it back to the list', () => {
    render(<Projects list={fixture} />);
    list().focus();
    expect(fireEvent.keyDown(list(), { key: 'Enter' })).toBe(false);
    expect(document.activeElement).toBe(detail());
    expect(fireEvent.keyDown(detail(), { key: 'Escape' })).toBe(false);
    expect(document.activeElement).toBe(list());
  });

  it('leaves other keys to the shell', () => {
    render(<Projects list={fixture} />);
    expect(fireEvent.keyDown(list(), { key: 'l' })).toBe(true);
    expect(fireEvent.keyDown(list(), { key: '2' })).toBe(true);
  });
});

describe('Projects detail', () => {
  it('sizes language segments by byte share, summing to 100, and names the top three in text', () => {
    const { container } = render(<Projects list={fixture} />);
    const widths = [...container.querySelectorAll('[aria-hidden="true"] > *')].map((s) =>
      parseFloat((s as HTMLElement).style.width),
    );
    expect(widths).toHaveLength(4);
    expect(widths.reduce((a, b) => a + b, 0)).toBeCloseTo(100);
    expect(within(detail()).getByText('Go 60% · TypeScript 25% · Lua 10%')).toBeTruthy();
  });

  it('quotes a real README excerpt and cites the repo', () => {
    render(<Projects list={fixture} />);
    fireEvent.click(screen.getByRole('button', { name: 'space-z' }));
    const quote = screen.getByRole('blockquote');
    expect(quote.textContent).toBe('A 2D space-themed roguelite for phones and PC.');
    expect(quote.getAttribute('cite')).toBe('https://github.com/subhaneetshrestha/space-z');
  });

  it('renders no excerpt for an empty README', () => {
    render(<Projects list={fixture} />);
    fireEvent.click(screen.getByRole('button', { name: 'zzz' }));
    expect(screen.queryByRole('blockquote')).toBeNull();
  });

  it('renders no excerpt for generator boilerplate', () => {
    render(<Projects list={fixture} />);
    expect(screen.queryByRole('blockquote')).toBeNull();
    expect(screen.queryByText(/Angular CLI/)).toBeNull();
  });

  it('shows push recency, creation year and the repo link', () => {
    render(<Projects list={fixture} />);
    expect(screen.getByText('pushed 3 days ago · created 2025')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'github.com/subhaneetshrestha/atomic-launcher' }).getAttribute('href')).toBe(
      'https://github.com/subhaneetshrestha/atomic-launcher',
    );
    expect(screen.queryByRole('link', { name: /zzz\.example/ })).toBeNull();
  });

  it('links the homepage when there is one', () => {
    render(<Projects list={fixture} />);
    fireEvent.click(screen.getByRole('button', { name: 'zzz' }));
    expect(screen.getByRole('link', { name: 'zzz.example' }).getAttribute('href')).toBe('https://zzz.example');
  });

  it('names missing data honestly instead of leaving a gap', () => {
    render(<Projects list={fixture} />);
    screen.getByText(/archive/, { selector: 'summary' }).closest('details')!.open = true;
    fireEvent.click(screen.getByRole('button', { name: 'crwn-clothing' }));
    expect(screen.getByText('no description on GitHub')).toBeTruthy();
  });

  it('says so when GitHub reports no language bytes', () => {
    render(<Projects list={projects([repo('quiet', { languages: null })])} />);
    expect(screen.getByText('no language data')).toBeTruthy();
  });
});
