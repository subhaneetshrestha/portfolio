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
const EXCERPT_MAX = 300;

// ---- pure helpers (unit-tested in tests/fetch-github.test.ts) ----

const isNoise = (line: string) => /^(!\[|\[!\[|<|#|\||[-*_]{3,}\s*$)/.test(line);

const stripMarkdown = (s: string) =>
  s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

/** First prose paragraph after the H1 (or the first one at all), markdown stripped, ≤300 chars. */
export function readmeExcerpt(md: string): string | null {
  const lines = md.replace(/```[\s\S]*?```/g, '').split(/\r?\n/);
  const h1 = lines.findIndex((l) => /^#\s/.test(l));
  const body = lines.slice(h1 + 1);
  const paragraphs: string[][] = [[]];
  for (const line of body) {
    if (line.trim() === '') { if (paragraphs.at(-1)!.length) paragraphs.push([]); continue; }
    if (isNoise(line.trim())) continue;
    paragraphs.at(-1)!.push(line.trim());
  }
  const first = paragraphs.find((p) => p.length > 0);
  if (!first) return null;
  const text = stripMarkdown(first.join(' '));
  if (!text) return null;
  if (text.length <= EXCERPT_MAX) return text;
  const cut = text.slice(0, EXCERPT_MAX - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).trimEnd() + '…';
}

/** Recursively sorts object keys so the committed JSON diffs cleanly. Arrays keep their order. */
export function sortKeys<T>(v: T): T {
  if (Array.isArray(v)) return v.map(sortKeys) as T;
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])])) as T;
  }
  return v;
}

// ---- network ----

const token = () => {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try { return execFileSync('gh', ['auth', 'token'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; }
};

const warn = (msg: string) => console.warn(`warn: ${msg}`);

async function main() {
  const auth = token();
  if (!auth) warn('no GITHUB_TOKEN and gh is not logged in: unauthenticated, 60 requests/hour; this run needs about 60');
  const headers: Record<string, string> = {
    Accept: JSON_ACCEPT,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': `${USER}-portfolio`,
    ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
  };

  /** GET one API path. Returns null (after a warning) on any non-200 so a failed field is null, never fabricated. */
  const get = async (path: string, accept = JSON_ACCEPT): Promise<unknown> => {
    const res = await fetch(`${API}${path}`, { headers: { ...headers, Accept: accept } });
    if (res.status === 200) return accept.includes('raw') ? res.text() : res.json();
    if (res.headers.get('x-ratelimit-remaining') === '0') {
      const reset = new Date(Number(res.headers.get('x-ratelimit-reset')) * 1000).toISOString();
      throw new Error(`GitHub rate limit exhausted; resets at ${reset}. Set GITHUB_TOKEN or log in with gh.`);
    }
    if (res.status !== 404) warn(`GET ${path} -> ${res.status}`);
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
  console.log(`${raw.length} repos, ${own.length} non-fork`);

  type RawRelease = {
    tag_name: string; name: string | null; prerelease: boolean; published_at: string; html_url: string;
    assets: { name: string; browser_download_url: string; size: number }[];
  };
  const repos: Repo[] = [];
  for (const r of own) {
    const [languages, readme, releases] = await Promise.all([
      get(`/repos/${USER}/${r.name}/languages`) as Promise<Record<string, number> | null>,
      get(`/repos/${USER}/${r.name}/readme`, 'application/vnd.github.raw+json') as Promise<string | null>,
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
      readme: readme === null ? null : readmeExcerpt(readme),
      releases: releases === null ? null : releases.map((x): Release => ({
        tag: x.tag_name,
        name: x.name ?? x.tag_name,
        prerelease: x.prerelease,
        publishedAt: x.published_at,
        url: x.html_url,
        assets: x.assets.map((a) => ({ name: a.name, url: a.browser_download_url, size: a.size })),
      })),
    });
    process.stdout.write('.');
  }
  console.log();
  repos.sort((a, b) => a.name.localeCompare(b.name));

  // Liveness: real status codes, dead URLs recorded rather than dropped.
  const urls = new Set([...deployments.flatMap((d) => d.url ?? []), ...repos.flatMap((r) => r.homepage ?? [])]);
  const liveness: Record<string, number> = {};
  await Promise.all([...urls].map(async (url) => {
    try {
      const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(10_000), headers: { 'User-Agent': headers['User-Agent']! } });
      liveness[url] = res.status;
    } catch (e) {
      liveness[url] = 0;
      warn(`GET ${url} failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    console.log(`${String(liveness[url]).padStart(3)} ${url}`);
  }));

  const now = new Date().toISOString();
  const data: GithubData = { fetchedAt: now, checkedAt: now, liveness, repos };
  writeFileSync(OUT, JSON.stringify(sortKeys(data), null, 2) + '\n');
  console.log(`wrote ${OUT.pathname}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`error: ${e instanceof Error ? e.message : e}`); process.exit(1); });
}
