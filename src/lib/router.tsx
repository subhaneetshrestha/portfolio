import { useSyncExternalStore } from 'react';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';

// ponytail: three static route shapes, hand-rolled on the History API.
// Reach for react-router if params or nested layouts ever appear.

export type Route =
  | { name: 'landing' }
  | { name: 'tui'; pane: string | null }
  | { name: 'notfound' };

export function parseRoute(pathname: string): Route {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'landing' };
  if (parts[0] === 'tui' && parts.length <= 2) return { name: 'tui', pane: parts[1] ?? null };
  return { name: 'notfound' };
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener('popstate', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('popstate', cb);
  };
}

const getPath = () => window.location.pathname;

export function navigate(to: string) {
  if (to === getPath()) return;
  window.history.pushState(null, '', to);
  listeners.forEach((l) => l());
}

export function useRoute(): Route {
  return parseRoute(useSyncExternalStore(subscribe, getPath));
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string };

export function Link({ to, onClick, ...rest }: LinkProps) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    // Leave modified clicks and middle-clicks to the browser (new tab etc.)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handle} {...rest} />;
}
