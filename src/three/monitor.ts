import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Palette } from './palette';

/**
 * A modern thin-bezel flat panel on a slim stand — replaces the original CRT
 * (crt.ts) after Checkpoint B: the reference supplied for the redesign shows
 * a flat monitor, not a retro tube. Still pure primitives, no external
 * model — see tasks/plan.md, "The CRT is built procedurally, not downloaded",
 * which applies just as much to a flat panel.
 */

const SHELL_DARK = new THREE.Color(0x1c1c1c);

export type Monitor = {
  group: THREE.Group;
  /** The raycast target for Task 10's click-to-dive. Must stay a real child of `group`. */
  screen: THREE.Mesh;
  /** Task 9 swaps this material's map for a CanvasTexture; kept here so that task can find it. */
  screenMaterial: THREE.MeshBasicMaterial;
};

export function buildMonitor(palette: Palette): Monitor {
  const group = new THREE.Group();
  group.name = 'monitor';
  // A modern panel leans back a few degrees rather than sitting bolt upright.
  group.rotation.x = THREE.MathUtils.degToRad(-4);

  const shellMaterial = new THREE.MeshPhysicalMaterial({
    color: SHELL_DARK,
    roughness: 0.45,
    metalness: 0.1,
    clearcoat: 0.7,
    clearcoatRoughness: 0.25,
  });

  // Thin flat body — depth is a fraction of width/height, unlike a CRT's deep box.
  const panel = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.92, 0.05, 3, 0.035), shellMaterial);
  panel.name = 'panel';
  panel.castShadow = true;
  panel.receiveShadow = true;
  group.add(panel);

  const bezelInset = new THREE.Mesh(new RoundedBoxGeometry(1.38, 0.8, 0.01, 2, 0.015), shellMaterial);
  bezelInset.position.z = 0.026;
  group.add(bezelInset);

  // Flat, not barrel-curved — an LCD panel's glass is planar, unlike a CRT's.
  const screenGeometry = new THREE.PlaneGeometry(1.3, 0.72);
  // Task 9 replaces this flat tint with a CanvasTexture boot log; MeshBasicMaterial
  // (unlit) is the right base for that — the glow should come from the content, not
  // from scene lighting hitting the glass.
  const screenMaterial = new THREE.MeshBasicMaterial({ color: palette.primary });
  const screen = new THREE.Mesh(screenGeometry, screenMaterial);
  screen.name = 'screen';
  screen.position.z = 0.032;
  group.add(screen);

  // A slim neck rather than a CRT's cylindrical stack.
  const neck = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.32, 0.06, 1, 0.02), shellMaterial);
  neck.name = 'neck';
  neck.position.set(0, -0.62, -0.02);
  neck.castShadow = true;
  group.add(neck);

  // A wide, low, weighted foot instead of a round CRT base.
  const foot = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.03, 0.26, 1, 0.014), shellMaterial);
  foot.name = 'foot';
  foot.position.set(0, -0.775, 0.02);
  foot.castShadow = true;
  foot.receiveShadow = true;
  group.add(foot);

  // Phosphor-style glow: a short-range point light seated just in front of the
  // glass, tinted from the same token the screen itself uses — the scene's
  // one warm key light, same role the CRT's glow played before.
  const glow = new THREE.PointLight(new THREE.Color(palette.primary), 0.8, 2.4, 2);
  glow.position.set(0, 0, 0.6);
  group.add(glow);

  return { group, screen, screenMaterial };
}
