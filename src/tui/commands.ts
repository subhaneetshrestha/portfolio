import { deployments } from '../content/deployments';
import { projects } from '../content/projects';
import { HOST, resume } from '../content/resume';
import { PLACEHOLDER } from '../content/resumeText';
import * as vfs from './fs';
import { HOME } from './fs';

// No React and no window here: the table runs against a plain ctx so it is
// testable alone. Anything that touches the browser goes through ctx.
export type Ctx = {
  cwd: string;
  setCwd(path: string): void;
  fs: typeof vfs;
  print(lines: string | string[]): void;
  clear(): void;
  navigate(to: string): void;
  openUrl(url: string): void;
  history: string[];
  now: Date;
};

export type Command = {
  name: string;
  args?: string;
  summary: string;
  run(ctx: Ctx, args: string[]): void;
};

const PROJECTS = projects();
const IDS = [...new Set([...PROJECTS.map((p) => p.id), ...deployments.map((d) => d.id)])];
/** `alias name='value'` lines of ~/.bashrc, read once at startup like a login shell would. */
const ALIASES: Record<string, string> = Object.fromEntries(
  [...vfs.read(`${HOME}/.bashrc`).matchAll(/^alias (\S+)='([^']*)'$/gm)].map((m) => [m[1]!, m[2]!]),
);
const SINCE = '2020-06-09'; // first GitHub activity; neofetch's "uptime"

const words = (line: string) => line.trim().split(/\s+/).filter(Boolean);
const usage = (c: Command) => `${c.name}${c.args ? ` ${c.args}` : ''}`;
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const hidden = (name: string) => name.startsWith('.');
/** The project id when `path` is ~/projects/<id> or its README, else null. */
const projectAt = (path: string) => path.match(new RegExp(`^${HOME}/projects/([^/]+)(?:/README\\.md)?$`))?.[1] ?? null;

let oldpwd: string | null = null; // ponytail: one shell per page, so OLDPWD is module state

const help: Command = {
  name: 'help',
  summary: 'list commands',
  run(ctx) {
    const width = Math.max(...TABLE.map((c) => usage(c).length));
    ctx.print(TABLE.map((c) => `${usage(c).padEnd(width)}  ${c.summary}`));
    ctx.print(['', `aliases: ${Object.keys(ALIASES).join(' ')}  (see cat ~/.bashrc)`]);
  },
};

const exit: Command = { name: 'exit', summary: 'leave the tui', run: (ctx) => ctx.navigate('/') };

export const TABLE: Command[] = [
  help,
  {
    name: 'ls',
    args: '[-l|-a] [path]',
    summary: 'list a directory',
    run(ctx, args) {
      const flags = args.filter((a) => a.startsWith('-')).join('');
      const name = args.find((a) => !a.startsWith('-')) ?? '.';
      const path = ctx.fs.resolve(ctx.cwd, name);
      const names = ctx.fs.list(path, name).filter((n) => flags.includes('a') || !hidden(n));
      if (!flags.includes('l')) return ctx.print(names.join('  '));
      const isFile = ctx.fs.stat(path)?.type === 'file';
      const size = (n: string) => (n.endsWith('/') ? '-' : String(ctx.fs.read(isFile ? path : ctx.fs.resolve(path, n)).length));
      const rows = names.map((n) => [n.endsWith('/') ? 'dr-xr-xr-x' : '-r--r--r--', size(n), n] as const);
      const width = Math.max(...rows.map((r) => r[1].length));
      ctx.print(rows.map(([mode, bytes, n]) => `${mode}  ${bytes.padStart(width)}  ${n}`));
    },
  },
  {
    name: 'cd',
    args: '[path]',
    summary: 'change directory: ~ home, .. up, - back',
    run(ctx, [name = '~']) {
      if (name === '-' && oldpwd === null) return ctx.print('bash: cd: OLDPWD not set');
      const path = ctx.fs.chdir(name === '-' ? oldpwd! : ctx.fs.resolve(ctx.cwd, name), name);
      if (name === '-') ctx.print(path);
      oldpwd = ctx.cwd;
      ctx.setCwd(path);
    },
  },
  { name: 'pwd', summary: 'where you are', run: (ctx) => ctx.print(ctx.cwd) },
  {
    name: 'cat',
    args: '<path…>',
    summary: 'print files',
    run(ctx, args) {
      if (!args.length) return ctx.print('usage: cat <path…>');
      for (const name of args) {
        try {
          ctx.print(ctx.fs.read(ctx.fs.resolve(ctx.cwd, name), name).split('\n'));
        } catch (e) {
          ctx.print(message(e));
        }
      }
    },
  },
  {
    name: 'tree',
    args: '[path]',
    summary: 'list a directory as a tree',
    run(ctx, [name = '.']) {
      const root = ctx.fs.resolve(ctx.cwd, name);
      if (ctx.fs.stat(root)?.type !== 'dir') throw new Error(`tree: ${name}: No such file or directory`);
      let dirs = 0;
      let files = 0;
      const walk = (dir: string, indent: string): string[] =>
        ctx.fs.list(dir).filter((n) => !hidden(n)).flatMap((n, i, all) => {
          const last = i === all.length - 1;
          const isDir = n.endsWith('/');
          if (isDir) dirs++; else files++;
          const below = isDir ? walk(ctx.fs.resolve(dir, n), `${indent}${last ? '    ' : '│   '}`) : [];
          return [`${indent}${last ? '└── ' : '├── '}${isDir ? n.slice(0, -1) : n}`, ...below];
        });
      const body = walk(root, '');
      ctx.print([name, ...body, '', `${dirs} director${dirs === 1 ? 'y' : 'ies'}, ${files} file${files === 1 ? '' : 's'}`]);
    },
  },
  {
    name: 'open',
    args: '<path|id|url>',
    summary: 'open a repo, live site or url in a new tab',
    run(ctx, [arg]) {
      if (!arg) return ctx.print('usage: open <path|id|url>');
      if (/^https?:\/\//.test(arg)) return ctx.openUrl(arg);
      // A deployment id is more specific than a repo name: most deployments share their repo's name.
      const dep = deployments.find((d) => d.id === arg);
      if (dep?.url) return ctx.openUrl(dep.url);
      const fromPath = projectAt(ctx.fs.resolve(ctx.cwd, arg));
      const project = PROJECTS.find((p) => p.id === (fromPath ?? dep?.repo ?? arg));
      if (!project) return ctx.print(`open: ${arg}: no such project, deployment or url.`);
      if (!project.repoUrl) return ctx.print('repo is private');
      // A release carries no url of its own; the repo's releases page is the checkable one.
      ctx.openUrl(dep && !fromPath ? `${project.repoUrl}/releases` : project.repoUrl);
    },
  },
  { name: 'clear', summary: 'empty the screen', run: (ctx) => ctx.clear() },
  {
    name: 'history',
    summary: 'what you typed',
    run(ctx) {
      const width = String(ctx.history.length).length + 2;
      ctx.print(ctx.history.map((h, i) => `${String(i + 1).padStart(width)}  ${h}`));
    },
  },
  {
    name: 'whoami',
    summary: 'who this is',
    run(ctx) {
      const { name, title, company, location } = resume.profile;
      ctx.print(`${name} — ${title}, ${company}, ${location}`);
    },
  },
  {
    name: 'neofetch',
    summary: 'this machine',
    run(ctx) {
      const user = `${resume.profile.handle}@${HOST}`;
      const languages = resume.skills.find((s) => s.name === 'languages')?.items.join(', ') ?? PLACEHOLDER;
      const days = Math.floor((ctx.now.getTime() - Date.parse(SINCE)) / 86_400_000);
      const info = [
        user,
        '-'.repeat(user.length),
        'OS: Arch Linux',
        'Shell: bash',
        'Editor: neovim',
        `Languages: ${languages}`,
        `Uptime: ${days} days (since ${SINCE})`,
      ];
      const logo = [
        '       /\\       ',
        '      /  \\      ',
        '     /    \\     ',
        '    /  /\\  \\    ',
        '   /  |  |  \\   ',
        '  /  _|  |_  \\  ',
        " /_-'      '-_\\ ",
      ];
      ctx.print(logo.map((row, i) => `${row}  ${info[i] ?? ''}`));
    },
  },
  { name: 'echo', args: '[text]', summary: 'print text', run: (ctx, args) => ctx.print(args.join(' ')) },
  { name: 'date', summary: 'the time', run: (ctx) => ctx.print(ctx.now.toString()) },
  // Task 10 replaces the plain navigate with the reverse dive back to the CRT scene.
  exit,
  { ...exit, name: 'poweroff' },
];

export function run(line: string, ctx: Ctx) {
  const [name, ...rest] = words(line);
  if (!name) return;
  const [head, ...args] = ALIASES[name] ? [...words(ALIASES[name]), ...rest] : [name, ...rest];
  const cmd = TABLE.find((c) => c.name === head);
  if (!cmd) return ctx.print(`bash: ${name}: command not found. try help.`);
  try {
    cmd.run(ctx, args);
  } catch (e) {
    ctx.print(message(e));
  }
}

/**
 * Tab at the end of `input`: the first word completes commands and aliases,
 * later words complete paths relative to cwd (`open` also takes ids). One
 * candidate comes back as the finished line; several are for the terminal to print.
 */
export function complete(input: string, ctx: Pick<Ctx, 'cwd' | 'fs'>): { replacement?: string; candidates: string[] } {
  const parts = input.split(/\s+/);
  const last = parts[parts.length - 1]!;
  const cut = last.lastIndexOf('/') + 1;
  const dir = last.slice(0, cut);
  const base = last.slice(cut);
  let candidates: string[];
  if (parts.length === 1) {
    candidates = [...TABLE.map((c) => c.name), ...Object.keys(ALIASES)].filter((w) => w.startsWith(last)).sort();
  } else {
    let names: string[] = [];
    try {
      names = ctx.fs.list(ctx.fs.resolve(ctx.cwd, dir));
    } catch {
      /* no such directory: nothing to offer */
    }
    candidates = names.filter((n) => n.startsWith(base) && (hidden(base) || !hidden(n)));
    if (parts[0] === 'open' && !dir) {
      const seen = new Set(candidates.map((n) => n.replace(/\/$/, '')));
      candidates.push(...IDS.filter((id) => id.startsWith(base) && !seen.has(id)));
    }
  }
  if (candidates.length !== 1) return { candidates };
  const hit = candidates[0]!;
  return { candidates, replacement: `${input.slice(0, input.length - last.length)}${dir}${hit}${hit.endsWith('/') ? '' : ' '}` };
}
