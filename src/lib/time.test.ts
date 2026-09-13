import { relativeTime } from './time';

const now = new Date('2026-09-13T12:00:00Z');
const before = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString();

describe('relativeTime', () => {
  it.each([
    [0, 'now'],
    [30, '30 seconds ago'],
    [5 * 60, '5 minutes ago'],
    [2 * 3600, '2 hours ago'],
    [86_400, 'yesterday'],
    [3 * 86_400, '3 days ago'],
    [20 * 86_400, '3 weeks ago'],
    [40 * 86_400, 'last month'],
    [70 * 86_400, '2 months ago'],
    [400 * 86_400, 'last year'],
    [3 * 31_536_000, '3 years ago'],
  ])('%d seconds before now reads "%s"', (seconds, text) => {
    expect(relativeTime(before(seconds), now)).toBe(text);
  });

  it('defaults to the current time', () => {
    expect(relativeTime(new Date(Date.now() - 2 * 3600_000).toISOString())).toBe('2 hours ago');
  });
});
