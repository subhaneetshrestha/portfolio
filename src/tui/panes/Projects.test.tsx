import { render, screen, within } from '@testing-library/react';
import { projects } from '../../content/projects';
import type { Repo } from '../../content/types';
import { Projects } from './Projects';

const repo = (name: string, over: Partial<Repo> = {}): Repo => ({
  name,
  description: null,
  homepage: 'https://dead.example',
  url: `https://github.com/subhaneetshrestha/${name}`,
  createdAt: '2025-06-01T00:00:00Z',
  pushedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  stars: 0,
  topics: [],
  archived: false,
  languages: { Go: 600, Lua: 100 },
  releases: null,
  ...over,
});

const rel = (tag: string) => ({ tag, name: tag, prerelease: false, publishedAt: '2026-01-01T00:00:00Z', url: 'https://r', assets: [] });
const fixture = projects([repo('space-z', { releases: [rel('v3'), rel('v2'), rel('v1')] }), repo('atomic-launcher', { releases: [rel('edge')] }), repo('zzz')]);

const article = (id: string) => screen.getByRole('heading', { level: 2, name: id }).closest('article')!;

describe('Projects pane', () => {
  it('lists every curated project in curated order, each under its own heading', () => {
    render(<Projects list={fixture} />);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'atomic-launcher', 'space-z', 'nepse-analyzer', 'karya', 'flavique', 'smart-wallet', 'footy-manager', 'footy-stonks',
    ]);
  });

  it('renders the curated words, not the GitHub description', () => {
    render(<Projects list={fixture} />);
    expect(within(article('space-z')).getByText(/vertical-ascent roguelite/)).toBeTruthy();
    expect(screen.queryByText('zzz')).toBeNull();
  });

  it('footers a public repo with its link, last push and release count', () => {
    render(<Projects list={fixture} />);
    const foot = within(article('space-z'));
    expect(foot.getByRole('link', { name: 'github.com/subhaneetshrestha/space-z' }).getAttribute('href')).toBe(
      'https://github.com/subhaneetshrestha/space-z',
    );
    expect(foot.getByText(/last push 3 days ago/)).toBeTruthy();
    expect(foot.getByText(/3 releases/)).toBeTruthy();
    expect(within(article('atomic-launcher')).getByText(/1 release\b/)).toBeTruthy();
  });

  it('says so when the repo is not public, and links nothing', () => {
    render(<Projects list={fixture} />);
    const karya = within(article('karya'));
    expect(karya.getByText('repository not public')).toBeTruthy();
    expect(karya.queryByRole('link')).toBeNull();
    expect(karya.queryByText(/release/)).toBeNull();
  });

  it('renders no homepage, language bytes or API prose anywhere', () => {
    render(<Projects list={fixture} />);
    expect(screen.queryByRole('link', { name: /dead\.example/ })).toBeNull();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByRole('blockquote')).toBeNull();
  });

  it('shows the unfinished draft as visible placeholders', () => {
    render(<Projects list={fixture} />);
    expect(within(article('footy-stonks')).getAllByText('[to be filled]').length).toBeGreaterThan(0);
  });

  it('says so in plain words when there is nothing to list', () => {
    render(<Projects list={[]} />);
    expect(screen.getByText('nothing featured yet.')).toBeTruthy();
    expect(screen.queryByText(/generated/)).toBeNull();
  });
});
