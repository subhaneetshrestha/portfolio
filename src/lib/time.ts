// Largest unit first; the first one the gap reaches wins, seconds as the floor.
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000], ['month', 2_592_000], ['week', 604_800], ['day', 86_400], ['hour', 3600], ['minute', 60], ['second', 1],
];
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "3 days ago", "yesterday", "now": an ISO timestamp relative to `now`. */
export function relativeTime(iso: string, now = new Date()): string {
  const s = (new Date(iso).getTime() - now.getTime()) / 1000;
  const [unit, secs] = UNITS.find(([, n]) => Math.abs(s) >= n) ?? UNITS[UNITS.length - 1]!;
  return rtf.format(Math.round(s / secs), unit);
}
