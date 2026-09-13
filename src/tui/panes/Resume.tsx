import { useState } from 'react';
import { resume } from '../../content/resume';
import { TODO } from '../../content/types';
import type { Todo } from '../../content/types';
import '../../styles/print.css';
import s from './resume.module.css';

const PLACEHOLDER = '[to be filled]';
const { profile, experience, education, skills } = resume;
const email = profile.links.find((l) => l.url.startsWith('mailto:'));

const field = (v: string | Todo) =>
  v === TODO ? <span className={s.todo}>{PLACEHOLDER}</span> : v;
const text = (v: string | Todo) => (v === TODO ? PLACEHOLDER : v);

// Same data, no markup: what "copy as text" puts on the clipboard.
function asText(): string {
  const lines = [
    profile.name,
    `${profile.title} · ${profile.location}`,
    email ? email.url.replace('mailto:', '') : PLACEHOLDER,
    '',
    profile.summary,
    '',
    'EXPERIENCE',
    ...experience.flatMap((r) => [
      `${r.company} — ${r.title} (${text(r.start)} – ${r.end})`,
      ...r.bullets.map((b) => `  - ${text(b)}`),
    ]),
    '',
    'EDUCATION',
    ...education.map((e) => `${text(e.school)} — ${text(e.degree)} (${text(e.start)} – ${text(e.end)})`),
    '',
    'SKILLS',
    ...skills.map((g) => `${g.name}: ${g.items.join(', ')}`),
  ];
  return lines.join('\n');
}

export function Resume() {
  const [status, setStatus] = useState('');

  const copy = async () => {
    if (!navigator.clipboard) {
      return setStatus('clipboard unavailable here; select the text and copy instead');
    }
    try {
      await navigator.clipboard.writeText(asText());
      setStatus('copied');
    } catch {
      setStatus('copy refused by the browser; select the text and copy instead');
    }
  };

  return (
    <article className={s.doc}>
      <h1>resume</h1>

      <p>{profile.name}</p>
      <p className={s.meta}>{profile.title} · {profile.location}</p>
      <p>{email ? <a href={email.url}>{email.url.replace('mailto:', '')}</a> : field(TODO)}</p>

      <h2>summary</h2>
      <p>{profile.summary}</p>

      <h2>experience</h2>
      {experience.map((r) => (
        <section key={r.company + r.title}>
          <h3>{r.company} — {r.title}</h3>
          <p className={s.meta}>{field(r.start)} – {r.end}</p>
          <ul>
            {r.bullets.map((b, i) => <li key={i}>{field(b)}</li>)}
          </ul>
        </section>
      ))}

      <h2>education</h2>
      {education.map((e, i) => (
        <section key={i}>
          <h3>{field(e.school)} — {field(e.degree)}</h3>
          <p className={s.meta}>{field(e.start)} – {field(e.end)}</p>
        </section>
      ))}

      <h2>skills</h2>
      <dl className={s.skills}>
        {skills.map((g) => (
          <div key={g.name}>
            <dt>{g.name}</dt>
            <dd>{g.items.join(', ')}</dd>
          </div>
        ))}
      </dl>

      <div className={s.actions}>
        <button type="button" onClick={copy}>copy as text</button>
        <button type="button" onClick={() => window.print()}>print / save as pdf</button>
        <span role="status">{status}</span>
      </div>
    </article>
  );
}
