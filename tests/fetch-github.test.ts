import { readmeExcerpt, sortKeys } from '../scripts/fetch-github.ts';

describe('readmeExcerpt', () => {
  it('takes the first paragraph after the H1 and strips markdown', () => {
    const md = [
      '# atomic',
      '',
      'A **text-only**, minimalist [Android](https://android.com) launcher with `fuzzy` search.',
      'Themes are plain JSON.',
      '',
      '## What works',
      'Lots.',
    ].join('\n');
    expect(readmeExcerpt(md)).toBe(
      'A text-only, minimalist Android launcher with fuzzy search. Themes are plain JSON.',
    );
  });

  it('skips badge and image lines that sit between the H1 and the prose', () => {
    const md = '# x\n\n[![ci](https://b.svg)](https://ci)\n![logo](l.png)\n\nReal words here.\n';
    expect(readmeExcerpt(md)).toBe('Real words here.');
  });

  it('ignores fenced code, including a # comment that looks like an H1', () => {
    const md = 'Bootstrapped with [`create-next-app`](https://x).\n\n## Start\n\n```bash\nnpm run dev\n# or\nyarn dev\n```\n\nOpen it.\n';
    expect(readmeExcerpt(md)).toBe('Bootstrapped with create-next-app.');
  });

  it('falls back to the first paragraph when there is no H1', () => {
    expect(readmeExcerpt('Just prose.\n\nMore.')).toBe('Just prose.');
  });

  it('caps at 300 characters on a word boundary', () => {
    const md = '# t\n\n' + 'word '.repeat(100);
    const out = readmeExcerpt(md)!;
    expect(out.length).toBeLessThanOrEqual(300);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/wor…$/);
  });

  it('returns null when there is nothing but headings', () => {
    expect(readmeExcerpt('# only\n\n## a heading\n')).toBeNull();
    expect(readmeExcerpt('')).toBeNull();
  });
});

describe('sortKeys', () => {
  it('sorts object keys recursively and leaves array order alone', () => {
    const out = sortKeys({ b: 1, a: { d: [{ z: 1, y: 2 }], c: 2 } });
    expect(JSON.stringify(out)).toBe('{"a":{"c":2,"d":[{"y":2,"z":1}]},"b":1}');
  });
});
