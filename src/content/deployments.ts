import type { Deployment } from './types';

// Curated. Liveness is never written here: scripts/fetch-github.ts checks
// every `url` below and the pane reads the status from github.generated.json.
export const deployments: Deployment[] = [
  { id: 'open-canvas-ui', kind: 'live', label: 'open-canvas', url: 'https://open-canvas-ui.vercel.app', repo: 'open-canvas-ui' },
  { id: 'inventory', kind: 'live', label: 'inventory', url: 'https://subhaneetshrestha.github.io/inventory/', repo: 'inventory' },
  {
    id: 'airbnb-next',
    kind: 'live',
    label: 'airbnb clone',
    url: 'https://airbnb-clone-flame-seven.vercel.app',
    repo: 'airbnb-next',
    note: '2023 tutorial clone',
  },
  { id: 'space-z', kind: 'release', label: 'space-z', repo: 'space-z', note: 'LÖVE game; Android APK, Windows, .love' },
  { id: 'atomic-launcher', kind: 'release', label: 'atomic-launcher', repo: 'atomic-launcher', note: 'Android launcher; edge pre-release' },
  { id: 'pokerivia', kind: 'retired', label: 'pokerivia', url: 'https://pokerivia.vercel.app', repo: 'pokerivia', note: 'no longer deployed' },
];
