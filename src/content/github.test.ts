import { github, validate } from './github';

const repo = {
  name: 'x',
  description: null,
  homepage: null,
  url: 'https://github.com/subhaneetshrestha/x',
  createdAt: '2026-01-01T00:00:00Z',
  pushedAt: '2026-01-02T00:00:00Z',
  stars: 0,
  topics: [],
  archived: false,
  languages: { Go: 10 },
  releases: [],
};
const ok = { fetchedAt: '2026-09-13T00:00:00Z', checkedAt: '2026-09-13T00:00:00Z', liveness: {}, repos: [repo] };

describe('validate', () => {
  it('accepts a well-formed document', () => {
    expect(validate(ok).repos[0]?.name).toBe('x');
  });

  it('rejects an empty repos array, so a bad fetch cannot build an empty portfolio', () => {
    expect(() => validate({ ...ok, repos: [] })).toThrow(/npm run content/);
  });

  it('rejects a repo with a malformed field', () => {
    const bad = { ...ok, repos: [{ ...repo, languages: 'Go' }] };
    expect(() => validate(bad)).toThrow(/npm run content/);
    expect(() => validate({ ...ok, repos: 'none' })).toThrow(/npm run content/);
  });

  it('rejects a liveness status that is not a number', () => {
    expect(() => validate({ ...ok, liveness: { 'https://a': '200' } })).toThrow(/npm run content/);
  });
});

describe('committed generated content', () => {
  it('is present and non-empty, so the build never ships an empty portfolio', () => {
    expect(github.repos.length).toBeGreaterThan(0);
    expect(Object.keys(github.liveness).length).toBeGreaterThan(0);
  });
});
