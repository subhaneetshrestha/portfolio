import { PROMPT } from '../content/resume';
import { Link } from '../lib/router';

// Placeholder. Task 8 replaces this with the procedural CRT scene;
// the file path must stay put — tests/build.test.ts keys on it.
export default function Landing() {
  return (
    <main className="centered">
      <p>
        {PROMPT} <span className="cursor">▊</span>
      </p>
      <Link to="/tui">get inside →</Link>
    </main>
  );
}
