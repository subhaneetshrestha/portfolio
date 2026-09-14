import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, MouseEvent, Ref } from 'react';
import { PROMPT } from '../content/resume';
import { navigate } from '../lib/router';
import { complete, run } from './commands';
import * as fs from './fs';
import { HOME } from './fs';
import { Markdown, inline } from './markdown';
import styles from './tui.module.css';

const CAP = 500; // lines of scrollback
const MOTD = 'text only. type help.';

type Chunk = string[] | { md: string };
type Entry = { id: number; prompt?: string; input?: string; output: Chunk[] };

/** The brand mark with the working directory in it: hyzii@arch:~/projects$ */
export const prompt = (cwd: string) => PROMPT.replace('~', cwd.replace(new RegExp(`^${HOME}(?=/|$)`), '~'));

const lines = (e: Entry) =>
  (e.input === undefined ? 0 : 1) + e.output.reduce((n, c) => n + (Array.isArray(c) ? c.length : c.md.split('\n').length), 0);
/** Drops the oldest entries until the scrollback fits CAP lines; the newest always stays. */
const cap = (log: Entry[]) => {
  let total = log.reduce((n, e) => n + lines(e), 0);
  let i = 0;
  while (total > CAP && i < log.length - 1) total -= lines(log[i++]!);
  return log.slice(i);
};

export function Terminal({ initial, onCwd, ref }: { initial?: string | null; onCwd?: (cwd: string) => void; ref?: Ref<HTMLInputElement> }) {
  const [log, setLog] = useState<Entry[]>([{ id: 0, output: [[MOTD]] }]);
  // Scrollback entries are keyed by this, not array position — cap() drops from the
  // front, and a position-based key would make React rewrite every surviving <li> in
  // place (and, since the log is aria-live=polite, re-announce them) on every drop.
  const seq = useRef(1);
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cwd, setCwd] = useState(HOME);
  const [cursor, setCursor] = useState(0); // 0 = live input, n = history[length - n]
  const draft = useRef(''); // what was typed at the live line before ArrowUp left it
  const logRef = useRef<HTMLDivElement>(null);
  const ran = useRef(false);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  const append = (entry: Omit<Entry, 'id'>) => setLog((l) => cap([...l, { id: seq.current++, prompt: prompt(cwd), ...entry }]));

  const exec = (input: string) => {
    const output: Chunk[] = [];
    let cleared = false;
    run(input, {
      cwd,
      setCwd: (path) => { setCwd(path); onCwd?.(path); },
      fs,
      print: (l) => {
        const last = output[output.length - 1];
        if (Array.isArray(last)) last.push(...[l].flat());
        else output.push([l].flat());
      },
      markdown: (md) => output.push({ md }),
      clear: () => { cleared = true; },
      navigate,
      openUrl: (url) => window.open(url, '_blank', 'noopener'),
      history,
      now: new Date(),
    });
    if (cleared) setLog([]);
    else append({ input, output });
    setHistory((h) => [...h, input]);
  };

  // The deep link's command, once per mount (StrictMode replays effects; the ref does not reset).
  useEffect(() => {
    if (ran.current || !initial) return;
    ran.current = true;
    exec(initial);
  }, []);

  const reset = () => { setValue(''); setCursor(0); };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input = value.trim();
    if (!input) return;
    exec(input);
    reset();
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey && !e.altKey && !e.metaKey) {
      const el = e.currentTarget;
      if (e.key === 'c' && el.selectionStart !== el.selectionEnd) return; // copying, not cancelling
      if (e.key === 'l') setLog([]);
      else if (e.key === 'c') { append({ input: `${value}^C`, output: [] }); reset(); }
      else if (e.key === 'u') reset();
      else return;
      e.preventDefault();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(Math.max(cursor + (e.key === 'ArrowUp' ? 1 : -1), 0), history.length);
      if (next === cursor) return;
      if (cursor === 0) draft.current = value;
      setCursor(next);
      setValue(next === 0 ? draft.current : history[history.length - next]!);
    } else if (e.key === 'Tab' && !e.shiftKey) {
      const { replacement, candidates } = complete(value, { cwd, fs });
      if (candidates.length === 0) return;
      e.preventDefault();
      if (replacement) setValue(replacement);
      else append({ input: value, output: [[candidates.join('  ')]] });
    } else if (e.key === 'Escape') {
      // Hand focus to the scrollback rather than dropping it to <body>: from there
      // ↑↓/PageUp/PageDown scroll nothing, since .log — not the document — scrolls.
      logRef.current?.focus();
    }
  };

  const focus = (e: MouseEvent<HTMLDivElement>) => {
    if (window.getSelection()?.toString()) return; // selecting text to copy
    e.currentTarget.querySelector('input')?.focus();
  };

  return (
    <div className={styles.terminal} onClick={focus}>
      <div role="log" aria-live="polite" aria-label="terminal output" tabIndex={0} className={styles.log} ref={logRef}>
        <ol>
          {log.map((entry) => (
            <li key={entry.id}>
              {entry.input !== undefined && <span className={styles.echo}>{entry.prompt} {entry.input}</span>}
              {entry.output.map((chunk, j) =>
                Array.isArray(chunk) ? (
                  <pre key={j}>{chunk.map((line, k) => <span key={k}>{inline(line)}{'\n'}</span>)}</pre>
                ) : (
                  <Markdown key={j} text={chunk.md} />
                ),
              )}
            </li>
          ))}
        </ol>
      </div>
      <form className={styles.prompt} onSubmit={submit}>
        <label htmlFor="cmd">{prompt(cwd)}</label>
        <input
          id="cmd"
          ref={ref}
          aria-label="command"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
        />
      </form>
    </div>
  );
}
