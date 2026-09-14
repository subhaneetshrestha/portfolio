import { act, render, screen } from '@testing-library/react';
import * as THREE from 'three';
import { PROMPT } from '../content/resume';
import Landing from './Landing';

// createRenderer (src/three/renderer.ts) is already tested on its own terms —
// it owns the one real GPU boundary (WebGLRenderer, PMREMGenerator, the post
// FX chain), none of which jsdom can run for real. Mocking that module here,
// rather than 'three' itself, keeps these tests about Landing's own job:
// wiring the mount/resize/pointer/teardown lifecycle around it.
const dispose = vi.fn();
const setSize = vi.fn();
const setPixelRatio = vi.fn();
const composerRender = vi.fn();
vi.mock('../three/renderer', () => ({
  createRenderer: vi.fn().mockImplementation(() => ({
    renderer: { setPixelRatio },
    composer: { render: composerRender },
    setSize,
    dispose,
  })),
}));

// buildScene() now loads real GLB files (src/three/models.ts) — network fetch
// and binary parse, exercised for real by `npm run shoot`, not jsdom. Mocking
// it here (keeping every other export of the module real) tests Landing's own
// mount/resize/pointer/teardown orchestration around whatever scene comes back,
// same reasoning as the createRenderer mock above.
vi.mock('../three/scene', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../three/scene')>();
  return {
    ...actual,
    buildScene: vi.fn(async () => ({
      scene: new THREE.Scene(),
      camera: new THREE.OrthographicCamera(),
      monitor: { group: new THREE.Group(), screen: new THREE.Mesh(), screenMaterial: new THREE.MeshBasicMaterial() },
      homeCameraPosition: new THREE.Vector3(0.1, 1.5, 2.7),
    })),
  };
});

/** Flushes the microtask buildScene() resolves on, so the effect's .then() runs. */
const flush = () => act(async () => {});

describe('Landing', () => {
  beforeEach(() => vi.clearAllMocks()); // each test mounts its own renderer; the mocks are file-shared

  it('shows the shell prompt, not a hardcoded copy of it', () => {
    render(<Landing />);
    expect(screen.getByText(PROMPT, { exact: false })).toBeTruthy();
  });

  it('offers a keyboard-reachable skip link straight to the shell', () => {
    render(<Landing />);
    const skip = screen.getByRole('link', { name: /skip/i });
    expect(skip.getAttribute('href')).toBe('/tui');
  });

  it('mounts the render pipeline on its canvas and disposes it on unmount', async () => {
    const { createRenderer } = await import('../three/renderer');
    const { unmount, container } = render(<Landing />);
    await flush();
    expect(container.querySelector('canvas')).toBeTruthy();
    expect(createRenderer).toHaveBeenCalledOnce();
    expect(dispose).not.toHaveBeenCalled();
    unmount();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('tears down cleanly even if unmounted before the scene finishes loading', async () => {
    const { unmount } = render(<Landing />);
    unmount(); // no flush — buildScene's promise hasn't resolved yet
    await flush();
    expect(dispose).not.toHaveBeenCalled(); // createRenderer was never even reached
  });

  it('caps the device pixel ratio at 2 even behind a high-DPR display', async () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 4, configurable: true });
    render(<Landing />);
    await flush();
    expect(setPixelRatio).toHaveBeenCalledWith(2);
  });

  it('renders nothing under prefers-reduced-motion beyond the static frame — no ongoing animation loop', async () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('reduce'),
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    render(<Landing />);
    await flush();
    expect(composerRender).toHaveBeenCalledOnce(); // one static frame
    expect(raf).not.toHaveBeenCalled(); // but no rAF loop kept running
    vi.unstubAllGlobals();
  });
});
