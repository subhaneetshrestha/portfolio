import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Palette } from './palette';

/**
 * Loads a Kenney Furniture Kit model (CC0 — public/models/kenney/CREDITS.txt)
 * and recolors it from the site's own sampled palette instead of Kenney's
 * originals. This is possible because every material in the kit is a flat,
 * untextured baseColorFactor named from a small shared set (wood, metal,
 * metalDark, carpet, glass, plant, …) — see tasks/plan.md, "Loading a real
 * 3D model instead of hand-coded geometry". Real modeled geometry (bevels,
 * proportions an artist actually drew) plus our exact reference colors,
 * without fighting a baked texture atlas.
 */

export type MaterialOverrides = Partial<Record<string, THREE.ColorRepresentation>>;

const DEFAULT_MATERIAL_MAP = (palette: Palette): Record<string, THREE.ColorRepresentation> => ({
  wood: palette.wood,
  woodDark: palette.woodDark,
  metal: new THREE.Color(palette.tower).multiplyScalar(0.95),
  metalDark: palette.bezel,
  metalMedium: palette.bezel,
  carpet: palette.rug,
  carpetDarker: palette.rug,
  carpetWhite: palette.wall,
  glass: palette.bezel,
  lamp: palette.led,
  plant: palette.cactus,
  _defaultMat: palette.wall,
});

const loader = new GLTFLoader();

/**
 * Loads `url`, replaces every named material with a MeshStandardMaterial in
 * the mapped color (default map + per-load `overrides`, overrides winning),
 * and enables shadows on every mesh. A material whose name isn't in either
 * map is left exactly as Kenney authored it — never guessed at.
 */
export function loadModel(url: string, palette: Palette, overrides: MaterialOverrides = {}): Promise<THREE.Group> {
  const materialMap = { ...DEFAULT_MATERIAL_MAP(palette), ...overrides };
  const replaced = new Map<THREE.Material, THREE.Material>();

  const remap = (mat: THREE.Material): THREE.Material => {
    const cached = replaced.get(mat);
    if (cached) return cached;
    const color = materialMap[mat.name];
    const next = color ? new THREE.MeshStandardMaterial({ color, roughness: 0.6 }) : mat;
    replaced.set(mat, next);
    return next;
  };

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const root = gltf.scene;
        root.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return;
          obj.castShadow = true;
          obj.receiveShadow = true;
          obj.material = Array.isArray(obj.material) ? obj.material.map(remap) : remap(obj.material);
        });
        resolve(root);
      },
      undefined,
      reject,
    );
  });
}
