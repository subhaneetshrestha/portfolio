import raw from './github.generated.json';
import type { GithubData, Release, Repo } from './types';

// The build must never depend on the network, so the JSON is committed.
// Missing file: tsc and vite both refuse to build ("Cannot find module").
// Malformed file: validate() throws below, at module load.

const fail = (why: string): never => {
  throw new Error(`content: github.generated.json ${why} — run npm run content`);
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown) => typeof v === 'string';
const strOrNull = (v: unknown) => v === null || str(v);
const num = (v: unknown) => typeof v === 'number';
const bool = (v: unknown) => typeof v === 'boolean';
const every = (v: unknown, ok: (x: unknown) => boolean) => Array.isArray(v) && v.every(ok);

const isRelease = (r: unknown): r is Release =>
  isObj(r) &&
  str(r.tag) && str(r.name) && bool(r.prerelease) && str(r.publishedAt) && str(r.url) &&
  every(r.assets, (a) => isObj(a) && str(a.name) && str(a.url) && num(a.size));

const isRepo = (r: unknown): r is Repo =>
  isObj(r) &&
  str(r.name) && strOrNull(r.description) && strOrNull(r.homepage) && str(r.url) &&
  str(r.createdAt) && str(r.pushedAt) && num(r.stars) && every(r.topics, str) && bool(r.archived) &&
  (r.languages === null || (isObj(r.languages) && Object.values(r.languages).every(num))) &&
  strOrNull(r.readme) &&
  (r.releases === null || every(r.releases, isRelease));

export function validate(raw: unknown): GithubData {
  if (!isObj(raw)) return fail('is not an object');
  if (!str(raw.fetchedAt) || !str(raw.checkedAt)) return fail('lacks fetchedAt/checkedAt');
  if (!isObj(raw.liveness) || !Object.values(raw.liveness).every(num)) return fail('has a malformed liveness map');
  if (!Array.isArray(raw.repos)) return fail('has no repos array');
  if (raw.repos.length === 0) return fail('has no repos');
  const bad = raw.repos.find((r) => !isRepo(r));
  if (bad) return fail(`has a malformed repo${isObj(bad) && str(bad.name) ? `: ${bad.name}` : ''}`);
  return raw as unknown as GithubData;
}

export const github = validate(raw);
