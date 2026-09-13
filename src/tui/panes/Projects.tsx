import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { projects } from '../../content/projects';
import type { Project } from '../../content/types';
import { relativeTime } from '../../lib/time';
import styles from './Projects.module.css';

const ALL = projects();

// README openers that scaffolding tools write, not the author. Matched after
// stripping leading emoji/punctuation ("✨ Your new, shiny Nx workspace…").
const BOILERPLATE = [
  'This project was generated',
  'This project was bootstrapped',
  'This is a Next.js project bootstrapped',
  'Your new, shiny Nx workspace',
  'This example features',
];
const excerptOf = (readme: string | null) => {
  const text = (readme ?? '').replace(/^\W+/, '');
  return text && !BOILERPLATE.some((b) => text.startsWith(b)) ? text : null;
};

const LANG_COLOR: Record<string, string> = {
  Go: 'var(--primary)',
  TypeScript: 'var(--secondary)',
  JavaScript: 'var(--secondary)',
  Kotlin: 'var(--accent)',
  Lua: 'var(--ok)',
};

function LangBar({ languages }: { languages: Record<string, number> }) {
  const total = Object.values(languages).reduce((a, b) => a + b, 0);
  const share = Object.entries(languages)
    .map(([name, bytes]) => ({ name, pct: (bytes / total) * 100 }))
    .sort((a, b) => b.pct - a.pct);
  return (
    <div className={styles.langs}>
      <div className={styles.bar} aria-hidden="true">
        {share.map((s) => (
          <span key={s.name} style={{ width: `${s.pct}%`, background: LANG_COLOR[s.name] ?? 'var(--muted-fg)' }} />
        ))}
      </div>
      <span>{share.slice(0, 3).map((s) => `${s.name} ${Math.round(s.pct)}%`).join(' · ')}</span>
    </div>
  );
}

const bare = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

export function Projects({ list = ALL }: { list?: Project[] }) {
  const [sel, setSel] = useState(list[0]?.name);
  const listRef = useRef<HTMLElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const archiveRef = useRef<HTMLDetailsElement>(null);
  const current = list.find((p) => p.name === sel) ?? list[0];

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [sel]);

  const onListKey = (e: KeyboardEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'SUMMARY') return; // native toggle
    const step = e.key === 'j' || e.key === 'ArrowDown' ? 1 : e.key === 'k' || e.key === 'ArrowUp' ? -1 : 0;
    if (step) {
      e.preventDefault();
      const visible = list.filter((p) => !p.archived || archiveRef.current?.open);
      const i = visible.findIndex((p) => p.name === current?.name);
      setSel(visible[Math.min(Math.max(i + step, 0), visible.length - 1)]?.name);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (target.dataset.name) setSel(target.dataset.name);
      detailRef.current?.focus();
    }
  };
  const onDetailKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    listRef.current?.focus();
  };

  if (!current) {
    return (
      <>
        <h1>projects</h1>
        <p className="muted">no repositories in the generated data.</p>
      </>
    );
  }

  const group = (label: string, items: Project[]) => (
    <ul aria-label={label}>
      {items.map((p) => (
        <li key={p.name}>
          <button
            type="button"
            tabIndex={-1}
            className={styles.item}
            data-name={p.name}
            aria-current={p.name === current.name ? 'true' : undefined}
            onClick={() => setSel(p.name)}
          >
            {p.name}
          </button>
        </li>
      ))}
    </ul>
  );

  const featured = list.filter((p) => p.featured && !p.archived);
  const active = list.filter((p) => !p.featured && !p.archived);
  const archived = list.filter((p) => p.archived);
  const excerpt = excerptOf(current.readme);
  const langs = current.languages && Object.keys(current.languages).length > 0 ? current.languages : null;

  return (
    <>
      <h1>projects</h1>
      <div className={styles.split}>
        <section aria-label="project list" tabIndex={0} className={styles.list} ref={listRef} onKeyDown={onListKey}>
          {featured.length > 0 && <h2>featured</h2>}
          {featured.length > 0 && group('featured', featured)}
          {active.length > 0 && <h2>active</h2>}
          {active.length > 0 && group('active', active)}
          {archived.length > 0 && (
            <details ref={archiveRef}>
              <summary>archive · {archived.length} repos</summary>
              {group('archive', archived)}
            </details>
          )}
        </section>

        <section aria-label="project detail" tabIndex={-1} className={styles.detail} ref={detailRef} onKeyDown={onDetailKey}>
          <h2>{current.name}</h2>
          {current.description ? <p>{current.description}</p> : <p className="muted">no description on GitHub</p>}
          {langs ? <LangBar languages={langs} /> : <p className="muted">no language data</p>}
          {excerpt && <blockquote cite={current.url}>{excerpt}</blockquote>}
          <p className="muted">
            pushed {relativeTime(current.pushedAt)} · created {current.createdAt.slice(0, 4)}
          </p>
          <p>
            <a href={current.url}>{bare(current.url)}</a>
            {current.homepage && (
              <>
                <span className="muted"> · </span>
                <a href={current.homepage}>{bare(current.homepage)}</a>
              </>
            )}
          </p>
        </section>
      </div>
    </>
  );
}
