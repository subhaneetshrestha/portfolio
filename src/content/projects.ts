import { github } from './github';
import type { Project, Repo } from './types';

// Curation only; the data comes from github.generated.json.
const FEATURED = [
  'atomic-launcher', 'space-z', 'nepse-analyzer', 'karya', 'flavique', 'smart-wallet', 'footy-manager', 'footy-stonks',
];
const ARCHIVE = new Set([
  'crwn-clothing', 'movie-go', 'react-ecommerce', 'monsters-holobox', 'devcamperapi',
  'lereddit', 'reddit-client', 'my-social', 'yak', 'keepup',
]);
const ARCHIVE_BEFORE = '2022-01-01';
const EXCLUDE = new Set(['subhaneetshrestha']);

const byPush = (a: Repo, b: Repo) => b.pushedAt.localeCompare(a.pushedAt);

/** Featured in curated order, then active repos by last push, then the archive. */
export function projects(repos: Repo[] = github.repos): Project[] {
  const byName = new Map(repos.filter((r) => !EXCLUDE.has(r.name)).map((r) => [r.name, r]));
  const featured = FEATURED.flatMap((n) => byName.get(n) ?? []);
  const rest = [...byName.values()].filter((r) => !FEATURED.includes(r.name)).sort(byPush);
  const isArchived = (r: Repo) => r.archived || ARCHIVE.has(r.name) || r.createdAt < ARCHIVE_BEFORE;
  return [
    ...featured.map((r) => ({ ...r, featured: true, archived: isArchived(r) })),
    ...rest.filter((r) => !isArchived(r)).map((r) => ({ ...r, featured: false, archived: false })),
    ...rest.filter(isArchived).map((r) => ({ ...r, featured: false, archived: true })),
  ];
}
