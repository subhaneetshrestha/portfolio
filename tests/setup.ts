import { vi } from 'vitest';

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
});
