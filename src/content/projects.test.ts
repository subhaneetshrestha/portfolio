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
  releases: null,
  ...over,
});

const CURATED = [
  'atomic-launcher', 'space-z', 'nepse-analyzer', 'karya', 'flavique', 'smart-wallet', 'footy-manager', 'footy-stonks',
];

describe('projects', () => {
  it('returns every curated file, in curated order, whatever the public data holds', () => {
    expect(projects([]).map((p) => p.id)).toEqual(CURATED);
    expect(projects([repo('zzz')]).map((p) => p.id)).toEqual(CURATED);
  });

  it('carries each file as markdown headed by its own id', () => {
    for (const p of projects([])) expect(p.markdown.split('\n')[0]).toBe(`# ${p.id}`);
  });

  it('joins the public repo when there is one and leaves the link null when there is not', () => {
    const rel = { tag: 'v1', name: 'v1', prerelease: false, publishedAt: '2026-01-01T00:00:00Z', url: 'https://r', assets: [] };
    const out = projects([repo('space-z', { pushedAt: '2026-08-12T17:30:22Z', releases: [rel] }), repo('flavique')]);
    const byId = new Map(out.map((p) => [p.id, p]));
    expect(byId.get('space-z')).toMatchObject({
      repoUrl: 'https://github.com/subhaneetshrestha/space-z',
      pushedAt: '2026-08-12T17:30:22Z',
      releases: [rel],
    });
    expect(byId.get('flavique')).toMatchObject({ repoUrl: 'https://github.com/subhaneetshrestha/flavique', releases: [] });
    expect(byId.get('karya')).toMatchObject({ repoUrl: null, pushedAt: null, releases: [] });
  });
});
