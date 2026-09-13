import { readFileSync } from 'node:fs';
import { render, screen, within } from '@testing-library/react';
import type { Deployment, GithubData, Repo } from '../../content/types';
import { Deployments } from './Deployments';

const repo = (name: string, over: Partial<Repo> = {}): Repo => ({
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
  readme: null,
  releases: null,
  ...over,
});

const twoHoursAgo = new Date(Date.now() - 2 * 3600_000).toISOString();

const data: GithubData = {
  fetchedAt: twoHoursAgo,
  checkedAt: twoHoursAgo,
  liveness: { 'https://up.example': 200, 'https://down.example': 404, 'https://gone.example': 410 },
  repos: [
    repo('shipped', {
      releases: [
        {
          tag: 'v1.2.0',
          name: 'Shipped v1.2.0',
          prerelease: false,
          publishedAt: '2026-08-12T17:30:22Z',
          url: 'https://github.com/someone/shipped/releases/tag/v1.2.0',
          assets: [
            { name: 'shipped.apk', url: 'https://dl.example/v1.2.0/shipped.apk', size: 442074 },
            { name: 'shipped-win.zip', url: 'https://dl.example/v1.2.0/shipped-win.zip', size: 37650836 },
          ],
        },
        {
          tag: 'v1.1.0',
          name: 'older',
          prerelease: false,
          publishedAt: '2026-08-01T00:00:00Z',
          url: 'https://github.com/someone/shipped/releases/tag/v1.1.0',
          assets: [{ name: 'old.apk', url: 'https://dl.example/v1.1.0/old.apk', size: 1 }],
        },
      ],
    }),
    repo('bare', { releases: [] }),
    repo('edge', {
      releases: [
        {
          tag: 'edge',
          name: 'edge — latest main',
          prerelease: true,
          publishedAt: '2026-09-01T00:00:00Z',
          url: 'https://github.com/someone/edge/releases/tag/edge',
          assets: [],
        },
      ],
    }),
  ],
};

const entries: Deployment[] = [
  { id: 'up', kind: 'live', label: 'up', url: 'https://up.example', note: '2023 tutorial clone' },
  { id: 'down', kind: 'live', label: 'down', url: 'https://down.example' },
  { id: 'shipped', kind: 'release', label: 'shipped', repo: 'shipped' },
  { id: 'bare', kind: 'release', label: 'bare', repo: 'bare' },
  { id: 'edge', kind: 'release', label: 'edge', repo: 'edge', note: 'edge pre-release' },
  { id: 'hidden', kind: 'release', label: 'hidden', repo: 'hidden' },
  { id: 'gone', kind: 'retired', label: 'gone', url: 'https://gone.example', note: 'moved to a paid tier' },
];

const table = (name: RegExp) => within(screen.getByRole('table', { name }));

describe('Deployments live section', () => {
  it('shows a 2xx entry with the ok dot, its literal code and a link to the URL', () => {
    render(<Deployments entries={entries} data={data} />);
    const row = table(/live/i).getByRole('row', { name: /up\.example/ });
    expect(row.getAttribute('data-status')).toBe('ok');
    expect(within(row).getByText('200')).toBeTruthy();
    const link = within(row).getByRole('link');
    expect(link.getAttribute('href')).toBe('https://up.example');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.hasAttribute('target')).toBe(false);
  });

  it('shows the curated note beside the label', () => {
    render(<Deployments entries={entries} data={data} />);
    const row = table(/live/i).getByRole('row', { name: /up\.example/ });
    expect(row.textContent).toContain('2023 tutorial clone');
  });

  it('keeps a curated live entry that now returns 404 under LIVE, with the dead dot and the real code', () => {
    render(<Deployments entries={entries} data={data} />);
    const row = table(/live/i).getByRole('row', { name: /down\.example/ });
    expect(row.getAttribute('data-status')).toBe('dead');
    expect(within(row).getByText('404')).toBeTruthy();
  });
});

describe('Deployments releases section', () => {
  it('links every asset of the latest release for download, with name and formatted size', () => {
    render(<Deployments entries={entries} data={data} />);
    const row = table(/releases/i).getByRole('row', { name: /shipped/ });
    expect(row.textContent).toContain('v1.2.0');
    const apk = within(row).getByRole('link', { name: /shipped\.apk/ });
    expect(apk.getAttribute('href')).toBe('https://dl.example/v1.2.0/shipped.apk');
    expect(apk.textContent).toContain('431.7 KiB');
    expect(within(row).getByRole('link', { name: /shipped-win\.zip/ }).textContent).toContain('35.9 MiB');
    expect(within(row).queryByRole('link', { name: /old\.apk/ })).toBeNull();
  });

  it('says so, honestly, when a repo has no release yet and points at its Releases page', () => {
    render(<Deployments entries={entries} data={data} />);
    const row = table(/releases/i).getByRole('row', { name: /bare/ });
    const link = within(row).getByRole('link', { name: /no release published yet/ });
    expect(link.getAttribute('href')).toBe('https://github.com/someone/bare/releases');
  });

  it('labels a pre-release, shows its note, and links the Releases page when it has no files', () => {
    render(<Deployments entries={entries} data={data} />);
    const row = table(/releases/i).getByRole('row', { name: /edge/ });
    expect(row.textContent).toContain('edge pre-release');
    expect(within(row).getByText('pre-release')).toBeTruthy();
    const link = within(row).getByRole('link', { name: /no files/ });
    expect(link.getAttribute('href')).toBe('https://github.com/someone/edge/releases');
  });

  it('says the repository is not public when it is absent from the data, without claiming anything about its releases', () => {
    render(<Deployments entries={entries} data={data} />);
    const row = table(/releases/i).getByRole('row', { name: /hidden/ });
    expect(row.textContent).toContain('repository not public');
    expect(row.textContent).not.toMatch(/build|release published/);
    expect(within(row).queryByRole('link')).toBeNull();
  });
});

describe('Deployments retired section', () => {
  it('shows the dead dot, the code and the curated reason', () => {
    render(<Deployments entries={entries} data={data} />);
    const row = table(/retired/i).getByRole('row', { name: /gone/ });
    expect(row.getAttribute('data-status')).toBe('dead');
    expect(within(row).getByText('410')).toBeTruthy();
    expect(row.textContent).toContain('moved to a paid tier');
  });
});

describe('Deployments footer', () => {
  it('says when the statuses were checked, relative to now', () => {
    render(<Deployments entries={entries} data={data} />);
    expect(screen.getByText(/statuses checked 2 hours ago/)).toBeTruthy();
  });
});

describe('Deployments stylesheet', () => {
  // --dead is 4.24:1 on --bg: fine for a dot, too faint for body text.
  it('paints retired row text in --muted-fg and keeps --dead for the dot only', () => {
    const css = readFileSync('src/tui/panes/Deployments.module.css', 'utf8');
    expect(css).toMatch(/\.retired td\s*\{[^}]*var\(--muted-fg\)/);
    expect(css).not.toMatch(/\.retired td\s*\{[^}]*var\(--dead\)/);
  });
});

describe('Deployments with the committed content', () => {
  it('renders all three sections from the real data without throwing', () => {
    render(<Deployments />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/deployments/);
    expect(screen.getAllByRole('table')).toHaveLength(3);
  });
});
