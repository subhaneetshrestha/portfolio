/**
 * Three.js has no concept of CSS custom properties, so this is the one place
 * that bridges the two: read the live tokens from src/styles/tokens.css and
 * hand them to the scene as plain color strings. No hex literal belongs here
 * or anywhere else in src/three — tests/no-raw-hex.test.ts enforces it, and
 * this keeps the 3D scene themeable from the exact same source as the DOM.
 */
export type Palette = { bg: string; fg: string; primary: string; accent: string; secondary: string };

const TOKENS = ['--bg', '--fg', '--primary', '--accent', '--secondary'] as const;

export function readPalette(el: HTMLElement = document.documentElement): Palette {
  const cs = getComputedStyle(el);
  const [bg, fg, primary, accent, secondary] = TOKENS.map((t) => cs.getPropertyValue(t).trim());
  return { bg: bg!, fg: fg!, primary: primary!, accent: accent!, secondary: secondary! };
}
