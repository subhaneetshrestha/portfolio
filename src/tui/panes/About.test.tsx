import { render, screen, within } from '@testing-library/react';
import { projects } from '../../content/projects';
import { PROMPT, resume } from '../../content/resume';
import { About } from './About';

const { profile } = resume;

describe('About pane', () => {
  it('keeps the pane heading and shows the whoami prompt', () => {
    render(<About />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/about/);
    expect(screen.getByText(`${PROMPT} whoami`)).toBeTruthy();
  });

  it('renders name, title @ company, location, bio verbatim and summary', () => {
    render(<About />);
    expect(screen.getByText(profile.name)).toBeTruthy();
    expect(screen.getByText(`${profile.title} @ ${profile.company}`)).toBeTruthy();
    expect(screen.getByText(profile.location)).toBeTruthy();
    expect(screen.getByText(profile.bio)).toBeTruthy();
    expect(screen.getByText(profile.summary)).toBeTruthy();
  });

  it('lists the profile links as real anchors with rel="me noopener"', () => {
    render(<About />);
    const list = screen.getByRole('list', { name: /links/i });
    const anchors = within(list).getAllByRole('link');
    expect(anchors.map((a) => a.getAttribute('href'))).toEqual(profile.links.map((l) => l.url));
    expect(anchors.map((a) => a.textContent)).toEqual(profile.links.map((l) => l.label));
    for (const a of anchors) {
      expect(a.getAttribute('rel')).toBe('me noopener');
      expect(a.hasAttribute('target')).toBe(false);
    }
  });

  it('lists the featured project names, each linking to /tui/projects', () => {
    render(<About />);
    const featured = projects().filter((p) => p.featured).map((p) => p.name);
    expect(featured.length).toBeGreaterThan(0);
    const featuredLine = screen.getByText(/^featured:/);
    const links = within(featuredLine).getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual(featured);
    for (const a of links) expect(a.getAttribute('href')).toBe('/tui/projects');
  });
});
