import { deployments } from '../content/deployments';
import { github } from '../content/github';
import { projects } from '../content/projects';
import { PROMPT, resume } from '../content/resume';
import { HOME, chdir, list, read, resolve, stat } from './fs';

const FEATURED = [
  'atomic-launcher', 'space-z', 'nepse-analyzer', 'karya', 'flavique', 'smart-wallet', 'footy-manager', 'footy-stonks',
];

describe('resolve', () => {
  it('roots ~ at the home directory', () => {
    expect(HOME).toBe(`/home/${resume.profile.handle}`);
    expect(resolve('/', '~')).toBe(HOME);
    expect(resolve('/', '~/projects')).toBe(`${HOME}/projects`);
  });

  it('joins relative paths onto cwd and keeps absolute ones', () => {
    expect(resolve(HOME, 'projects')).toBe(`${HOME}/projects`);
    expect(resolve(`${HOME}/projects`, 'space-z/README.md')).toBe(`${HOME}/projects/space-z/README.md`);
    expect(resolve(`${HOME}/projects`, '/home')).toBe('/home');
  });

  it('handles ., .., //, trailing slash and an empty input', () => {
    expect(resolve(`${HOME}/projects`, '.')).toBe(`${HOME}/projects`);
    expect(resolve(`${HOME}/projects`, '..')).toBe(HOME);
    expect(resolve(`${HOME}/projects`, '../deployments/./live.txt')).toBe(`${HOME}/deployments/live.txt`);
    expect(resolve(HOME, 'projects//space-z/')).toBe(`${HOME}/projects/space-z`);
    expect(resolve('/', '../..')).toBe('/');
    expect(resolve(HOME, '/')).toBe('/');
    expect(resolve(HOME, '')).toBe(HOME);
  });
});

describe('stat and list', () => {
  it('knows files, directories and nothing else', () => {
    expect(stat('/')).toEqual({ type: 'dir' });
    expect(stat(HOME)).toEqual({ type: 'dir' });
    expect(stat(`${HOME}/projects`)).toEqual({ type: 'dir' });
    expect(stat(`${HOME}/about.txt`)).toEqual({ type: 'file' });
    expect(stat(`${HOME}/about.txt/x`)).toBeNull();
    expect(stat(`${HOME}/nope`)).toBeNull();
  });

  it('lists home sorted, directories marked with a trailing slash', () => {
    expect(list(HOME)).toEqual(['.bashrc', 'about.txt', 'contact.txt', 'deployments/', 'projects/', 'resume.md']);
    expect(list('/')).toEqual(['home/']);
  });

  it('lists exactly the eight featured projects plus the index', () => {
    expect(list(`${HOME}/projects`)).toEqual(['README.md', ...[...FEATURED].sort().map((id) => `${id}/`)]);
  });

  it('lists a file as itself and refuses a missing path with the ls text', () => {
    expect(list(`${HOME}/about.txt`)).toEqual(['about.txt']);
    expect(() => list(`${HOME}/nope`, 'nope')).toThrow("ls: cannot access 'nope': No such file or directory");
  });
});

describe('read and chdir', () => {
  it('refuses missing paths and directories with the cat texts', () => {
    expect(() => read(`${HOME}/nope`, 'nope')).toThrow('cat: nope: No such file or directory');
    expect(() => read(`${HOME}/projects`, 'projects')).toThrow('cat: projects: Is a directory');
    expect(() => read(`${HOME}/nope`)).toThrow(`cat: ${HOME}/nope: No such file or directory`);
  });

  it('chdir returns a directory and refuses anything else with the cd texts', () => {
    expect(chdir(`${HOME}/projects`)).toBe(`${HOME}/projects`);
    expect(() => chdir(`${HOME}/about.txt`, 'about.txt')).toThrow('cd: about.txt: Not a directory');
    expect(() => chdir(`${HOME}/nope`, 'nope')).toThrow('cd: nope: No such file or directory');
  });
});

describe('contents', () => {
  const { profile } = resume;
  const byId = new Map(projects().map((p) => [p.id, p]));

  it('about.txt is the profile block', () => {
    const about = read(`${HOME}/about.txt`);
    expect(about).toContain(profile.name);
    expect(about).toContain(`${profile.title} @ ${profile.company}`);
    expect(about).toContain(profile.location);
    expect(about).toContain(profile.bio);
    expect(about).toContain(profile.summary);
    for (const l of profile.links) expect(about).toContain(l.url);
  });

  it('resume.md names the person and the first company, with no bare TODO', () => {
    const md = read(`${HOME}/resume.md`);
    expect(md).toContain(profile.name);
    expect(md).toContain(resume.experience[0]!.company);
    expect(md).not.toContain('TODO');
  });

  it('contact.txt carries every link, the email without its mailto: scheme', () => {
    const txt = read(`${HOME}/contact.txt`);
    for (const l of profile.links) expect(txt).toContain(`${l.label}`);
    expect(txt).toContain('shresthasubhaneet@gmail.com');
    expect(txt).not.toContain('mailto:');
  });

  it('projects/README.md indexes the featured ids in curated order and points everything else at github', () => {
    const md = read(`${HOME}/projects/README.md`);
    const positions = FEATURED.map((id) => md.indexOf(id));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(md).toContain(`everything else: ${profile.links.find((l) => l.label === 'github')!.url}`);
  });

  it('a public project README ends with its repo, last push and release assets', () => {
    const p = byId.get('space-z')!;
    const md = read(`${HOME}/projects/space-z/README.md`);
    expect(md.startsWith(p.markdown.trimEnd())).toBe(true);
    expect(md).toContain(`repo: ${p.repoUrl}`);
    expect(md).toContain(`last push: ${p.pushedAt}`);
    const latest = p.releases[0]!;
    expect(md).toContain(`release: ${latest.tag}`);
    for (const a of latest.assets) expect(md).toContain(a.url);
  });

  it('a private project README says repo: private and claims no push date', () => {
    const priv = projects().find((p) => p.repoUrl === null)!;
    const md = read(`${HOME}/projects/${priv.id}/README.md`);
    expect(md).toContain('repo: private');
    expect(md).not.toContain('last push:');
  });

  it('deployments/live.txt has each url with its literal status and note', () => {
    const txt = read(`${HOME}/deployments/live.txt`);
    for (const d of deployments.filter((d) => d.url)) {
      expect(txt).toContain(d.label);
      expect(txt).toContain(d.url!);
      expect(txt).toContain(String(github.liveness[d.url!]));
      if (d.note) expect(txt).toContain(d.note);
    }
    expect(txt).toContain(github.checkedAt);
  });

  it('deployments/releases.txt lists tag, pre-release flag and every asset url', () => {
    const txt = read(`${HOME}/deployments/releases.txt`);
    for (const d of deployments.filter((d) => d.kind === 'release')) {
      const repo = github.repos.find((r) => r.name === d.repo);
      if (!repo) { expect(txt).toContain(`${d.label}: repository not public`); continue; }
      for (const r of repo.releases ?? []) {
        expect(txt).toContain(r.tag);
        if (r.prerelease) expect(txt).toContain(`${r.tag} (pre-release)`);
        for (const a of r.assets) expect(txt).toContain(`${a.name}  ${a.url}`);
      }
    }
  });

  it('.bashrc carries the prompt and the four aliases', () => {
    const rc = read(`${HOME}/.bashrc`);
    expect(rc).toContain(PROMPT);
    expect(rc).toContain("alias ll='ls -l'");
    expect(rc).toContain("alias la='ls -a'");
    expect(rc).toContain("alias resume='cat ~/resume.md'");
    expect(rc).toContain("alias projects='ls ~/projects'");
  });
});
