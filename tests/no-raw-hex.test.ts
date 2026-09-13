import { globSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';

// Brand rule: every color goes through a token. A raw hex in a component is
// a color nobody can find or theme later.
const HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i;

const files = globSync(['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.css']).filter(
  (f) => !f.endsWith('tokens.css') && !/\.test\.tsx?$/.test(f),
);

describe('no raw hex colors in components', () => {
  it('scans at least one source file', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${relative(process.cwd(), file)} has no hex literals`, () => {
      const offending = readFileSync(file, 'utf8')
        .split('\n')
        .map((line, i) => (HEX.test(line) ? `${i + 1}: ${line.trim()}` : null))
        .filter(Boolean);
      expect(offending).toEqual([]);
    });
  }
});
