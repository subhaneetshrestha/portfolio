import { render, screen } from '@testing-library/react';
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
    expect(container.querySelector('canvas')).toBeTruthy();
    expect(createRenderer).toHaveBeenCalledOnce();
    expect(dispose).not.toHaveBeenCalled();
    unmount();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('caps the device pixel ratio at 2 even behind a high-DPR display', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 4, configurable: true });
    render(<Landing />);
    expect(setPixelRatio).toHaveBeenCalledWith(2);
  });

  it('renders nothing under prefers-reduced-motion beyond the static frame — no ongoing animation loop', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('reduce'),
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    render(<Landing />);
    expect(composerRender).toHaveBeenCalledOnce(); // one static frame
    expect(raf).not.toHaveBeenCalled(); // but no rAF loop kept running
    vi.unstubAllGlobals();
  });
});
