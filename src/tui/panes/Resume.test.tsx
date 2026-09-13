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

  it('renders every TODO as a visible placeholder and never leaks the raw string', () => {
    // The data still carries TODOs; this test is only meaningful while it does.
    expect(resume.experience[0]!.start).toBe(TODO);
    render(<Resume />);
    expect(screen.getAllByLabelText('to be filled').length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain('TODO');
  });

  it('renders the first role and skill groups from the data', () => {
    render(<Resume />);
    const role = resume.experience[0]!;
    expect(screen.getByText(role.company, { exact: false })).toBeTruthy();
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

  it('print / save as pdf calls window.print', () => {
    const print = vi.fn();
    vi.stubGlobal('print', print);
    render(<Resume />);
    fireEvent.click(screen.getByRole('button', { name: /print/i }));
    expect(print).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
