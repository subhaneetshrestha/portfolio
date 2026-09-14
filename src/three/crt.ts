import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Palette } from './palette';

/**
 * A retro CRT built from primitives — bevelled shell on a stand, a screen
 * plane with a slight barrel curve so the glass doesn't read as flat. No
 * external model: matches space-z's "no external art assets" and keeps the
 * whole scene themeable from the same tokens as the DOM. See tasks/plan.md
 * ("The CRT is built procedurally, not downloaded").
 */

const SHELL_DARK = new THREE.Color(0x1c1c1c);

/** Barrel-curves a plane by displacing each vertex along z by its distance from center squared. */
function curveScreen(geo: THREE.PlaneGeometry, amount = 0.05): THREE.PlaneGeometry {
  const pos = geo.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, (x * x + y * y) * amount);
  }
  geo.computeVertexNormals();
  return geo;
}

export type CRT = {
  group: THREE.Group;
  /** The raycast target for Task 10's click-to-dive. Must stay a real child of `group`. */
  screen: THREE.Mesh;
  /** Task 9 swaps this material's map for a CanvasTexture; kept here so that task can find it. */
  screenMaterial: THREE.MeshBasicMaterial;
};

export function buildCRT(palette: Palette): CRT {
  const group = new THREE.Group();
  group.name = 'crt';

  // Physical, not standard: clearcoat is what makes the studio IBL from
  // RoomEnvironment actually visible as a highlight on the plastic shell —
  // a flat MeshStandardMaterial barely shows a procedural environment map.
  const shellMaterial = new THREE.MeshPhysicalMaterial({
    color: SHELL_DARK,
    roughness: 0.55,
    metalness: 0.05,
    clearcoat: 0.6,
    clearcoatRoughness: 0.3,
  });

  const shell = new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.15, 1.05, 3, 0.06), shellMaterial);
  shell.name = 'shell';
  shell.castShadow = true;
  shell.receiveShadow = true;
  group.add(shell);

  const bezel = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.98, 0.06, 3, 0.03), shellMaterial);
  bezel.position.z = 0.52;
  group.add(bezel);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.28, 20), shellMaterial);
  neck.position.y = -0.68;
  neck.castShadow = true;
  group.add(neck);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.06, 32), shellMaterial);
  base.position.y = -0.85;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const screenGeometry = curveScreen(new THREE.PlaneGeometry(1.08, 0.82, 32, 32));
  // Task 9 replaces this flat tint with a CanvasTexture boot log; MeshBasicMaterial
  // (unlit) is the right base for that — the glow should come from the content, not
  // from scene lighting hitting the glass.
  const screenMaterial = new THREE.MeshBasicMaterial({ color: palette.primary });
  const screen = new THREE.Mesh(screenGeometry, screenMaterial);
  screen.name = 'screen';
  screen.position.z = 0.56;
  group.add(screen);

  // Phosphor glow: a short-range point light seated just behind the glass, tinted
  // from the same token the screen itself uses — this is the scene's one warm key light.
  const glow = new THREE.PointLight(new THREE.Color(palette.primary), 0.8, 2.4, 2);
  glow.position.set(0, 0, 0.9);
  group.add(glow);

  return { group, screen, screenMaterial };
}
