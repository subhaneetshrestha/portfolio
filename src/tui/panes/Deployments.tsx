import { deployments } from '../../content/deployments';
import { github } from '../../content/github';
import type { Deployment, GithubData } from '../../content/types';
import { relativeTime } from '../../lib/time';
import styles from './Deployments.module.css';

// Every status, tag, asset and timestamp here comes from github.generated.json.
// deployments.ts only says which URLs and repos to show, and in which section.

/** 2xx/3xx after redirects counts as up; anything else, including a never-completed check, is dead. */
const state = (code: number | undefined) => (code !== undefined && code >= 200 && code < 400 ? 'ok' : 'dead');

/** 0 in the liveness map means the request never completed; absent means it was never checked. */
export const codeText = (code: number | undefined) => (code === undefined ? 'unchecked' : code === 0 ? 'no response' : String(code));

const size = (bytes: number) =>
  bytes >= 1 << 20 ? `${(bytes / (1 << 20)).toFixed(1)} MiB` : `${(bytes / 1024).toFixed(1)} KiB`;

/** Label plus the curated note from deployments.ts, when there is one. */
const Label = ({ d }: { d: Deployment }) => (
  <>
    {d.label}
    {d.note && <span className="muted"> — {d.note}</span>}
  </>
);

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
              <td><Label d={d} /></td>
              <td><Status code={code(d)} /></td>
              <td>
                {d.url && (
                  <a href={d.url} rel="noopener">
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
                <td><Label d={d} /></td>
                <td>
                  {latest ? (
                    <>
                      <span aria-hidden="true" className={styles.down}>▼</span> {latest.tag}
                      {latest.prerelease && <> <span className="muted">pre-release</span></>}
                    </>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  {!repo ? (
                    <span className="muted">repository not public</span>
                  ) : !latest ? (
                    <a href={`${repo.url}/releases`}>no release published yet</a>
                  ) : latest.assets.length === 0 ? (
                    <a href={`${repo.url}/releases`}>no files attached</a>
                  ) : (
                    <ul className={styles.assets}>
                      {latest.assets.map((a) => (
                        <li key={a.url}>
                          <a href={a.url}>{a.name} <span className="muted">{size(a.size)}</span></a>
                        </li>
                      ))}
                    </ul>
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

      <p className={styles.checked}>statuses checked {relativeTime(data.checkedAt)}</p>
    </>
  );
}
