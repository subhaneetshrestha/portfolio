import { readFileSync } from 'node:fs';

// The palette from tasks/plan.md. Changing a color is a deliberate act that
// updates this table; it should never drift silently.
const PALETTE: Record<string, string> = {
  '--bg': '#0B0D10',
  '--fg': '#C9D1D9',
  '--primary': '#00ADD8',
  '--accent': '#FFB454',
  '--secondary': '#1793D1',
  '--ok': '#3FB950',
  '--dead': '#6E7681',
  '--muted-fg': '#8B949E',
};

const css = readFileSync('src/styles/tokens.css', 'utf8');

describe('design tokens', () => {
  for (const [name, hex] of Object.entries(PALETTE)) {
    it(`defines ${name} as ${hex}`, () => {
      const re = new RegExp(`${name}\\s*:\\s*${hex}\\s*;`, 'i');
      expect(css).toMatch(re);
    });
  }

  it('uses JetBrains Mono as the only font family', () => {
    expect(css).toMatch(/--font-mono\s*:\s*['"]JetBrains Mono['"]/);
  });
});
