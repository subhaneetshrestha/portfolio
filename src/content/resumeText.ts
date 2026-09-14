import { resume } from './resume';
import { TODO } from './types';
import type { Resume, Todo } from './types';

/** What an unfilled field shows as; never a bare TODO on the page. */
export const PLACEHOLDER = '[to be filled]';
const text = (v: string | Todo) => (v === TODO ? PLACEHOLDER : v);

/** The resume with no markup: the copy-as-text payload and ~/resume.md. */
export function resumeText({ profile, experience, education, skills }: Resume = resume): string {
  const email = profile.links.find((l) => l.url.startsWith('mailto:'));
  return [
    profile.name,
    `${profile.title} · ${profile.location}`,
    email ? email.url.replace('mailto:', '') : PLACEHOLDER,
    '',
    profile.summary,
    '',
    'EXPERIENCE',
    ...experience.flatMap((r) => [
      `${r.company} — ${r.title}${r.location ? `, ${r.location}` : ''} (${text(r.start)} – ${r.end})`,
      ...r.bullets.map((b) => `  - ${text(b)}`),
    ]),
    '',
    'EDUCATION',
    ...education.map((e) => `${text(e.school)} — ${text(e.degree)} (${text(e.start)} – ${text(e.end)})`),
    '',
    'SKILLS',
    ...skills.map((g) => `${g.name}: ${g.items.join(', ')}`),
  ].join('\n');
}
