import * as THREE from 'three';
import { applyCameraOffset, buildScene, cappedDPR, dampParallax, idleDrift } from './scene';

const palette = { bg: '#0B0D10', fg: '#C9D1D9', primary: '#00ADD8', accent: '#FFB454', secondary: '#1793D1' };

describe('buildScene', () => {
  it('assembles a desk, a CRT, a tower and a keyboard into one scene', () => {
    const { scene } = buildScene(palette);
    for (const name of ['desk', 'crt', 'tower', 'keyboard', 'room']) {
      expect(scene.getObjectByName(name), name).toBeTruthy();
    }
  });

  it('paints the background from the palette, not a hardcoded color', () => {
    const { scene } = buildScene(palette);
    expect((scene.background as THREE.Color).getHexString()).toBe('0b0d10');
  });

  it('gives the tower an LED tinted from the accent token', () => {
    const { scene } = buildScene(palette);
    const led = scene.getObjectByName('led') as THREE.Mesh;
    expect(led).toBeTruthy();
    const mat = led.material as THREE.MeshBasicMaterial;
    expect(mat.color.getHexString()).toBe('ffb454');
  });

  it('starts the camera at a sane distance from the desk, looking toward it', () => {
    const { camera, homeCameraPosition } = buildScene(palette);
    expect(camera).toBeInstanceOf(THREE.PerspectiveCamera);
    expect(camera.position.equals(homeCameraPosition)).toBe(true);
    expect(homeCameraPosition.z).toBeGreaterThan(0); // in front of the desk, not inside it
  });

  it('never adds a shared object twice — every mesh has exactly one parent', () => {
    const { scene } = buildScene(palette);
    const seen = new Set<THREE.Object3D>();
    scene.traverse((o) => {
      expect(seen.has(o)).toBe(false);
      seen.add(o);
    });
  });
});

describe('cappedDPR', () => {
  it('passes through anything at or below 2', () => {
    expect(cappedDPR(1)).toBe(1);
    expect(cappedDPR(2)).toBe(2);
  });
  it('caps a high-DPR phone display at 2', () => {
    expect(cappedDPR(3)).toBe(2);
    expect(cappedDPR(4)).toBe(2);
  });
});

describe('idleDrift', () => {
  it('is deterministic: the same time always gives the same offset', () => {
    expect(idleDrift(5)).toEqual(idleDrift(5));
  });
  it('stays within its amplitude — a small, gentle drift, not a wide swing', () => {
    for (let t = 0; t < 40; t += 0.7) {
      const d = idleDrift(t, 0.12);
      expect(Math.abs(d.x)).toBeLessThanOrEqual(0.12 + 1e-9);
      expect(Math.abs(d.y)).toBeLessThanOrEqual(0.12 + 1e-9);
    }
  });
  it('is not constant over a full period — the scene actually moves', () => {
    const a = idleDrift(0);
    const b = idleDrift(4);
    expect(a.equals(b)).toBe(false);
  });
});

describe('dampParallax', () => {
  it('moves partway toward the target on a small step, never jumping instantly', () => {
    const current = new THREE.Vector2(0, 0);
    const target = new THREE.Vector2(1, 0);
    const next = dampParallax(current, target, 1 / 60);
    expect(next.x).toBeGreaterThan(0);
    expect(next.x).toBeLessThan(1);
  });
  it('converges toward the (scaled-down) target over many small steps', () => {
    // dampParallax deliberately damps toward targetPointer * pointerInfluence (0.2 by
    // default) — full-strength parallax from a [-1,1] pointer would swing the camera
    // absurdly far, so the resting point is a fifth of the raw pointer offset.
    let current = new THREE.Vector2(0, 0);
    const target = new THREE.Vector2(0.3, -0.1);
    for (let i = 0; i < 600; i++) current = dampParallax(current, target, 1 / 60);
    expect(current.distanceTo(target.clone().multiplyScalar(0.2))).toBeLessThan(0.001);
  });
  it('does not overshoot the target', () => {
    let current = new THREE.Vector2(0, 0);
    const target = new THREE.Vector2(1, 0);
    for (let i = 0; i < 300; i++) {
      current = dampParallax(current, target, 1 / 60);
      expect(current.x).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});

describe('applyCameraOffset', () => {
  it('offsets the camera from home and re-aims it at the desk', () => {
    const camera = new THREE.PerspectiveCamera();
    const home = new THREE.Vector3(0, 1.4, 2.6);
    const before = camera.quaternion.clone();
    applyCameraOffset(camera, home, new THREE.Vector2(0.2, -0.1));
    expect(camera.position.x).toBeCloseTo(0.2);
    expect(camera.position.y).toBeCloseTo(1.3);
    expect(camera.position.z).toBeCloseTo(2.6);
    expect(camera.quaternion.equals(before)).toBe(false); // lookAt actually ran
  });
});
