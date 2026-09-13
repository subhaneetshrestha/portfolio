// One table drives the tabs, the number keys, the status line and the
// command the terminal runs for a deep link. Add a pane here and everything else follows.
export const PANES = [
  { id: 'about', key: '1', path: '/tui', cmd: null },
  { id: 'resume', key: '2', path: '/tui/resume', cmd: 'cat ~/resume.md' },
  { id: 'projects', key: '3', path: '/tui/projects', cmd: 'ls ~/projects' },
  { id: 'deployments', key: '4', path: '/tui/deployments', cmd: 'cat ~/deployments/live.txt' },
] as const;

export type PaneId = (typeof PANES)[number]['id'];

/** `/tui` is about; anything else must match a registered pane. */
export function paneFromRoute(pane: string | null): PaneId | null {
  if (pane === null) return 'about';
  return PANES.find((p) => p.id === pane)?.id ?? null;
}
