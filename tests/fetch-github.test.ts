import { checkLiveness, releasesOf, sortKeys } from '../scripts/fetch-github.ts';

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
