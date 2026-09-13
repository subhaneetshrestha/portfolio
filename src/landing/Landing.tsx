import { Link } from '../lib/router';

// Placeholder. Task 8 replaces this with the procedural CRT scene;
// the file path must stay put — tests/build.test.ts keys on it.
export default function Landing() {
  return (
    <main>
      <p>
        subhaneet@arch:~$ <span className="cursor">▊</span>
      </p>
      <Link to="/tui">get inside →</Link>
    </main>
  );
}
