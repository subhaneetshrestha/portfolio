import { github } from './github';
import type { Project, Repo } from './types';

// The words are the user's own, one file per project; the facts are joined
// from github.generated.json. A private repo is still a project: it just has
// no link, no push date and no releases.
const FEATURED = [
  'atomic-launcher', 'space-z', 'nepse-analyzer', 'karya', 'flavique', 'smart-wallet', 'footy-manager', 'footy-stonks',
];
const FILES = import.meta.glob<string>('./projects/*.md', { query: '?raw', import: 'default', eager: true });
const order = (id: string) => (FEATURED.includes(id) ? FEATURED.indexOf(id) : FEATURED.length);

/** Every curated README, in curated order, joined with its public repo when there is one. */
export function projects(repos: Repo[] = github.repos): Project[] {
  return Object.entries(FILES)
    .map(([path, markdown]) => {
      const id = path.slice(path.lastIndexOf('/') + 1, -'.md'.length);
      const repo = repos.find((r) => r.name === id);
      return { id, markdown, repoUrl: repo?.url ?? null, pushedAt: repo?.pushedAt ?? null, releases: repo?.releases ?? [] };
    })
    .sort((a, b) => order(a.id) - order(b.id));
}
