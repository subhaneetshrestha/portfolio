import { deployments } from '../content/deployments';
import { projects } from '../content/projects';
import { HOST, resume } from '../content/resume';
import { TABLE, complete, run } from './commands';
import type { Ctx } from './commands';
import * as fs from './fs';
import { HOME, list, read } from './fs';

const NOW = new Date('2026-09-14T10:00:00Z');
type Mock = ReturnType<typeof vi.fn>;

const ctx = (cwd = HOME) => {
  const out: string[] = [];
  const c: Ctx & { out: string[]; clear: Mock; navigate: Mock; openUrl: Mock } = {
    cwd,
    setCwd(path) { c.cwd = path; },
    fs,
    out,
    print: (lines) => out.push(...[lines].flat()),
    clear: vi.fn(),
    navigate: vi.fn(),
    openUrl: vi.fn(),
    history: ['ls', 'cd projects'],
    now: NOW,
  };
  return c;
};

const same = (a: string, b: string) => {
  const x = ctx();
  const y = ctx();
  run(a, x);
  run(b, y);
  expect(x.out.length).toBeGreaterThan(0);
  expect(x.out).toEqual(y.out);
};

const pub = projects().find((p) => p.repoUrl && p.id === 'space-z')!;
const priv = projects().find((p) => p.repoUrl === null)!;

// First in the file on purpose: OLDPWD lives in the module, so this must run before any cd.
describe('cd -', () => {
  it('refuses before any cd has happened', () => {
    const c = ctx();
    run('cd -', c);
    expect(c.out).toEqual(['bash: cd: OLDPWD not set']);
    expect(c.cwd).toBe(HOME);
  });

  it('returns to the previous directory and prints it', () => {
    const c = ctx();
    run('cd projects', c);
    run('cd deployments', c); // relative to ~/projects: fails, cwd stays
    expect(c.out).toEqual(['cd: deployments: No such file or directory']);
    run('cd -', c);
    expect(c.out.at(-1)).toBe(HOME);
    expect(c.cwd).toBe(HOME);
    run('cd -', c);
    expect(c.cwd).toBe(`${HOME}/projects`);
  });
});

describe('command table', () => {
  it('has one entry per name, each with a summary', () => {
    const names = TABLE.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(
      expect.arrayContaining([
        'help', 'ls', 'cd', 'pwd', 'cat', 'tree', 'open', 'clear', 'history', 'whoami', 'neofetch', 'echo', 'date', 'exit', 'poweroff',
      ]),
    );
    for (const c of TABLE) expect(c.summary.length).toBeGreaterThan(0);
  });

  it('every entry does something observable when run without arguments', () => {
    for (const cmd of TABLE) {
      const c = ctx(`${HOME}/projects`);
      run(cmd.name, c);
      const acted =
        c.navigate.mock.calls.length > 0 || c.out.length > 0 || c.clear.mock.calls.length > 0 || c.cwd !== `${HOME}/projects`;
      expect(acted, `${cmd.name} did nothing`).toBe(true);
    }
  });

  it('help lists every command with its usage, and the aliases', () => {
    const c = ctx();
    run('help', c);
    const text = c.out.join('\n');
    for (const cmd of TABLE) expect(text).toContain(`${cmd.name}${cmd.args ? ` ${cmd.args}` : ''}`);
    for (const a of ['ll', 'la', 'resume', 'projects', 'about', 'deployments', 'contact']) expect(text).toContain(a);
  });
});

describe('cat', () => {
  it('hands a .md file to the markdown sink when there is one, and prints everything else', () => {
    const c = ctx();
    const markdown = vi.fn();
    run('cat ~/resume.md ~/about.txt', { ...c, markdown });
    expect(markdown).toHaveBeenCalledWith(read(`${HOME}/resume.md`));
    expect(c.out).toEqual(read(`${HOME}/about.txt`).split('\n'));
  });
});

describe('ls', () => {
  it('lists cwd on one line, hiding dotfiles unless -a', () => {
    const c = ctx();
    run('ls', c);
    expect(c.out).toEqual(['about.txt  contact.txt  deployments/  projects/  resume.md']);
    run('ls -a', c);
    expect(c.out[1]).toBe('.bashrc  about.txt  contact.txt  deployments/  projects/  resume.md');
  });

  it('takes a path, relative or with ~', () => {
    const c = ctx();
    run('ls projects', c);
    run('ls ~/deployments', c);
    expect(c.out).toEqual([list(`${HOME}/projects`).join('  '), 'live.txt  releases.txt']);
  });

  it('-l prints one stable row per entry: mode, size in bytes, name', () => {
    const c = ctx();
    run('ls -l', c);
    expect(c.out).toHaveLength(5);
    for (const row of c.out) expect(row).toMatch(/^[-d]r-[-x]r-[-x]r-[-x]  +(\d+|-)  \S+$/);
    expect(c.out[0]).toMatch(new RegExp(`^-r--r--r--  +${read(`${HOME}/about.txt`).length}  about\\.txt$`));
    expect(c.out[3]).toMatch(/^dr-xr-xr-x  +-  projects\/$/);
    const d = ctx();
    run('ls -la', d);
    expect(d.out[0]).toMatch(/^-r--r--r--  +\d+  \.bashrc$/);
  });

  it('refuses a missing path with the ls text', () => {
    const c = ctx();
    run('ls nope', c);
    expect(c.out).toEqual(["ls: cannot access 'nope': No such file or directory"]);
  });
});

describe('cd and pwd', () => {
  it('moves into a directory, back up with .., home with no argument or ~', () => {
    const c = ctx();
    run('cd projects', c);
    expect(c.cwd).toBe(`${HOME}/projects`);
    run('cd space-z', c);
    run('pwd', c);
    expect(c.out).toEqual([`${HOME}/projects/space-z`]);
    run('cd ..', c);
    expect(c.cwd).toBe(`${HOME}/projects`);
    run('cd', c);
    expect(c.cwd).toBe(HOME);
    run('cd projects', c);
    run('cd ~', c);
    expect(c.cwd).toBe(HOME);
  });

  it('refuses files and missing paths with the cd texts', () => {
    const c = ctx();
    run('cd about.txt', c);
    run('cd nope', c);
    expect(c.out).toEqual(['cd: about.txt: Not a directory', 'cd: nope: No such file or directory']);
    expect(c.cwd).toBe(HOME);
  });
});

describe('cat', () => {
  it('prints each file, line by line, in order', () => {
    const c = ctx(`${HOME}/deployments`);
    run('cat ~/contact.txt live.txt', c);
    expect(c.out).toEqual([...read(`${HOME}/contact.txt`).split('\n'), ...read(`${HOME}/deployments/live.txt`).split('\n')]);
  });

  it('reports each bad path and keeps going', () => {
    const c = ctx();
    run('cat nope projects contact.txt', c);
    expect(c.out).toEqual([
      'cat: nope: No such file or directory',
      'cat: projects: Is a directory',
      ...read(`${HOME}/contact.txt`).split('\n'),
    ]);
  });

  it('asks for a path when given none', () => {
    const c = ctx();
    run('cat', c);
    expect(c.out).toEqual(['usage: cat <path…>']);
  });
});

describe('tree', () => {
  it('draws the directory and counts what it found', () => {
    const c = ctx();
    run('tree projects', c);
    const ids = projects().map((p) => p.id).sort();
    const last = ids.at(-1)!;
    expect(c.out[0]).toBe('projects');
    expect(c.out[1]).toBe('├── README.md');
    expect(c.out[2]).toBe(`├── ${ids[0]}`);
    expect(c.out[3]).toBe('│   └── README.md');
    expect(c.out.at(-4)).toBe(`└── ${last}`);
    expect(c.out.at(-3)).toBe('    └── README.md');
    expect(c.out.at(-2)).toBe('');
    expect(c.out.at(-1)).toBe('8 directories, 9 files');
    expect(c.out).toHaveLength(2 + ids.length * 2 + 2);
  });

  it('defaults to cwd, hides dotfiles and refuses a missing path', () => {
    const c = ctx();
    run('tree', c);
    expect(c.out[0]).toBe('.');
    expect(c.out.join('\n')).not.toContain('.bashrc');
    expect(c.out.at(-1)).toBe('10 directories, 14 files');
    const d = ctx();
    run('tree nope', d);
    expect(d.out).toEqual(['tree: nope: No such file or directory']);
  });
});

describe('open', () => {
  it('opens an http(s) url as given', () => {
    const c = ctx();
    run('open https://example.com/x', c);
    expect(c.openUrl).toHaveBeenCalledWith('https://example.com/x');
  });

  it('opens the repo of a public project by directory, README or id', () => {
    for (const arg of ['projects/space-z', 'projects/space-z/README.md', 'space-z']) {
      const c = ctx(arg === 'space-z' ? `${HOME}/projects` : HOME);
      run(`open ${arg}`, c);
      expect(c.openUrl, arg).toHaveBeenCalledWith(pub.repoUrl);
      expect(c.out).toEqual([]);
    }
  });

  it('says so for a private project and opens nothing', () => {
    const c = ctx();
    run(`open projects/${priv.id}`, c);
    expect(c.out).toEqual(['repo is private']);
    expect(c.openUrl).not.toHaveBeenCalled();
  });

  it('opens a deployment id: its url, or the releases page for a release', () => {
    const live = deployments.find((d) => d.url)!;
    const c = ctx();
    run(`open ${live.id}`, c);
    expect(c.openUrl).toHaveBeenCalledWith(live.url);
    const d = ctx();
    run('open space-z', d);
    expect(d.openUrl).toHaveBeenCalledWith(`${pub.repoUrl}/releases`);
  });

  it('asks for an argument, and says when nothing matches', () => {
    const c = ctx();
    run('open', c);
    run('open zzz', c);
    run('open deployments/live.txt', c);
    expect(c.out).toEqual([
      'usage: open <path|id|url>',
      'open: zzz: no such project, deployment or url.',
      'open: deployments/live.txt: no such project, deployment or url.',
    ]);
    expect(c.openUrl).not.toHaveBeenCalled();
  });
});

describe('small commands', () => {
  it('clear empties the log', () => {
    const c = ctx();
    run('clear', c);
    expect(c.clear).toHaveBeenCalledTimes(1);
    expect(c.out).toEqual([]);
  });

  it('history numbers what was typed', () => {
    const c = ctx();
    run('history', c);
    expect(c.out).toEqual(['  1  ls', '  2  cd projects']);
  });

  it('whoami prints the profile line from resume.ts', () => {
    const c = ctx();
    run('whoami', c);
    const { name, title, company, location } = resume.profile;
    expect(c.out).toEqual([`${name} — ${title}, ${company}, ${location}`]);
  });

  it('neofetch is a card built from the data: os, shell, editor, languages, days since 2020-06-09', () => {
    const c = ctx();
    run('neofetch', c);
    const text = c.out.join('\n');
    expect(text).toContain(`${resume.profile.handle}@${HOST}`);
    expect(text).toContain('OS: Arch Linux');
    expect(text).toContain('Shell: bash');
    expect(text).toContain('Editor: neovim');
    expect(text).toContain(`Languages: ${resume.skills.find((s) => s.name === 'languages')!.items.join(', ')}`);
    const days = Math.floor((NOW.getTime() - Date.UTC(2020, 5, 9)) / 86_400_000);
    expect(text).toContain(`Uptime: ${days} days (since 2020-06-09)`);
    expect(text).not.toMatch(/\d+ (packages|GB|MiB)/);
  });

  it('echo repeats its arguments', () => {
    const c = ctx();
    run('echo hello   world', c);
    expect(c.out).toEqual(['hello world']);
  });

  it('date prints the clock it was given', () => {
    const c = ctx();
    run('date', c);
    expect(c.out).toEqual([NOW.toString()]);
  });

  it('exit and poweroff leave the tui', () => {
    for (const cmd of ['exit', 'poweroff']) {
      const c = ctx();
      run(cmd, c);
      expect(c.navigate).toHaveBeenCalledWith('/');
    }
  });
});

describe('aliases from ~/.bashrc', () => {
  it('ll and la expand to ls flags, extra arguments carried along', () => {
    same('ll', 'ls -l');
    same('la', 'ls -a');
    same('ll projects', 'ls -l projects');
  });

  it('the old pane names keep working as cat/ls', () => {
    same('resume', 'cat ~/resume.md');
    same('projects', 'ls ~/projects');
    same('about', 'cat ~/about.txt');
    same('deployments', 'cat ~/deployments/live.txt');
    same('contact', 'cat ~/contact.txt');
  });
});

describe('unknown input', () => {
  it('prints the not-found line and points at help', () => {
    const c = ctx();
    run('frobnicate now', c);
    expect(c.out).toEqual(['bash: frobnicate: command not found. try help.']);
  });

  it('ignores surrounding whitespace and empty lines', () => {
    const c = ctx();
    run('   pwd  ', c);
    run('   ', c);
    expect(c.out).toEqual([HOME]);
  });
});

describe('complete', () => {
  it('completes a command or alias in place with a trailing space', () => {
    expect(complete('pro', ctx())).toEqual({ candidates: ['projects'], replacement: 'projects ' });
    expect(complete('neo', ctx())).toEqual({ candidates: ['neofetch'], replacement: 'neofetch ' });
  });

  it('lists several matches without a replacement', () => {
    const r = complete('p', ctx());
    expect(r.replacement).toBeUndefined();
    expect(r.candidates).toEqual(['poweroff', 'projects', 'pwd']);
  });

  it('completes later tokens as paths relative to cwd', () => {
    expect(complete('cat re', ctx())).toEqual({ candidates: ['resume.md'], replacement: 'cat resume.md ' });
    expect(complete('cat re', ctx(`${HOME}/projects`))).toEqual({ candidates: [] });
    expect(complete('cat ~/re', ctx(`${HOME}/projects`))).toEqual({ candidates: ['resume.md'], replacement: 'cat ~/resume.md ' });
  });

  it('a directory completes with a trailing slash and no space', () => {
    expect(complete('cd projects/sp', ctx())).toEqual({ candidates: ['space-z/'], replacement: 'cd projects/space-z/' });
    expect(complete('cd ..', ctx(`${HOME}/projects`)).candidates).toEqual([]);
    expect(complete('ls ', ctx()).candidates).toEqual(['about.txt', 'contact.txt', 'deployments/', 'projects/', 'resume.md']);
  });

  it('offers dotfiles only when the token starts with a dot', () => {
    expect(complete('cat .', ctx())).toEqual({ candidates: ['.bashrc'], replacement: 'cat .bashrc ' });
  });

  it('open also completes project and deployment ids, without duplicates', () => {
    expect(complete('open at', ctx())).toEqual({ candidates: ['atomic-launcher'], replacement: 'open atomic-launcher ' });
    expect(complete('open sp', ctx(`${HOME}/projects`))).toEqual({ candidates: ['space-z/'], replacement: 'open space-z/' });
  });

  it('returns nothing for an unknown token', () => {
    expect(complete('zzz', ctx())).toEqual({ candidates: [] });
    expect(complete('cat zzz', ctx())).toEqual({ candidates: [] });
    expect(complete('cat nodir/x', ctx())).toEqual({ candidates: [] });
  });
});
