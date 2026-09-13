import { deployments } from '../../content/deployments';
import { github } from '../../content/github';
import type { Deployment, GithubData } from '../../content/types';
import styles from './Deployments.module.css';

// Every status, tag, asset and timestamp here comes from github.generated.json.
// deployments.ts only says which URLs and repos to show, and in which section.

/** 2xx/3xx after redirects counts as up; anything else, including a never-completed check, is dead. */
const state = (code: number | undefined) => (code !== undefined && code >= 200 && code < 400 ? 'ok' : 'dead');

/** 0 in the liveness map means the request never completed; absent means it was never checked. */
const codeText = (code: number | undefined) => (code === undefined ? 'unchecked' : code === 0 ? 'no response' : String(code));

const size = (bytes: number) =>
  bytes >= 1 << 20 ? `${(bytes / (1 << 20)).toFixed(1)} MiB` : `${(bytes / 1024).toFixed(1)} KiB`;

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
function ago(iso: string) {
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  const [n, unit] =
    Math.abs(s) < 3600 ? ([s / 60, 'minute'] as const)
    : Math.abs(s) < 86400 ? ([s / 3600, 'hour'] as const)
    : ([s / 86400, 'day'] as const);
  return rtf.format(Math.round(n), unit);
}

/** Dot plus the literal code. The dot is decoration; the code is the signal. */
function Status({ code }: { code: number | undefined }) {
  const live = state(code) === 'ok';
  return (
    <>
      <span aria-hidden="true" className={styles.dot} data-status={state(code)}>{live ? '●' : '○'}</span>
      {' '}
      {codeText(code)}
    </>
  );
}

type Props = { entries?: Deployment[]; data?: GithubData };

export function Deployments({ entries = deployments, data = github }: Props) {
  const of = (kind: Deployment['kind']) => entries.filter((d) => d.kind === kind);
  const code = (d: Deployment) => (d.url ? data.liveness[d.url] : undefined);
  const repoOf = (d: Deployment) => data.repos.find((r) => r.name === d.repo);

  return (
    <>
      <h1>deployments</h1>

      <table className={styles.table}>
        <caption>LIVE</caption>
        <thead>
          <tr><th scope="col">project</th><th scope="col">status</th><th scope="col">url</th></tr>
        </thead>
        <tbody>
          {of('live').map((d) => (
            <tr key={d.id} data-status={state(code(d))}>
              <td>{d.label}</td>
              <td><Status code={code(d)} /></td>
              <td>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noopener">
                    {d.url.replace(/^https?:\/\//, '').replace(/\/$/, '')} <span aria-hidden="true">↗</span>
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className={styles.table}>
        <caption>RELEASES</caption>
        <thead>
          <tr><th scope="col">project</th><th scope="col">tag</th><th scope="col">download</th></tr>
        </thead>
        <tbody>
          {of('release').map((d) => {
            const repo = repoOf(d);
            const latest = repo?.releases?.[0];
            return (
              <tr key={d.id}>
                <td>{d.label}</td>
                <td>{latest ? <><span aria-hidden="true" className={styles.down}>▼</span> {latest.tag}</> : <span className="muted">—</span>}</td>
                <td>
                  {latest ? (
                    <ul className={styles.assets}>
                      {latest.assets.map((a) => (
                        <li key={a.url}>
                          <a href={a.url} download>{a.name} <span className="muted">{size(a.size)}</span></a>
                        </li>
                      ))}
                    </ul>
                  ) : repo ? (
                    <a href={`${repo.url}/releases`}>no signed build published yet</a>
                  ) : (
                    <span className="muted">no signed build published yet</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <table className={`${styles.table} ${styles.retired}`}>
        <caption>RETIRED</caption>
        <thead>
          <tr><th scope="col">project</th><th scope="col">status</th><th scope="col">reason</th></tr>
        </thead>
        <tbody>
          {of('retired').map((d) => (
            <tr key={d.id} data-status={state(code(d))}>
              <td>{d.label}</td>
              <td><Status code={code(d)} /></td>
              <td>{d.note ?? 'no reason recorded'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className={styles.checked}>statuses checked {ago(data.checkedAt)}</p>
    </>
  );
}
