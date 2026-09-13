import { Fragment } from 'react';
import { projects } from '../../content/projects';
import { PROMPT, resume } from '../../content/resume';
import { Link } from '../../lib/router';
import s from './resume.module.css';

const { profile } = resume;
const featured = projects().filter((p) => p.featured);

export function About() {
  return (
    <div className={s.doc}>
      <h1>about</h1>
      <p className={s.prompt}>{PROMPT} whoami</p>

      <p>{profile.name}</p>
      <p>{profile.title} @ {profile.company}</p>
      <p className={s.meta}>{profile.location}</p>
      <p className={s.bio}>{profile.bio}</p>
      <p>{profile.summary}</p>

      <ul aria-label="links" className={s.inline}>
        {profile.links.map((l) => (
          <li key={l.url}><a href={l.url} rel="me noopener">{l.label}</a></li>
        ))}
      </ul>

      <p>
        featured:{' '}
        {featured.length === 0
          ? <span className={s.meta}>no featured projects in the data</span>
          : featured.map((p, i) => (
              <Fragment key={p.name}>
                {i > 0 && ', '}
                <Link to="/tui/projects">{p.name}</Link>
              </Fragment>
            ))}
      </p>
    </div>
  );
}
