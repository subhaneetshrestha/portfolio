import { globSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';

// Brand rule: every color goes through a token. A raw hex in a component is
// a color nobody can find or theme later. Catches both CSS-style ('#abc123')
// and Three.js's JS-numeric-literal style (0xabc123) — the latter slipped
// past the original #-only regex for a while, and several src/three
// materials used it to dodge this exact check. 0xffffff/0x000000 are the
// one exemption: pure white/black light colors are optical neutrality, not
// a themed design choice.
const HASH_HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i;
const JS_HEX = /0x[0-9a-f]{3,8}\b/i;
const ALLOWED_JS_HEX = new Set(['0x000000', '0xffffff']);

const files = globSync(['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.css']).filter(
  (f) => !f.endsWith('tokens.css') && !/\.test\.tsx?$/.test(f),
);

function findOffenses(line: string): boolean {
  if (HASH_HEX.test(line)) return true;
  const jsHexMatches = line.match(new RegExp(JS_HEX, 'gi')) ?? [];
  return jsHexMatches.some((m) => !ALLOWED_JS_HEX.has(m.toLowerCase()));
}

describe('no raw hex colors in components', () => {
  it('scans at least one source file', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${relative(process.cwd(), file)} has no hex literals`, () => {
      const offending = readFileSync(file, 'utf8')
        .split('\n')
        .map((line, i) => (findOffenses(line) ? `${i + 1}: ${line.trim()}` : null))
        .filter(Boolean);
      expect(offending).toEqual([]);
    });
  }
});
