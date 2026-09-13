import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { reducedMotion } from '../lib/prefs';
import { Link, navigate, useRoute } from '../lib/router';
import { Boot } from './Boot';
import { CommandLine } from './CommandLine';
import { PANES, paneFromRoute } from './panes';
import type { PaneId } from './panes';
import { About } from './panes/About';
import { Deployments } from './panes/Deployments';
import { Projects } from './panes/Projects';
import { Resume } from './panes/Resume';
import styles from './tui.module.css';

const BOOTED_KEY = 'tui.booted';
const bootedThisSession = () => {
  try { return sessionStorage.getItem(BOOTED_KEY) === '1'; } catch { return false; }
};
const rememberBooted = () => {
  try { sessionStorage.setItem(BOOTED_KEY, '1'); } catch { /* private mode: boot replays, harmless */ }
};

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && t.matches('input, textarea, select, [contenteditable]');

const VIEWS: Record<PaneId, ComponentType> = {
  about: About,
  resume: Resume,
  projects: Projects,
  deployments: Deployments,
};

export function Shell({ boot = true }: { boot?: boolean }) {
  const route = useRoute();
  const requested = route.name === 'tui' ? route.pane : null;
  const pane = paneFromRoute(requested);

  const [booted, setBooted] = useState(() => !boot || reducedMotion() || bootedThisSession());
  const finishBoot = useCallback(() => { rememberBooted(); setBooted(true); }, []);
  const [help, setHelp] = useState(false);
  const paneRef = useRef<HTMLElement>(null);
  const cmdRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!booted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (e.key === 'Escape') return setHelp(false);
      if (e.key === '?') return setHelp((h) => !h);
      if (e.key === ':') { e.preventDefault(); return cmdRef.current?.focus(); }
      const jump = PANES.find((p) => p.key === e.key);
      if (jump) return navigate(jump.path);
      const idx = PANES.findIndex((p) => p.id === pane);
      const turn = e.key === 'l' || e.key === 'ArrowRight' ? 1 : e.key === 'h' || e.key === 'ArrowLeft' ? -1 : 0;
      if (turn) return navigate(PANES[(idx + turn + PANES.length) % PANES.length]!.path);
      const roll = e.key === 'j' || e.key === 'ArrowDown' ? 1 : e.key === 'k' || e.key === 'ArrowUp' ? -1 : 0;
      if (roll) { e.preventDefault(); paneRef.current?.scrollBy({ top: roll * 48 }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [booted, pane]);

  if (!booted) {
    return (
      <div className={styles.shell}>
        <Boot onDone={finishBoot} />
      </div>
    );
  }

  const View = pane ? VIEWS[pane] : null;

  return (
    <div className={styles.shell}>
      <header className={styles.titlebar}>
        <span className={styles.path}>subhaneet@arch:~{pane && pane !== 'about' ? `/${pane}` : ''}</span>
        <nav aria-label="panes" className={styles.tabs}>
          {PANES.map((p) => (
            <Link key={p.id} to={p.path} aria-current={p.id === pane ? 'page' : undefined}>
              <span className={styles.key}>{p.key}</span>
              {p.id}
            </Link>
          ))}
        </nav>
      </header>

      <main className={styles.pane} ref={paneRef}>
        {View ? (
          <View />
        ) : (
          <>
            <h1>tui: no such pane: {requested}</h1>
            <p className="muted">panes: {PANES.map((p) => p.id).join(', ')}</p>
          </>
        )}
      </main>

      <CommandLine ref={cmdRef} />

      <footer className={styles.statusline}>
        <span>{pane ?? 'error'}</span>
        <button type="button" className={styles.hint} onClick={() => setHelp(true)}>?:help</button>
        <span className={styles.hint}>h/l:switch · 1-4:jump · j/k:scroll</span>
      </footer>

      {help && <Help onClose={() => setHelp(false)} />}
    </div>
  );
}

// ponytail: non-modal <dialog open> + manual Escape. Task 13 decides whether
// the focus trap of showModal() is worth its jsdom/polyfill cost.
function Help({ onClose }: { onClose: () => void }) {
  return (
    <dialog open aria-label="keyboard help" className={styles.help}>
      <dl>
        <dt>1-4</dt><dd>jump to pane</dd>
        <dt>h l ← →</dt><dd>switch pane</dd>
        <dt>j k ↑ ↓</dt><dd>scroll</dd>
        <dt>:</dt><dd>command line</dd>
        <dt>tab</dt><dd>move focus (browser-native)</dd>
        <dt>?</dt><dd>toggle this help</dd>
        <dt>esc</dt><dd>close</dd>
      </dl>
      <button type="button" autoFocus onClick={onClose}>close</button>
    </dialog>
  );
}
