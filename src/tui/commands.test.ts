import { resume } from '../content/resume';
import type { Deployment, Repo } from '../content/types';
import { projects } from '../content/projects';
import { TABLE, complete, run } from './commands';
import type { Ctx } from './commands';

const repo = (name: string): Repo => ({
  name,
  description: null,
  homepage: null,
  url: `https://github.com/someone/${name}`,
  createdAt: '2025-06-01T00:00:00Z',
  pushedAt: '2025-06-01T00:00:00Z',
  stars: 0,
  topics: [],
  archived: false,
  languages: null,
  releases: null,
});

const list = projects([repo('atomic-launcher'), repo('space-z'), repo('karya')]);
const entries: Deployment[] = [
  { id: 'open-canvas-ui', kind: 'live', label: 'open-canvas', url: 'https://up.example', repo: 'open-canvas-ui' },
  { id: 'atomic-launcher', kind: 'release', label: 'atomic-launcher', repo: 'atomic-launcher' },
  { id: 'gone', kind: 'retired', label: 'gone', url: 'https://gone.example', note: 'returns 404' },
];

const ctx = () => {
  const out: string[] = [];
  const c: Ctx & { out: string[]; navigate: ReturnType<typeof vi.fn>; clear: ReturnType<typeof vi.fn> } = {
    out,
    navigate: vi.fn(),
    print: (line: string) => out.push(line),
    clear: vi.fn(),
    projects: list,
    deployments: entries,
  };
  return c;
};

describe('command table', () => {
  it('has one entry per name, each with a summary', () => {
    const names = TABLE.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(
      expect.arrayContaining(['help', 'ls', 'about', 'resume', 'projects', 'deployments', 'open', 'contact', 'clear', 'whoami', 'poweroff']),
    );
    for (const c of TABLE) expect(c.summary.length).toBeGreaterThan(0);
  });

  it('every entry either navigates or prints when run without arguments', () => {
    for (const cmd of TABLE) {
      const c = ctx();
      run(cmd.name, c);
      const acted = c.navigate.mock.calls.length > 0 || c.out.length > 0 || c.clear.mock.calls.length > 0;
      expect(acted, `${cmd.name} did nothing`).toBe(true);
    }
  });

  it('help lists every command name, generated from the table', () => {
    const c = ctx();
    run('help', c);
    const text = c.out.join('\n');
    for (const cmd of TABLE) expect(text).toContain(cmd.name);
  });

  it('ls prints the same thing as help', () => {
    const a = ctx();
    const b = ctx();
    run('help', a);
    run('ls', b);
    expect(b.out).toEqual(a.out);
  });

  it('pane commands navigate to their pane', () => {
    const c = ctx();
    run('about', c);
    run('resume', c);
    run('projects', c);
    run('deployments', c);
    run('contact', c);
    expect(c.navigate.mock.calls.map((a) => a[0])).toEqual(['/tui', '/tui/resume', '/tui/projects', '/tui/deployments', '/tui']);
  });

  it('whoami prints the profile line from resume.ts', () => {
    const c = ctx();
    run('whoami', c);
    const { name, title, company, location } = resume.profile;
    expect(c.out).toEqual([`${name} — ${title}, ${company}, ${location}`]);
  });

  it('clear empties the log', () => {
    const c = ctx();
    run('clear', c);
    expect(c.clear).toHaveBeenCalledTimes(1);
    expect(c.out).toEqual([]);
  });

  it('poweroff leaves the tui', () => {
    const c = ctx();
    run('poweroff', c);
    expect(c.navigate).toHaveBeenCalledWith('/');
  });
});

describe('open', () => {
  it('opens the projects pane for a project id', () => {
    const c = ctx();
    run('open karya', c);
    expect(c.navigate).toHaveBeenCalledWith('/tui/projects');
  });

  it('opens the url of a deployment id in a new tab', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const c = ctx();
    run('open open-canvas-ui', c);
    expect(open).toHaveBeenCalledWith('https://up.example', '_blank', 'noopener');
    expect(c.navigate).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('says what it needs when given no id', () => {
    const c = ctx();
    run('open', c);
    expect(c.out).toEqual(['usage: open <id>']);
  });

  it('says so when the id matches nothing', () => {
    const c = ctx();
    run('open zzz', c);
    expect(c.out).toEqual(['open: zzz: no such project or deployment.']);
    expect(c.navigate).not.toHaveBeenCalled();
  });
});

describe('unknown input', () => {
  it('prints the not-found line and points at help', () => {
    const c = ctx();
    run('frobnicate now', c);
    expect(c.out).toEqual(['bash: frobnicate: command not found. try help.']);
  });

  it('ignores surrounding whitespace', () => {
    const c = ctx();
    run('   resume  ', c);
    expect(c.navigate).toHaveBeenCalledWith('/tui/resume');
  });
});

describe('complete', () => {
  it('completes a partial command name', () => {
    expect(complete('pro', ctx())).toEqual(['projects']);
  });

  it('offers project and deployment ids for open, without duplicates', () => {
    expect(complete('open at', ctx())).toEqual(['atomic-launcher']);
    expect(complete('open ', ctx())).toEqual(
      expect.arrayContaining(['atomic-launcher', 'space-z', 'karya', 'open-canvas-ui', 'gone']),
    );
  });

  it('returns nothing when nothing matches', () => {
    expect(complete('open zzz', ctx())).toEqual([]);
    expect(complete('zzz', ctx())).toEqual([]);
  });

  it('completes only the first word as a command', () => {
    expect(complete('resume pro', ctx())).toEqual([]);
  });
});
