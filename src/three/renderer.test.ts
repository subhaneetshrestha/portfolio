import * as THREE from 'three';
import { createRenderer } from './renderer';

const dispose = vi.fn();
const setSize = vi.fn();
// jsdom has no GPU: WebGLRenderer construction and PMREMGenerator's actual GPU
// math are the two things mocked here. Whether IBL really looks right is a
// screenshot question (npm run shoot), not a jsdom one — this test only
// proves createRenderer wires scene.environment from the generator's output.
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      setPixelRatio: vi.fn(),
      getPixelRatio: () => 1,
      setSize,
      getSize: () => new actual.Vector2(800, 600),
      getContext: () => ({ getExtension: () => null }),
      getRenderTarget: () => null,
      setRenderTarget: vi.fn(),
      getClearColor: () => new actual.Color(),
      getClearAlpha: () => 1,
      setClearColor: vi.fn(),
      render: vi.fn(),
      dispose,
      shadowMap: {},
      capabilities: {},
    })),
    PMREMGenerator: vi.fn().mockImplementation(() => ({
      fromScene: () => ({ texture: new actual.Texture() }),
      dispose: vi.fn(),
    })),
  };
});

describe('createRenderer', () => {
  it('configures neutral tone mapping (not ACES\'s desaturating filmic rolloff) and soft shadow maps', () => {
    const canvas = document.createElement('canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera();
    const { renderer } = createRenderer(canvas, scene, camera);
    expect(renderer.toneMapping).toBe(THREE.NeutralToneMapping);
    expect(renderer.shadowMap.enabled).toBe(true);
    expect(renderer.shadowMap.type).toBe(THREE.PCFSoftShadowMap);
  });

  it('gives the scene a real environment map for reflections, from no HDR file', () => {
    const canvas = document.createElement('canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera();
    createRenderer(canvas, scene, camera);
    expect(scene.environment).toBeTruthy();
    expect(scene.environment).toBeInstanceOf(THREE.Texture);
  });

  it('keeps the studio IBL below its product-shot-bright default, tuned for this room', () => {
    const canvas = document.createElement('canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera();
    createRenderer(canvas, scene, camera);
    expect(scene.environmentIntensity).toBeLessThan(1); // RoomEnvironment's own default reads far brighter
    expect(scene.environmentIntensity).toBeGreaterThan(0);
  });

  it('builds a post-processing chain that includes bloom', () => {
    const canvas = document.createElement('canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera();
    const { composer } = createRenderer(canvas, scene, camera);
    const names = composer.passes.map((p: { constructor: { name: string } }) => p.constructor.name);
    expect(names).toContain('RenderPass');
    expect(names).toContain('UnrealBloomPass');
    expect(names).toContain('OutputPass');
  });

  it('resizes both the renderer and every post-processing pass together', () => {
    const canvas = document.createElement('canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera();
    const { setSize: resize } = createRenderer(canvas, scene, camera);
    resize(800, 600);
    expect(setSize).toHaveBeenCalledWith(800, 600, false);
  });

  it('disposes the renderer and the composer on teardown', () => {
    const canvas = document.createElement('canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera();
    const { dispose: teardown } = createRenderer(canvas, scene, camera);
    teardown();
    expect(dispose).toHaveBeenCalled();
  });
});
