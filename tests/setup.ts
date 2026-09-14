import { readFileSync } from 'node:fs';
import { vi } from 'vitest';

// jsdom doesn't run the real CSS cascade for an imported stylesheet, so
// getComputedStyle never sees tokens.css's custom properties on its own.
// Anything that reads a token via the DOM (src/three/palette.ts) needs them
// applied directly — parsed from the one real source file, never duplicated
// as literal hex here (that would dodge tests/no-raw-hex.test.ts, not honor it).
const TOKENS = Object.fromEntries(
  [...readFileSync('src/styles/tokens.css', 'utf8').matchAll(/(--[\w-]+):\s*(#[0-9a-f]{3,8});/gi)].map(
    ([, name, value]) => [name!, value!],
  ),
);

/** One answer for every media query, or a function that answers per query. */
export function stubMatchMedia(matches: boolean | ((query: string) => boolean)) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: typeof matches === 'function' ? matches(query) : matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  stubMatchMedia(false);
  try { sessionStorage.clear(); } catch { /* private mode */ }
  for (const [name, value] of Object.entries(TOKENS)) document.documentElement.style.setProperty(name, value);
});
