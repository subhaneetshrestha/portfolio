import { projects } from './projects';
import type { Repo } from './types';

const repo = (name: string, over: Partial<Repo> = {}): Repo => ({
  name,
  description: null,
  homepage: null,
  url: `https://github.com/subhaneetshrestha/${name}`,
  createdAt: '2025-06-01T00:00:00Z',
  pushedAt: '2025-06-01T00:00:00Z',
  stars: 0,
  topics: [],
  archived: false,
  languages: null,
  readme: null,
  releases: null,
  ...over,
});

const names = (list: { name: string }[]) => list.map((p) => p.name);

describe('projects', () => {
  it('puts featured repos first in curated order, regardless of push date', () => {
    const out = projects([
      repo('space-z', { pushedAt: '2026-09-01T00:00:00Z' }),
      repo('zzz', { pushedAt: '2026-12-01T00:00:00Z' }),
      repo('atomic-launcher', { pushedAt: '2026-01-01T00:00:00Z' }),
    ]);
    expect(names(out)).toEqual(['atomic-launcher', 'space-z', 'zzz']);
    expect(out.map((p) => p.featured)).toEqual([true, true, false]);
  });

  it('orders the remaining active repos by most recent push', () => {
    const out = projects([
      repo('old', { pushedAt: '2025-01-01T00:00:00Z' }),
      repo('new', { pushedAt: '2026-01-01T00:00:00Z' }),
    ]);
    expect(names(out)).toEqual(['new', 'old']);
  });

  it('archives repos created before 2022, by name, or flagged archived on GitHub, and lists them last', () => {
    const out = projects([
      repo('crwn-clothing', { pushedAt: '2026-12-01T00:00:00Z' }),
      repo('movie-go', { createdAt: '2021-07-11T00:00:00Z', pushedAt: '2026-12-01T00:00:00Z' }),
      repo('frozen', { archived: true, pushedAt: '2026-12-01T00:00:00Z' }),
      repo('active', { pushedAt: '2024-01-01T00:00:00Z' }),
    ]);
    expect(names(out)).toEqual(['active', 'crwn-clothing', 'movie-go', 'frozen']);
    expect(out.map((p) => p.archived)).toEqual([false, true, true, true]);
  });

  it('drops the profile repo', () => {
    expect(names(projects([repo('subhaneetshrestha'), repo('a')]))).toEqual(['a']);
  });

  it('tolerates featured names that are absent from the data', () => {
    expect(names(projects([repo('a')]))).toEqual(['a']);
  });
});
