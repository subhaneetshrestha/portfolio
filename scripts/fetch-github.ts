// Build-time content fetch. Runs with plain `node scripts/fetch-github.ts`
// (Node 24 strips types; keep to erasable syntax and explicit .ts imports).
// Writes src/content/github.generated.json, which is committed so the build
// never touches the network.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { deployments } from '../src/content/deployments.ts';
import type { GithubData, Release, Repo } from '../src/content/types.ts';

const USER = 'subhaneetshrestha';
const API = 'https://api.github.com';
const JSON_ACCEPT = 'application/vnd.github+json';
const OUT = new URL('../src/content/github.generated.json', import.meta.url);

// ---- pure helpers (unit-tested in tests/fetch-github.test.ts) ----

/** Recursively sorts object keys so the committed JSON diffs cleanly. Arrays keep their order. */
export function sortKeys<T>(v: T): T {
  if (Array.isArray(v)) return v.map(sortKeys) as T;
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])])) as T;
  }
  return v;
}

type RawRelease = {
  tag_name: string; name: string | null; draft: boolean; prerelease: boolean; published_at: string; html_url: string;
  assets: { name: string; browser_download_url: string; size: number }[];
};

/** Published releases only: drafts have no published_at and their asset URLs are not public. */
export function releasesOf(raw: RawRelease[]): Release[] {
  return raw.filter((x) => !x.draft).map((x) => ({
    tag: x.tag_name,
    name: x.name ?? x.tag_name,
    prerelease: x.prerelease,
    publishedAt: x.published_at,
    url: x.html_url,
    assets: x.assets.map((a) => ({ name: a.name, url: a.browser_download_url, size: a.size })),
  }));
}

const warn = (msg: string) => console.warn(`warn: ${msg}`);

/** Final status per URL after redirects; 0 when the request never completed. Dead URLs are recorded, never dropped. */
export async function checkLiveness(urls: Iterable<string>, get: typeof fetch = fetch): Promise<Record<string, number>> {
  const liveness: Record<string, number> = {};
  await Promise.all([...urls].map(async (url) => {
    try {
      const res = await get(url, { redirect: 'follow', signal: AbortSignal.timeout(10_000), headers: { 'User-Agent': `${USER}-portfolio` } });
      liveness[url] = res.status;
    } catch (e) {
      liveness[url] = 0;
      warn(`GET ${url} failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }));
  return liveness;
}

// ---- network ----

const token = () => {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try { return execFileSync('gh', ['auth', 'token'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; }
};

async function main() {
  const auth = token();
  if (!auth) warn('no GITHUB_TOKEN and gh is not logged in: unauthenticated, 60 requests/hour; two per repo plus the listing');
  const headers: Record<string, string> = {
    Accept: JSON_ACCEPT,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': `${USER}-portfolio`,
    ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
  };

  /** GET one API path. 404 is data (null). Any other non-200 is a failure: recorded, still null, and fails the run at the end. */
  const failed: string[] = [];
  const get = async (path: string): Promise<unknown> => {
    const res = await fetch(`${API}${path}`, { headers });
    if (res.status === 200) return res.json();
    if (res.headers.get('x-ratelimit-remaining') === '0') {
      const reset = new Date(Number(res.headers.get('x-ratelimit-reset')) * 1000).toISOString();
      throw new Error(`GitHub rate limit exhausted; resets at ${reset}. Set GITHUB_TOKEN or log in with gh.`);
    }
    if (res.status !== 404) { warn(`GET ${path} -> ${res.status}`); failed.push(`${res.status} ${path}`); }
    return null;
  };

  type RawRepo = {
    name: string; fork: boolean; archived: boolean; description: string | null; homepage: string | null;
    html_url: string; created_at: string; pushed_at: string; stargazers_count: number; topics?: string[];
  };
  const raw: RawRepo[] = [];
  for (let page = 1; ; page++) {
    const batch = (await get(`/users/${USER}/repos?per_page=100&type=owner&page=${page}`)) as RawRepo[] | null;
    if (batch === null) throw new Error('repo listing failed; refusing to write an empty portfolio');
    raw.push(...batch);
    if (batch.length < 100) break;
  }
  const own = raw.filter((r) => !r.fork);
  if (own.length === 0) throw new Error('no non-fork repos; refusing to write an empty portfolio');
  console.log(`${raw.length} repos, ${own.length} non-fork`);

  const repos: Repo[] = [];
  for (const r of own) {
    const [languages, releases] = await Promise.all([
      get(`/repos/${USER}/${r.name}/languages`) as Promise<Record<string, number> | null>,
      get(`/repos/${USER}/${r.name}/releases`) as Promise<RawRelease[] | null>,
    ]);
    repos.push({
      name: r.name,
      description: r.description || null,
      homepage: r.homepage || null,
      url: r.html_url,
      createdAt: r.created_at,
      pushedAt: r.pushed_at,
      stars: r.stargazers_count,
      topics: r.topics ?? [],
      archived: r.archived,
      languages,
      releases: releases === null ? null : releasesOf(releases),
    });
    process.stdout.write('.');
  }
  console.log();
  repos.sort((a, b) => a.name.localeCompare(b.name));

  // Liveness: real status codes, dead URLs recorded rather than dropped.
  const urls = new Set([...deployments.flatMap((d) => d.url ?? []), ...repos.flatMap((r) => r.homepage ?? [])]);
  const liveness = await checkLiveness(urls);
  for (const [url, code] of Object.entries(liveness)) console.log(`${String(code).padStart(3)} ${url}`);

  const now = new Date().toISOString();
  const data: GithubData = { fetchedAt: now, checkedAt: now, liveness, repos };
  writeFileSync(OUT, JSON.stringify(sortKeys(data), null, 2) + '\n');
  console.log(`wrote ${OUT.pathname}`);
  // Written anyway so the partial data can be inspected; the exit code is what CI must see.
  if (failed.length) {
    warn(`${failed.length} request(s) failed; the nulls they left are not facts:\n  ${failed.join('\n  ')}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`error: ${e instanceof Error ? e.message : e}`); process.exit(1); });
}
