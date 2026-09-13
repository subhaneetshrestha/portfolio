import { lazy, Suspense } from 'react';
import { PROMPT } from './content/resume';
import { Link, useRoute } from './lib/router';
import { Shell } from './tui/Shell';

// The landing (and, from Task 8, three.js) lives in its own chunk.
// /tui must never pay for it. tests/build.test.ts enforces this.
const Landing = lazy(() => import('./landing/Landing'));

function NotFound() {
  return (
    <main className="centered">
      <p>{PROMPT} cd {window.location.pathname}</p>
      <p className="muted">bash: cd: {window.location.pathname}: No such file or directory</p>
      <Link to="/tui">cd ~</Link>
    </main>
  );
}

export function App() {
  const route = useRoute();
  switch (route.name) {
    case 'landing':
      return (
        <Suspense fallback={<main className="centered"><span className="cursor">▊</span></main>}>
          <Landing />
        </Suspense>
      );
    case 'tui':
      return <Shell />;
    case 'notfound':
      return <NotFound />;
  }
}
