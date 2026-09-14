import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/**
 * The one place that turns a bare canvas into a real render pipeline: tone
 * mapping and soft shadows so MeshPhysicalMaterial reads correctly,
 * image-based lighting from a procedural studio room (no HDR file — see
 * tasks/plan.md, "RoomEnvironment is the single biggest lever"), and a
 * post-processing chain for bloom. This is the one impure boundary besides
 * Landing.tsx itself; everything here needs a real GPU, which is why its
 * own test mocks WebGLRenderer and PMREMGenerator rather than trying to
 * prove the pixels are right — that's what `npm run shoot` is for.
 *
 * Tone mapping is NeutralToneMapping, not ACESFilmic: ACES is a cinematic,
 * photographic rolloff that desaturates by design — exactly wrong for a
 * flat, saturated "exact color assets" reference. Neutral preserves hue and
 * saturation much closer to the raw material color while still compressing
 * highlights enough to avoid hard clipping.
 */

export type SceneRenderer = {
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  setSize(width: number, height: number): void;
  dispose(): void;
};

export function createRenderer(
  canvas: HTMLCanvasElement,
  scene: THREE.Scene,
  camera: THREE.Camera,
): SceneRenderer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Image-based lighting from a procedural studio room — real reflections
  // and soft ambient fill on MeshPhysicalMaterial, at zero asset bytes.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  // RoomEnvironment is tuned as a bright product-shot studio (a 900-intensity
  // point light) — right for reflections and highlights, far too much ambient
  // fill for a dark room at night. Keep the reflections, cut the flood.
  scene.environmentIntensity = 0.4;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // A HIGH threshold on purpose: only genuinely emissive things (the screen,
  // the tower's glow) should bloom. The first daylight pass proved a
  // lower/no threshold with brighter walls blooms the walls themselves into
  // a white haze across half the frame — not bloom, a bug.
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.3, 0.94));
  composer.addPass(new OutputPass());

  function setSize(width: number, height: number): void {
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
  }

  function dispose(): void {
    composer.dispose();
    renderer.dispose();
  }

  return { renderer, composer, setSize, dispose };
}
