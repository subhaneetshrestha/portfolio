import { resume } from '../content/resume';
import type { Deployment, Project } from '../content/types';
import { PANES } from './panes';

// No React here: the table runs against a plain ctx so it is testable alone.
export type Ctx = {
  navigate(to: string): void;
  print(line: string): void;
  clear(): void;
  projects: Project[];
  deployments: Deployment[];
};

export type Command = {
  name: string;
  args?: string;
  summary: string;
  run(ctx: Ctx, args: string[]): void;
};

const usage = (c: Command) => `${c.name}${c.args ? ` ${c.args}` : ''}`;

const help: Command = {
  name: 'help',
  summary: 'list commands',
  run(ctx) {
    const width = Math.max(...TABLE.map((c) => usage(c).length));
    for (const c of TABLE) ctx.print(`${usage(c).padEnd(width)}  ${c.summary}`);
  },
};

const paneOf = (id: (typeof PANES)[number]['id']) => PANES.find((p) => p.id === id)!.path;

export const TABLE: Command[] = [
  help,
  { ...help, name: 'ls', summary: 'same as help' },
  ...PANES.map((p) => ({ name: p.id, summary: `open the ${p.id} pane`, run: (ctx: Ctx) => ctx.navigate(p.path) })),
  {
    name: 'open',
    args: '<id>',
    summary: 'a project id opens the projects pane; a deployment id opens its url',
    run(ctx, [id]) {
      if (!id) return ctx.print('usage: open <id>');
      if (ctx.projects.some((p) => p.name === id)) return ctx.navigate(paneOf('projects'));
      const dep = ctx.deployments.find((d) => d.id === id);
      // Releases carry no url of their own; the repo's releases page is the checkable one.
      const repo = ctx.projects.find((p) => p.name === dep?.repo);
      const url = dep?.url ?? (repo && `${repo.url}/releases`);
      if (!url) return ctx.print(`open: ${id}: no such project or deployment.`);
      window.open(url, '_blank', 'noopener');
    },
  },
  { name: 'contact', summary: 'links, on the about pane', run: (ctx) => ctx.navigate(paneOf('about')) },
  { name: 'clear', summary: 'empty this log', run: (ctx) => ctx.clear() },
  {
    name: 'whoami',
    summary: 'who this is',
    run(ctx) {
      const { name, title, company, location } = resume.profile;
      ctx.print(`${name} — ${title}, ${company}, ${location}`);
    },
  },
  // Task 10 replaces this with the reverse dive back into the CRT scene.
  { name: 'poweroff', summary: 'leave the tui', run: (ctx) => ctx.navigate('/') },
];

const words = (line: string) => line.trim().split(/\s+/).filter(Boolean);

export function run(line: string, ctx: Ctx) {
  const [name, ...args] = words(line);
  if (!name) return;
  const cmd = TABLE.find((c) => c.name === name);
  if (!cmd) return ctx.print(`sh: ${name}: command not found. try help.`);
  cmd.run(ctx, args);
}

/** Candidates for the last word: command names first, then ids for `open`. */
export function complete(line: string, ctx: Pick<Ctx, 'projects' | 'deployments'>): string[] {
  const parts = line.split(/\s+/);
  const last = parts[parts.length - 1] ?? '';
  const pool =
    parts.length === 1 ? TABLE.map((c) => c.name)
    : parts[0] === 'open' && parts.length === 2 ? [...ctx.projects.map((p) => p.name), ...ctx.deployments.map((d) => d.id)]
    : [];
  return [...new Set(pool)].filter((w) => w.startsWith(last));
}
