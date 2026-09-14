import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ComponentType } from 'react';
import { reducedMotion } from '../lib/prefs';
import { Link, navigate, useRoute } from '../lib/router';
import { Boot } from './Boot';
import { HOME } from './fs';
import { PANES, paneFromRoute } from './panes';
import type { PaneId } from './panes';
import { About } from './panes/About';
import { Deployments } from './panes/Deployments';
import { Projects } from './panes/Projects';
import { Resume } from './panes/Resume';
import { Terminal, prompt } from './Terminal';
import styles from './tui.module.css';

const BOOTED_KEY = 'tui.booted';
const bootedThisSession = () => {
  try { return sessionStorage.getItem(BOOTED_KEY) === '1'; } catch { return false; }
};
const rememberBooted = () => {
  try { sessionStorage.setItem(BOOTED_KEY, '1'); } catch { /* private mode: boot replays, harmless */ }
};

// A keyboard and room for it: the shell. Anything else gets the panes (Task 12 finishes them).
const DESKTOP = '(min-width: 768px) and (pointer: fine)';
const useDesktop = () =>
  useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(DESKTOP);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(DESKTOP).matches,
  );

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && t.matches('input, textarea, select, [contenteditable]');

const VIEWS: Record<PaneId, ComponentType> = {
  about: About,
  resume: Resume,
  projects: Projects,
  deployments: Deployments,
};

export function Shell() {
  const route = useRoute();
  const requested = route.name === 'tui' ? route.pane : null;
  const pane = paneFromRoute(requested);
  const desktop = useDesktop();

  const [booted, setBooted] = useState(() => reducedMotion() || bootedThisSession());
  const finishBoot = useCallback(() => { rememberBooted(); setBooted(true); }, []);
  const [help, setHelp] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const [cwd, setCwd] = useState(HOME);
  const paneRef = useRef<HTMLElement>(null);
  const cmdRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!booted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (e.key === 'Escape') return setHelp(false);
      if (e.key === '?') {
        setHelp((h) => {
          if (!h) opener.current = document.activeElement as HTMLElement;
          return !h;
        });
        return;
      }
      if (e.key === ':') { e.preventDefault(); return cmdRef.current?.focus(); }
      if (desktop) return;
      const jump = PANES.find((p) => p.key === e.key);
      if (jump) return navigate(jump.path);
      const idx = PANES.findIndex((p) => p.id === pane);
      const turn = e.key === 'l' || e.key === 'ArrowRight' ? 1 : e.key === 'h' || e.key === 'ArrowLeft' ? -1 : 0;
      if (turn) return navigate(PANES[(idx + turn + PANES.length) % PANES.length]!.path);
      const roll = e.key === 'j' || e.key === 'ArrowDown' ? 1 : e.key === 'k' || e.key === 'ArrowUp' ? -1 : 0;
      // The terminal's own scrollback (role=log) scrolls itself; don't hijack its arrows.
      if (roll && !(e.target instanceof HTMLElement && e.target.closest('[role="log"]'))) {
        e.preventDefault();
        paneRef.current?.scrollBy({ top: roll * 48 });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [booted, pane, desktop]);

  // A terminal opens with its prompt ready.
  useEffect(() => {
    if (booted && desktop) cmdRef.current?.focus();
  }, [booted, desktop]);

  if (!booted) {
    return (
      <div className={styles.shell}>
        <Boot onDone={finishBoot} />
      </div>
    );
  }

  const View = pane ? VIEWS[pane] : null;
  // The deep link's command; an unknown pane fails the way a wrong path does.
  const initial = pane ? PANES.find((p) => p.id === pane)!.cmd : `cd ~/${requested}`;

  return (
    <div className={styles.shell}>
      <header className={styles.titlebar}>
        <span className={styles.path}>{prompt(cwd).slice(0, -1) /* the prompt without its $ */}</span>
        {!desktop && (
          <nav aria-label="panes" className={styles.tabs}>
            {PANES.map((p) => (
              <Link key={p.id} to={p.path} aria-current={p.id === pane ? 'page' : undefined}>
                <span className={styles.key} aria-hidden="true">{p.key}</span>
                {p.id}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {desktop ? (
        <main className={styles.screen}>
          <Terminal initial={initial} onCwd={setCwd} ref={cmdRef} />
        </main>
      ) : (
        <>
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
          <div className={styles.cmd}>
            <Terminal onCwd={setCwd} ref={cmdRef} />
          </div>
        </>
      )}

      <footer className={styles.statusline}>
        {!desktop && <span>{pane ?? 'error'}</span>}
        <button type="button" className={styles.hint} onClick={() => { opener.current = document.activeElement as HTMLElement; setHelp(true); }}>?:help</button>
        <span className={styles.hint}>
          {desktop ? 'tab:complete · ↑↓:history · ctrl+l:clear · esc:scroll output' : 'h/l:switch · 1-4:jump · j/k:scroll'}
        </span>
      </footer>

      {help && <Help shell={desktop} onClose={() => { setHelp(false); (opener.current ?? cmdRef.current)?.focus(); }} />}
    </div>
  );
}

const SHELL_KEYS = [
  ['enter', 'run the line'],
  ['tab', 'complete a command or path'],
  ['↑ ↓', 'history'],
  ['ctrl+l', 'clear the screen'],
  ['ctrl+c', 'cancel the line'],
  ['ctrl+u', 'clear the line'],
  ['esc', 'focus the output; ↑↓ pgup pgdn scroll, : returns'],
  [':', 'back to the prompt'],
  ['?', 'toggle this help, outside the prompt'],
];
const PANE_KEYS = [
  ['1-4', 'jump to pane'],
  ['h l ← →', 'switch pane'],
  ['j k ↑ ↓', 'scroll'],
  [':', 'command line'],
  ['tab', 'move focus · in the prompt: complete'],
  ['?', 'toggle this help'],
  ['esc', 'close'],
];

// ponytail: non-modal <dialog open> + manual Escape. Task 13 decides whether
// the focus trap of showModal() is worth its jsdom/polyfill cost.
function Help({ shell, onClose }: { shell: boolean; onClose: () => void }) {
  return (
    <dialog open aria-label="keyboard help" className={styles.help}>
      <dl>
        {(shell ? SHELL_KEYS : PANE_KEYS).map(([key, what]) => (
          <div key={key}><dt>{key}</dt><dd>{what}</dd></div>
        ))}
      </dl>
      <button type="button" autoFocus onClick={onClose}>close</button>
    </dialog>
  );
}
