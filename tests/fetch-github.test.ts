import { checkLiveness, readmeExcerpt, releasesOf, sortKeys } from '../scripts/fetch-github.ts';

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

describe('checkLiveness', () => {
  it('records the final status per URL and 0 when the request never completes, dropping nothing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const get = (async (url: string) => {
      if (url === 'https://b') throw new Error('ECONNREFUSED');
      return { status: url === 'https://a' ? 404 : 301 };
    }) as unknown as typeof fetch;
    await expect(checkLiveness(['https://a', 'https://b', 'https://c'], get)).resolves.toEqual({
      'https://a': 404,
      'https://b': 0,
      'https://c': 301,
    });
  });
});

describe('releasesOf', () => {
  const rel = (over: Record<string, unknown>) => ({
    tag_name: 'v1', name: null, draft: false, prerelease: false, published_at: '2026-01-01T00:00:00Z',
    html_url: 'https://github.com/x/y/releases/tag/v1', assets: [], ...over,
  });

  it('drops draft releases and falls back to the tag when a release has no name', () => {
    const out = releasesOf([rel({ tag_name: 'v2', draft: true, published_at: null }), rel({})]);
    expect(out).toEqual([
      { tag: 'v1', name: 'v1', prerelease: false, publishedAt: '2026-01-01T00:00:00Z', url: 'https://github.com/x/y/releases/tag/v1', assets: [] },
    ]);
  });
});
