import { useEffect, useState } from 'react';
import styles from './tui.module.css';

// Flavour, not claims: nothing here asserts a number we can't back.
const LINES = [
  'subhaneet-os 0.1.0 (arch) tty1',
  '[ ok ] mounted /home/subhaneet',
  '[ ok ] started tui.service',
  '',
  'login: subhaneet',
];
const STEP_MS = 140;
const HOLD_MS = 350;

export function Boot({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(0);
  const finished = shown >= LINES.length;

  useEffect(() => {
    const t = setTimeout(finished ? onDone : () => setShown(shown + 1), finished ? HOLD_MS : STEP_MS);
    return () => clearTimeout(t);
  }, [shown, finished, onDone]);

  // Any key or tap skips. The shell's own shortcuts stay off until boot ends.
  useEffect(() => {
    window.addEventListener('keydown', onDone);
    window.addEventListener('pointerdown', onDone);
    return () => {
      window.removeEventListener('keydown', onDone);
      window.removeEventListener('pointerdown', onDone);
    };
  }, [onDone]);

  return (
    <pre role="log" aria-label="boot" className={styles.boot}>
      {LINES.slice(0, shown).join('\n')}
      {'\n'}
      <span className="cursor">▊</span>
    </pre>
  );
}
