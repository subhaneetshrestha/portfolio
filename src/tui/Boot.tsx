import { useEffect, useState } from 'react';
import { deployments } from '../content/deployments';
import { github } from '../content/github';
import { HOST, resume } from '../content/resume';
import styles from './tui.module.css';

// Every number here comes from github.generated.json.
const { handle } = resume.profile;
const checked = deployments.filter((d) => d.url);
// 2xx/3xx after redirects is live — the same rule the deployments pane draws its dot from.
const live = checked.filter((d) => { const c = github.liveness[d.url!]; return c !== undefined && c >= 200 && c < 400; }).length;
const LINES = [
  `Arch Linux (${HOST}) tty1`,
  `[ ok ] mounted /home/${handle}`,
  `[ ok ] indexed ${github.repos.length} repositories`,
  `[ ok ] checked ${checked.length} deployments — ${live} live`,
  '[ ok ] started tui.service',
  '',
];
const LOGIN = `login: ${handle}`;
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

  // The typed lines are not a live region: re-announcing the whole log every
  // tick is noise. The login line is the one polite announcement, at the end.
  return (
    <pre className={styles.boot}>
      {LINES.slice(0, shown).map((line, i) => <span key={i}>{line}{'\n'}</span>)}
      <span role="status">{finished && `${LOGIN}\n`}</span>
      <span className="cursor" aria-hidden="true">▊</span>
    </pre>
  );
}
