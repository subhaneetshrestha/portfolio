import { globSync } from 'node:fs';

// Task 8's rule, made permanent: the CRT and desk are Three.js primitives,
// never a downloaded model. See tasks/plan.md, "The CRT is built procedurally".
const ASSET_EXTENSIONS = ['glb', 'gltf', 'obj', 'fbx', 'dae', 'stl', 'usdz'];

describe('no external 3D model assets', () => {
  it('has no 3D model files under src/ or public/', () => {
    const found = globSync(ASSET_EXTENSIONS.map((ext) => `{src,public}/**/*.${ext}`));
    expect(found).toEqual([]);
  });
});
