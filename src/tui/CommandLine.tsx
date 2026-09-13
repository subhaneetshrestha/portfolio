import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, Ref } from 'react';
import { deployments } from '../content/deployments';
import { projects } from '../content/projects';
import { navigate } from '../lib/router';
import { complete, run } from './commands';
import styles from './tui.module.css';

const ALL = projects();
const CAP = 50;

type Entry = { input: string; output: string[] };

export function CommandLine({ ref }: { ref?: Ref<HTMLInputElement> }) {
  const [log, setLog] = useState<Entry[]>([]);
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0); // 0 = live input, n = history[length - n]
  const logRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    logRef.current?.lastElementChild?.scrollIntoView?.({ block: 'nearest' });
  }, [log]);

  const append = (entry: Entry) => setLog((l) => [...l, entry].slice(-CAP));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input = value.trim();
    if (!input) return;
    const output: string[] = [];
    let cleared = false;
    run(input, {
      navigate,
      print: (line) => output.push(line),
      clear: () => { cleared = true; },
      projects: ALL,
      deployments,
    });
    if (cleared) setLog([]);
    else append({ input, output });
    setHistory((h) => [...h, input]);
    setCursor(0);
    setValue('');
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(Math.max(cursor + (e.key === 'ArrowUp' ? 1 : -1), 0), history.length);
      setCursor(next);
      setValue(next === 0 ? '' : history[history.length - next]!);
    } else if (e.key === 'Tab' && !e.shiftKey) {
      const found = complete(value, { projects: ALL, deployments });
      if (found.length === 0) return;
      e.preventDefault();
      if (found.length === 1) setValue(value.replace(/\S*$/, found[0]!) + ' ');
      else append({ input: value, output: [found.join('  ')] });
    } else if (e.key === 'Escape') {
      e.currentTarget.blur();
    }
  };

  return (
    <form className={styles.cmd} onSubmit={submit}>
      <ul role="log" aria-live="polite" aria-label="command output" className={styles.log} ref={logRef}>
        {log.map((entry, i) => (
          <li key={i}>
            <span className={styles.echo}>subhaneet@arch:~$ {entry.input}</span>
            {entry.output.length > 0 && <pre>{entry.output.join('\n')}</pre>}
          </li>
        ))}
      </ul>
      <div className={styles.prompt}>
        <label htmlFor="cmd">subhaneet@arch:~$</label>
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
      </div>
    </form>
  );
}
