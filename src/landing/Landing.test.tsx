import { render, screen } from '@testing-library/react';
import * as THREE from 'three';
import { PROMPT } from '../content/resume';
import Landing from './Landing';

// WebGL context creation is the one real GPU boundary here — jsdom has no GPU,
// so this is the one thing worth mocking. Everything else (Scene, camera,
// lights, geometry) is plain JS and runs for real, same as src/three's own tests.
const dispose = vi.fn();
const setPixelRatio = vi.fn();
const setSize = vi.fn();
const renderCall = vi.fn();
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      setPixelRatio,
      setSize,
      render: renderCall,
      dispose,
    })),
  };
});

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

  it('mounts a WebGL renderer on its canvas and disposes it on unmount', () => {
    const { unmount, container } = render(<Landing />);
    expect(container.querySelector('canvas')).toBeTruthy();
    expect(THREE.WebGLRenderer).toHaveBeenCalledOnce();
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
    // The global test stub answers every query false by default; import a scoped
    // override just for this test via dynamic re-mock of the media query.
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('reduce'),
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    render(<Landing />);
    expect(renderCall).toHaveBeenCalledOnce(); // one static frame
    expect(raf).not.toHaveBeenCalled(); // but no rAF loop kept running
    vi.unstubAllGlobals();
  });
});
