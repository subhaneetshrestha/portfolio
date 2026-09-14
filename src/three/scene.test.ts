import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { applyAspect, applyCameraOffset, buildScene, cappedDPR, dampParallax, idleDrift, LOOK_AT } from './scene';

const palette = {
  bg: '#0B0D10', fg: '#C9D1D9', primary: '#00ADD8', accent: '#FFB454', secondary: '#1793D1',
  wall: '#F4F0E3', wood: '#E8A85E', woodDark: '#B97A3E', rug: '#E15B08', chair: '#211D42',
  bezel: '#1E1A38', tower: '#E3D8C9', glow: '#E405A3', glow2: '#4A33E5', led: '#46D160',
  cactus: '#6FCB5C', pot: '#EBEAE0', bookA: '#F5A428', bookB: '#F35A22', bookC: '#2E2B42',
  mousepad: '#6B6E7A', keycap: '#F5F3EA', keycapAccent: '#4FC3E0', window: '#FBF6E8',
};

describe('buildScene', () => {
  it('assembles a desk, a monitor, a tower, a keyboard, a mousepad and a mouse into one scene', () => {
    const { scene } = buildScene(palette);
    for (const name of ['desk', 'monitor', 'tower', 'keyboard', 'mousepad', 'mouse', 'room']) {
      expect(scene.getObjectByName(name), name).toBeTruthy();
    }
  });

  it('gives the tower the reference\'s magenta side glow, sampled directly', () => {
    const { scene } = buildScene(palette);
    const glow = scene.getObjectByName('towerGlow') as THREE.Mesh;
    expect(glow).toBeTruthy();
    const mat = glow.material as THREE.MeshBasicMaterial;
    expect(mat.color.getHexString()).toBe('e405a3'); // palette.glow
  });

  it('gives the tower a recessed glass window, not a flat painted line', () => {
    const { scene } = buildScene(palette);
    const tower = scene.getObjectByName('tower') as THREE.Group;
    const window_ = tower.getObjectByName('towerWindow') as THREE.Mesh;
    const frame = tower.getObjectByName('towerFrame') as THREE.Group;
    expect(window_).toBeTruthy();
    expect(frame).toBeTruthy();
    // "Recessed" — the glass sits behind the visible front frame, not flush with it,
    // and nothing solid occupies the gap between them (the actual hole/cavity).
    const frameZ = (frame.children[0] as THREE.Mesh).position.z;
    expect(window_.position.z).toBeLessThan(frameZ);
  });

  it('gives the tower vent slats and a physical power button, not just a flat shell', () => {
    const { scene } = buildScene(palette);
    const tower = scene.getObjectByName('tower') as THREE.Group;
    const vents = tower.getObjectByName('towerVents') as THREE.Group;
    expect(vents).toBeTruthy();
    expect(vents.children.length).toBeGreaterThanOrEqual(4);
    expect(tower.getObjectByName('towerButton')).toBeTruthy();
  });

  it('builds the keyboard as one instanced draw call, not one mesh per key', () => {
    const { scene } = buildScene(palette);
    const keyboard = scene.getObjectByName('keyboard') as THREE.Group;
    let instanced: THREE.InstancedMesh | null = null;
    let plainKeyMeshes = 0;
    keyboard.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) instanced = o;
      else if (o instanceof THREE.Mesh && o.name === 'key') plainKeyMeshes++;
    });
    expect(instanced).toBeTruthy();
    expect(instanced!.count).toBeGreaterThan(20); // a real key grid, not a token handful
    expect(plainKeyMeshes).toBe(0);
  });

  it('paints the background from the palette, not a hardcoded color', () => {
    const { scene } = buildScene(palette);
    expect((scene.background as THREE.Color).getHexString()).toBe('f4f0e3'); // palette.wall
  });

  it('gives the tower a green power LED, sampled from the reference', () => {
    const { scene } = buildScene(palette);
    const led = scene.getObjectByName('led') as THREE.Mesh;
    expect(led).toBeTruthy();
    const mat = led.material as THREE.MeshBasicMaterial;
    expect(mat.color.getHexString()).toBe('46d160');
  });

  it('starts an orthographic camera at a true isometric angle, looking toward the desk', () => {
    const { camera, homeCameraPosition } = buildScene(palette);
    expect(camera).toBeInstanceOf(THREE.OrthographicCamera);
    expect(camera.position.equals(homeCameraPosition)).toBe(true);
    // True isometric: equal x/y/z offsets from the look-at point (elevation
    // atan(1/sqrt(2)) falls straight out of a (1,1,1) direction).
    const offset = homeCameraPosition.clone().sub(LOOK_AT);
    expect(offset.x).toBeCloseTo(offset.y, 5);
    expect(offset.y).toBeCloseTo(offset.z, 5);
    expect(offset.x).toBeGreaterThan(0);
  });

  it('sizes the orthographic frustum from the given aspect ratio, keeping the vertical extent fixed', () => {
    const { camera } = buildScene(palette);
    applyAspect(camera, 2);
    const wide = camera.right - camera.left;
    const height = camera.top - camera.bottom;
    applyAspect(camera, 1);
    const square = camera.right - camera.left;
    expect(camera.top - camera.bottom).toBeCloseTo(height, 5); // vertical extent unchanged
    expect(wide).toBeGreaterThan(square); // wider aspect -> wider frustum
  });

  it('rounds every visible box edge — no hard 90° corner survives', () => {
    const { scene } = buildScene(palette);
    let sawBox = false;
    let sawRoundedBox = false;
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      if (o.geometry instanceof RoundedBoxGeometry) sawRoundedBox = true;
      else if (o.geometry instanceof THREE.BoxGeometry) sawBox = true;
    });
    expect(sawRoundedBox).toBe(true);
    expect(sawBox).toBe(false);
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

describe('buildScene — desk companions (Task 8c)', () => {
  it('adds a laptop, a tablet, a mug, a pen cup and a succulent to the desk', () => {
    const { scene } = buildScene(palette);
    for (const name of ['laptop', 'tablet', 'mug', 'penCup', 'succulent']) {
      expect(scene.getObjectByName(name), name).toBeTruthy();
    }
  });

  it('opens the laptop screen at an angle, not lying flat like the base', () => {
    const { scene } = buildScene(palette);
    const laptop = scene.getObjectByName('laptop') as THREE.Group;
    const screen = laptop.getObjectByName('laptopScreen') as THREE.Mesh;
    expect(screen).toBeTruthy();
    expect(Math.abs(screen.rotation.x)).toBeGreaterThan(0.3); // meaningfully tilted open
  });

  it('keeps every desk companion above the desk surface, not sunk into it', () => {
    const { scene } = buildScene(palette);
    const deskTop = 0.66; // desk slab top surface, from buildDesk()
    for (const name of ['laptop', 'tablet', 'mug', 'penCup', 'succulent']) {
      const obj = scene.getObjectByName(name)!;
      expect(obj.position.y, name).toBeGreaterThanOrEqual(deskTop - 0.01);
    }
  });
});

describe('buildScene — room and furniture (Task 8d)', () => {
  it('builds a back wall and a side wall so the scene reads as a room, not a void', () => {
    const { scene } = buildScene(palette);
    const room = scene.getObjectByName('room') as THREE.Group;
    expect(room.getObjectByName('backWall')).toBeTruthy();
    expect(room.getObjectByName('sideWall')).toBeTruthy();
  });

  it('gives the window a daylight tone, not the old night-cyan glow', () => {
    const { scene } = buildScene(palette);
    const window_ = scene.getObjectByName('window') as THREE.Mesh;
    expect(window_).toBeTruthy();
    const mat = window_.material as THREE.MeshBasicMaterial;
    expect(mat.color.getHexString()).toBe('fbf6e8'); // palette.window
  });

  it('lays a rug on the floor and seats a chair at the desk', () => {
    const { scene } = buildScene(palette);
    expect(scene.getObjectByName('rug')).toBeTruthy();
    expect(scene.getObjectByName('chair')).toBeTruthy();
  });
});

describe('buildScene — dressing (Task 8e)', () => {
  it('mounts a shelf with books and a cactus, and two posters, on the back wall', () => {
    const { scene } = buildScene(palette);
    for (const name of ['shelf', 'posterA', 'posterB']) {
      expect(scene.getObjectByName(name), name).toBeTruthy();
    }
    const shelf = scene.getObjectByName('shelf') as THREE.Group;
    expect(shelf.getObjectByName('books')).toBeTruthy();
    expect(shelf.getObjectByName('cactus')).toBeTruthy();
  });

  it('carries the brand mark on one poster, tinted from the tower\'s own glow', () => {
    const { scene } = buildScene(palette);
    const mark = scene.getObjectByName('posterMark') as THREE.Mesh;
    expect(mark).toBeTruthy();
    const mat = mark.material as THREE.MeshBasicMaterial;
    expect(mat.color.getHexString()).toBe('e405a3'); // palette.glow
  });

  it('adds a monstera, a bin and a pair of slippers to finish the room', () => {
    const { scene } = buildScene(palette);
    for (const name of ['monstera', 'bin', 'slippers']) {
      expect(scene.getObjectByName(name), name).toBeTruthy();
    }
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
    const camera = new THREE.OrthographicCamera();
    const home = new THREE.Vector3(0, 1.4, 2.6);
    const before = camera.quaternion.clone();
    applyCameraOffset(camera, home, new THREE.Vector2(0.2, -0.1));
    expect(camera.position.x).toBeCloseTo(0.2);
    expect(camera.position.y).toBeCloseTo(1.3);
    expect(camera.position.z).toBeCloseTo(2.6);
    expect(camera.quaternion.equals(before)).toBe(false); // lookAt actually ran
  });
});
