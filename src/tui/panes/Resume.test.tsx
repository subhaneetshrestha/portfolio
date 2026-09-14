import { readFileSync } from 'node:fs';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { resume } from '../../content/resume';
import { TODO } from '../../content/types';
import { Resume } from './Resume';

const knownUrls = resume.profile.links.map((l) => l.url);

const stubClipboard = (writeText: (t: string) => Promise<void>) =>
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
});

describe('Resume pane', () => {
  it('renders the name and title from resume.ts', () => {
    render(<Resume />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/resume/);
    expect(screen.getByText(resume.profile.name)).toBeTruthy();
    expect(screen.getByText(`${resume.profile.title} · ${resume.profile.location}`)).toBeTruthy();
  });

  it('renders a TODO field as a visible placeholder and never leaks the raw string', async () => {
    // A fixture, not the live resume: the placeholder behaviour must hold whether
    // or not the real content currently has a gap (it has none right now).
    vi.resetModules();
    vi.doMock('../../content/resume', () => ({
      resume: {
        profile: { name: 'X', handle: 'x', title: 'T', company: 'C', location: 'L', bio: '', summary: '', links: [] },
        skills: [],
        experience: [{ company: 'Acme', title: 'Eng', start: TODO, end: 'present', bullets: [TODO] }],
        education: [{ school: TODO, degree: TODO, start: TODO, end: TODO }],
      },
    }));
    const { Resume: FixtureResume } = await import('./Resume');
    render(<FixtureResume />);
    expect(screen.getAllByText('[to be filled]').length).toBeGreaterThan(0);
    expect(screen.queryAllByLabelText('to be filled')).toHaveLength(0);
    expect(document.body.textContent).not.toContain('TODO');
    vi.doUnmock('../../content/resume');
    vi.resetModules();
  });

  it('renders the first role, its location, and skill groups from the data', () => {
    render(<Resume />);
    const role = resume.experience[0]!;
    expect(screen.getByText(role.company, { exact: false })).toBeTruthy();
    if (role.location) expect(screen.getByText(role.location, { exact: false })).toBeTruthy();
    for (const group of resume.skills) {
      expect(screen.getByText(group.name)).toBeTruthy();
      expect(screen.getByText(group.items.join(', '))).toBeTruthy();
    }
  });

  it('links only to urls that exist in resume.ts, with the email as a mailto', () => {
    render(<Resume />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(knownUrls).toContain(href);
    expect(hrefs.some((h) => h!.startsWith('mailto:'))).toBe(true);
  });

  it('copies a plain-text rendering containing the name and first company', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(<Resume />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /copy as text/i })); });
    const text = writeText.mock.calls[0]![0] as string;
    expect(text).toContain(resume.profile.name);
    expect(text).toContain(resume.experience[0]!.company);
    expect(text).not.toContain('TODO');
    expect(screen.getByRole('status').textContent).toMatch(/copied/i);
  });

  it('says so inline when the clipboard is unavailable', async () => {
    render(<Resume />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /copy as text/i })); });
    expect(screen.getByRole('status').textContent).toMatch(/clipboard/i);
  });

  it('print hides the shell chrome and the command form', () => {
    const css = readFileSync('src/styles/print.css', 'utf8');
    const hidden = css.split('\n').find((line) => line.includes('display: none')) ?? '';
    for (const sel of ['header', 'footer', 'dialog', 'form', 'button']) expect(hidden).toMatch(new RegExp(`\\b${sel}\\b`));
  });

  it('draws focus rings in --primary and puts no cursor after an executed prompt line', () => {
    const css = readFileSync('src/tui/panes/resume.module.css', 'utf8');
    expect(css).not.toMatch(/focus-visible\s*\{[^}]*var\(--accent\)/);
    expect(css).toMatch(/focus-visible\s*\{[^}]*var\(--primary\)/);
    expect(css).not.toMatch(/\.prompt::after/);
  });

  it('print / save as pdf calls window.print', () => {
    const print = vi.fn();
    vi.stubGlobal('print', print);
    render(<Resume />);
    fireEvent.click(screen.getByRole('button', { name: /print/i }));
    expect(print).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
