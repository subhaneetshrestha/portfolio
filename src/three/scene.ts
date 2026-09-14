import * as THREE from 'three';
import { buildCRT } from './crt';
import type { Palette } from './palette';

/**
 * The desk scene the landing page shows before a visitor dives in: a dark
 * room, a desk carrying the CRT, a tower and a keyboard. Everything here is
 * primitives — see tasks/plan.md, "The CRT is built procedurally".
 */

const LOOK_AT = new THREE.Vector3(0, 0.9, -0.3);

function buildRoom(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'room';

  // A dark floor with a soft radial falloff toward the desk, done as a vertex-color
  // gradient rather than a texture — no image asset for a plane nobody looks straight at.
  const floorGeometry = new THREE.CircleGeometry(6, 48);
  const center = new THREE.Color(palette.bg).multiplyScalar(1.6);
  const edge = new THREE.Color(palette.bg).multiplyScalar(0.4);
  const pos = floorGeometry.attributes.position!;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const d = Math.min(1, Math.hypot(pos.getX(i), pos.getY(i)) / 6);
    const c = center.clone().lerp(edge, d);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  floorGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const floor = new THREE.Mesh(floorGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  floor.name = 'floor';
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  return group;
}

function buildDesk(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'desk';
  const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.fg).multiplyScalar(0.15), roughness: 0.7 });

  const slab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 1.3), material);
  slab.position.y = 0.62;
  slab.castShadow = true;
  slab.receiveShadow = true;
  group.add(slab);

  const legXs = [-1.5, 1.5];
  for (const x of legXs) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.08), material);
    leg.position.set(x, 0.31, 0.55);
    group.add(leg);
    const legBack = leg.clone();
    legBack.position.z = -0.55;
    group.add(legBack);
  }

  return group;
}

function buildTower(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'tower';
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.85, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.6, metalness: 0.15 }),
  );
  body.name = 'towerBody';
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // One small status LED — the tower's one point of color, per tasks/plan.md.
  const led = new THREE.Mesh(
    new THREE.CircleGeometry(0.015, 12),
    new THREE.MeshBasicMaterial({ color: palette.accent }),
  );
  led.name = 'led';
  led.position.set(0, 0.32, 0.351);
  group.add(led);

  return group;
}

function buildKeyboard(palette: Palette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'keyboard';
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.03, 0.3),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.fg).multiplyScalar(0.1), roughness: 0.8 }),
  );
  slab.castShadow = true;
  slab.receiveShadow = true;
  group.add(slab);
  return group;
}

export type Scene = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  crt: ReturnType<typeof buildCRT>;
  homeCameraPosition: THREE.Vector3;
};

export function buildScene(palette: Palette): Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.bg);
  scene.fog = new THREE.Fog(new THREE.Color(palette.bg).getHex(), 5, 13);

  scene.add(buildRoom(palette));

  const desk = buildDesk(palette);
  scene.add(desk);

  const crt = buildCRT(palette);
  crt.group.position.set(0, 1.05, -0.35);
  scene.add(crt.group);

  const tower = buildTower(palette);
  tower.position.set(1.35, 0.435 + 0.66, -0.35);
  scene.add(tower);

  const keyboard = buildKeyboard(palette);
  keyboard.position.set(0, 0.665, 0.35);
  scene.add(keyboard);

  // Lighting: the CRT's own glow (in buildCRT) is the warm key light. A cool rim
  // light tinted toward the secondary token separates the desk from the dark room,
  // and one shadow-casting spot gives the desk objects contact shadows.
  const rim = new THREE.DirectionalLight(new THREE.Color(palette.secondary), 0.35);
  rim.position.set(-3, 3, 1.5);
  scene.add(rim);

  const key = new THREE.SpotLight(0xffffff, 0.45, 8, Math.PI / 5, 0.4);
  key.position.set(2, 4, 2.5);
  key.target = desk;
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  scene.add(new THREE.AmbientLight(0xffffff, 0.06));

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 30);
  const homeCameraPosition = new THREE.Vector3(0.1, 1.55, 2.7);
  camera.position.copy(homeCameraPosition);
  camera.lookAt(LOOK_AT);

  return { scene, camera, crt, homeCameraPosition };
}

/** A 3x/4x phone display triples fragment cost for no visible gain; cap it. */
export const cappedDPR = (raw: number): number => Math.min(raw, 2);

/**
 * Idle drift: a small, slow Lissajous wander around home so the scene never
 * looks frozen. Pure and deterministic in t (seconds) — no Date.now() inside.
 */
export function idleDrift(t: number, amplitude = 0.12, periodSeconds = 18): THREE.Vector2 {
  const w = (2 * Math.PI) / periodSeconds;
  return new THREE.Vector2(Math.sin(t * w) * amplitude, Math.sin(t * w * 0.6) * amplitude * 0.5);
}

/**
 * Exponential damping toward a target — frame-rate independent (uses dt, not a
 * fixed step) so parallax feels the same at 30fps and 120fps.
 */
export function dampParallax(
  current: THREE.Vector2,
  targetPointer: THREE.Vector2,
  dt: number,
  halfLifeSeconds = 0.25,
  pointerInfluence = 0.2,
): THREE.Vector2 {
  const k = 1 - Math.pow(0.5, dt / halfLifeSeconds);
  const target = targetPointer.clone().multiplyScalar(pointerInfluence);
  return current.clone().lerp(target, k);
}

/** Applies a camera offset from its resting position and re-aims it at the desk. */
export function applyCameraOffset(camera: THREE.PerspectiveCamera, home: THREE.Vector3, offset: THREE.Vector2): void {
  camera.position.set(home.x + offset.x, home.y + offset.y, home.z);
  camera.lookAt(LOOK_AT);
}
