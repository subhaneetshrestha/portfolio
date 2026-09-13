import { projects } from '../../content/projects';
import type { Project } from '../../content/types';
import { relativeTime } from '../../lib/time';
import { Markdown } from '../markdown';
import styles from './Projects.module.css';

// Touch/mobile fallback: the curated READMEs in curated order, each with the
// public facts about its repo. Task 16's shell renders the same markdown.

const ALL = projects();
const bare = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

export function Projects({ list = ALL }: { list?: Project[] }) {
  return (
    <>
      <h1>projects</h1>
      {list.length === 0 && <p className="muted">nothing featured yet.</p>}
      {list.map((p) => (
        <article key={p.id} className={styles.project}>
          <Markdown text={p.markdown} />
          <p className={styles.foot}>
            {p.repoUrl && p.pushedAt ? (
              <>
                <a href={p.repoUrl}>{bare(p.repoUrl)}</a> · last push {relativeTime(p.pushedAt)}
              </>
            ) : (
              'repository not public'
            )}
            {p.releases.length > 0 && ` · ${p.releases.length} release${p.releases.length === 1 ? '' : 's'}`}
          </p>
        </article>
      ))}
    </>
  );
}
