import { deployments } from '../content/deployments';
import { github } from '../content/github';
import { projects } from '../content/projects';
import { PLACEHOLDER, resumeText } from '../content/resumeText';
import { PROMPT, resume } from '../content/resume';
import type { Release } from '../content/types';
import { codeText } from './panes/Deployments';

// A read-only tree built once from the content layer. No React: the shell
// commands run against it in plain tests.

export const HOME = `/home/${resume.profile.handle}`;

const { profile } = resume;
const featured = projects();
/** Rows as aligned columns, two spaces apart; the last cell is never padded. */
const column = (rows: string[][]) => {
  const w = rows[0]!.map((_, i) => Math.max(...rows.map((r) => r[i]!.length)));
  return rows.map((r) => r.map((c, i) => (i === r.length - 1 ? c : c.padEnd(w[i]!))).join('  '));
};
const assets = (r: Release) => r.assets.map((a) => `  ${a.name}  ${a.url}`);

const about = [
  profile.name,
  `${profile.title} @ ${profile.company}`,
  profile.location,
  '',
  profile.bio,
  '',
  profile.summary,
  '',
  ...column(profile.links.map((l) => [l.label, l.url])),
].join('\n');

const contact = column(profile.links.map((l) => [l.label, l.url.replace('mailto:', '')])).join('\n');

const projectsIndex = [
  '# projects',
  '',
  ...featured.map((p) => `${p.id}/`),
  '',
  `everything else: ${profile.links.find((l) => l.label === 'github')?.url ?? PLACEHOLDER}`,
].join('\n');

const readme = (p: (typeof featured)[number]) => {
  const latest = p.releases[0];
  return [
    p.markdown.trimEnd(),
    '',
    p.repoUrl ? `repo: ${p.repoUrl}` : 'repo: private',
    ...(p.pushedAt ? [`last push: ${p.pushedAt}`] : []),
    ...(latest ? [`release: ${latest.tag}${latest.prerelease ? ' (pre-release)' : ''}`, ...assets(latest)] : []),
  ].join('\n');
};

const live = [
  ...column(
    deployments
      .filter((d) => d.url)
      .map((d) => {
        const note = [d.kind === 'retired' ? 'retired' : '', d.note ?? ''].filter(Boolean).join(' — ');
        return [d.label, codeText(github.liveness[d.url!]), `${d.url}${note ? `  ${note}` : ''}`];
      }),
  ),
  '',
  `checked: ${github.checkedAt}`,
].join('\n');

const releases = deployments
  .filter((d) => d.kind === 'release')
  .flatMap((d) => {
    const repo = github.repos.find((r) => r.name === d.repo);
    if (!repo) return [`${d.label}: repository not public`];
    if (!repo.releases?.length) return [`${d.label}: no release published yet  ${repo.url}/releases`];
    return repo.releases.flatMap((r) => [
      `${d.label} ${r.tag}${r.prerelease ? ' (pre-release)' : ''}`,
      ...(r.assets.length ? assets(r) : ['  no files attached']),
    ]);
  })
  .join('\n');

const bashrc = [
  `# PS1 renders as: ${PROMPT}`,
  "alias ll='ls -l'",
  "alias la='ls -a'",
  "alias resume='cat ~/resume.md'",
  "alias projects='ls ~/projects'",
].join('\n');

const files: Record<string, string> = {
  [`${HOME}/about.txt`]: about,
  [`${HOME}/resume.md`]: resumeText(),
  [`${HOME}/contact.txt`]: contact,
  [`${HOME}/projects/README.md`]: projectsIndex,
  ...Object.fromEntries(featured.map((p) => [`${HOME}/projects/${p.id}/README.md`, readme(p)])),
  [`${HOME}/deployments/live.txt`]: live,
  [`${HOME}/deployments/releases.txt`]: releases,
  [`${HOME}/.bashrc`]: bashrc,
};

/** Absolute, normalised path for `input` typed at `cwd`: ~, ., .., repeated and trailing slashes. */
export function resolve(cwd: string, input: string): string {
  const raw = input === '~' || input.startsWith('~/') ? HOME + input.slice(1) : input.startsWith('/') ? input : `${cwd}/${input}`;
  const parts: string[] = [];
  for (const seg of raw.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return `/${parts.join('/')}`;
}

export function stat(path: string): { type: 'file' | 'dir' } | null {
  if (path in files) return { type: 'file' };
  const prefix = path === '/' ? '/' : `${path}/`;
  return Object.keys(files).some((f) => f.startsWith(prefix)) ? { type: 'dir' } : null;
}

const base = (path: string) => path.slice(path.lastIndexOf('/') + 1);
const missing = (cmd: string, name: string) => new Error(`${cmd}: ${name}: No such file or directory`);

/** Direct children, sorted, directories suffixed with "/". A file lists as itself. `name` is what the user typed, for the error. */
export function list(path: string, name = path): string[] {
  const s = stat(path);
  if (!s) throw new Error(`ls: cannot access '${name}': No such file or directory`);
  if (s.type === 'file') return [base(path)];
  const prefix = path === '/' ? '/' : `${path}/`;
  const names = new Set<string>();
  for (const f of Object.keys(files)) {
    if (!f.startsWith(prefix)) continue;
    const rest = f.slice(prefix.length);
    const cut = rest.indexOf('/');
    names.add(cut === -1 ? rest : `${rest.slice(0, cut)}/`);
  }
  return [...names].sort();
}

export function read(path: string, name = path): string {
  const s = stat(path);
  if (!s) throw missing('cat', name);
  if (s.type === 'dir') throw new Error(`cat: ${name}: Is a directory`);
  return files[path]!;
}

/** The path back when it is a directory; otherwise the cd error. */
export function chdir(path: string, name = path): string {
  const s = stat(path);
  if (!s) throw missing('cd', name);
  if (s.type === 'file') throw new Error(`cd: ${name}: Not a directory`);
  return path;
}
