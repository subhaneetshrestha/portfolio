// One table drives the tabs, the number keys, the status line and (Task 7)
// the command dispatcher. Add a pane here and everything else follows.
export const PANES = [
  { id: 'about', key: '1', path: '/tui' },
  { id: 'resume', key: '2', path: '/tui/resume' },
  { id: 'projects', key: '3', path: '/tui/projects' },
  { id: 'deployments', key: '4', path: '/tui/deployments' },
] as const;

export type PaneId = (typeof PANES)[number]['id'];

/** `/tui` is about; anything else must match a registered pane. */
export function paneFromRoute(pane: string | null): PaneId | null {
  if (pane === null) return 'about';
  return PANES.find((p) => p.id === pane)?.id ?? null;
}
