import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { buildCRT } from './crt';

const palette = { bg: '#0B0D10', fg: '#C9D1D9', primary: '#00ADD8', accent: '#FFB454', secondary: '#1793D1' };

describe('buildCRT', () => {
  it('returns a group containing a shell and a named, raycastable screen mesh', () => {
    const { group, screen } = buildCRT(palette);
    expect(group).toBeInstanceOf(THREE.Group);
    expect(screen).toBeInstanceOf(THREE.Mesh);
    expect(screen.name).toBe('screen');
    // Task 10 raycasts crtGroup.children with recursive:true — the screen must live in the tree.
    let found = false;
    group.traverse((o) => { if (o === screen) found = true; });
    expect(found).toBe(true);
  });

  it('curves the screen plane rather than leaving it perfectly flat glass', () => {
    const { screen } = buildCRT(palette);
    const pos = screen.geometry.attributes.position!;
    let anyNonZeroZ = false;
    for (let i = 0; i < pos.count; i++) if (pos.getZ(i) !== 0) anyNonZeroZ = true;
    expect(anyNonZeroZ).toBe(true);
  });

  it('tints the screen and its glow from the given palette, not a hardcoded color', () => {
    const a = buildCRT(palette);
    const b = buildCRT({ ...palette, primary: '#FF0000' });
    const colorOf = (m: THREE.Material) => (m as THREE.MeshBasicMaterial).color.getHexString();
    expect(colorOf(a.screenMaterial)).not.toBe(colorOf(b.screenMaterial));
    expect(colorOf(b.screenMaterial)).toBe('ff0000');
  });

  it('never loads an external model — pure primitives only', () => {
    // Static guard, not a runtime one: trips if anyone adds a GLTFLoader call here.
    expect(readFileSync('src/three/crt.ts', 'utf8')).not.toMatch(/GLTFLoader|\.glb|\.gltf/);
  });
});
