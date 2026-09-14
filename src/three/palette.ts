/**
 * Three.js has no concept of CSS custom properties, so this is the one place
 * that bridges the two: read the live tokens from src/styles/tokens.css and
 * hand them to the scene as plain color strings. No hex literal belongs here
 * or anywhere else in src/three — tests/no-raw-hex.test.ts enforces it, and
 * this keeps the 3D scene themeable from the exact same source as the DOM.
 *
 * `--scene-*` tokens are landing-scene-only: sampled directly from a specific
 * reference image ("exact color assets"), distinct from the --bg/--fg/etc.
 * brand tokens the dark-terminal TUI uses everywhere else.
 */
export type Palette = {
  bg: string;
  fg: string;
  primary: string;
  accent: string;
  secondary: string;
  wall: string;
  wood: string;
  woodDark: string;
  rug: string;
  chair: string;
  bezel: string;
  tower: string;
  glow: string;
  glow2: string;
  led: string;
  cactus: string;
  pot: string;
  bookA: string;
  bookB: string;
  bookC: string;
  mousepad: string;
  keycap: string;
  keycapAccent: string;
  window: string;
};

const TOKENS: Record<keyof Palette, string> = {
  bg: '--bg',
  fg: '--fg',
  primary: '--primary',
  accent: '--accent',
  secondary: '--secondary',
  wall: '--scene-wall',
  wood: '--scene-wood',
  woodDark: '--scene-wood-dark',
  rug: '--scene-rug',
  chair: '--scene-chair',
  bezel: '--scene-bezel',
  tower: '--scene-tower',
  glow: '--scene-glow',
  glow2: '--scene-glow-2',
  led: '--scene-led',
  cactus: '--scene-cactus',
  pot: '--scene-pot',
  bookA: '--scene-book-a',
  bookB: '--scene-book-b',
  bookC: '--scene-book-c',
  mousepad: '--scene-mousepad',
  keycap: '--scene-keycap',
  keycapAccent: '--scene-keycap-accent',
  window: '--scene-window',
};

export function readPalette(el: HTMLElement = document.documentElement): Palette {
  const cs = getComputedStyle(el);
  const entries = (Object.entries(TOKENS) as [keyof Palette, string][]).map(
    ([key, cssVar]) => [key, cs.getPropertyValue(cssVar).trim()] as const,
  );
  return Object.fromEntries(entries) as Palette;
}
