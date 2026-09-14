import { dirname } from 'node:path';
import { existsSync, globSync } from 'node:fs';

// Task 8's original rule — no downloaded 3D assets, ever — was reversed at
// the user's explicit request: "load a real 3D model instead of hand-coded
// geometry" (tasks/plan.md, "Loading a real 3D model"). The rule this test
// enforces now is the one that actually matters going forward: every model
// that DOES ship has a paper trail. No asset directory without a license
// record naming its source and terms — the discipline that made the current
// set (Kenney's CC0 Furniture Kit) safe to ship in the first place.
const ASSET_EXTENSIONS = ['glb', 'gltf', 'obj', 'fbx', 'dae', 'stl', 'usdz'];

describe('every 3D model asset has a license record', () => {
  const found = globSync(ASSET_EXTENSIONS.map((ext) => `{src,public}/**/*.${ext}`));

  it('finds the models this build actually ships, as a sanity check on the glob itself', () => {
    expect(found.length).toBeGreaterThan(0);
  });

  for (const file of found) {
    it(`${file} sits in a directory with a CREDITS.txt`, () => {
      expect(existsSync(`${dirname(file)}/CREDITS.txt`)).toBe(true);
    });
  }
});
