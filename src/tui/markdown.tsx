import type { ReactNode } from 'react';
import styles from './tui.module.css';

// Markdown-lite for the curated READMEs: shared by the mobile Projects pane
// and the shell's `cat`. Regex only; anything it does not know stays literal.

const PLACEHOLDER = '[to be filled]';
const KEY = /^(status|stack):/;
// Bare URLs (trailing punctuation stays text) and the author's [fill in…] marks.
const INLINE = /(https?:\/\/[^\s<>()]*[^\s<>().,;:!?]|\[fill in(?::[^\]]*)?\])/g;

/** Bare URLs become links and [fill in…] marks a placeholder; the shell reuses it for plain output. */
export const inline = (text: string): ReactNode[] =>
  text.split(INLINE).map((part, i) => {
    if (i % 2 === 0) return part;
    if (part.startsWith('[')) return <span key={i} className={styles.fill}>{PLACEHOLDER}</span>;
    return <a key={i} href={part}>{part}</a>;
  });

/**
 * Hard-wrapped lines stay in one paragraph; a blank line or a status:/stack: line starts the next.
 * The break is kept: prose reflows where white-space is normal, and `cat` shows it as written.
 */
const paragraphs = (block: string): string[] =>
  block.split('\n').reduce<string[]>((acc, line) => {
    if (KEY.test(line) || acc.length === 0) acc.push(line);
    else acc[acc.length - 1] += `\n${line}`;
    return acc;
  }, []);

export function Markdown({ text }: { text: string }) {
  return (
    <div className={styles.md}>
      {text.trim().split(/\n\s*\n/).flatMap((block, b) => {
        if (block.startsWith('# ')) return <h2 key={b}>{block.slice(2)}</h2>;
        return paragraphs(block).map((p, i) => {
          const key = p.match(KEY)?.[0];
          return (
            <p key={`${b}.${i}`}>
              {key && <span className={styles.mdKey}>{key}</span>}
              {inline(key ? p.slice(key.length) : p)}
            </p>
          );
        });
      })}
    </div>
  );
}
