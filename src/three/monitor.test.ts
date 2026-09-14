import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { buildMonitor } from './monitor';

const palette = {
  bg: '#0B0D10', fg: '#C9D1D9', primary: '#00ADD8', accent: '#FFB454', secondary: '#1793D1',
  wall: '#F4F0E3', wood: '#E8A85E', woodDark: '#B97A3E', rug: '#E15B08', chair: '#211D42',
  bezel: '#1E1A38', tower: '#E3D8C9', glow: '#E405A3', glow2: '#4A33E5', led: '#46D160',
  cactus: '#6FCB5C', pot: '#EBEAE0', bookA: '#F5A428', bookB: '#F35A22', bookC: '#2E2B42',
  mousepad: '#6B6E7A', keycap: '#F5F3EA', keycapAccent: '#4FC3E0', window: '#FBF6E8',
};

describe('buildMonitor', () => {
  it('returns a group containing a panel and a named, raycastable screen mesh', () => {
    const { group, screen } = buildMonitor(palette);
    expect(group).toBeInstanceOf(THREE.Group);
    expect(screen).toBeInstanceOf(THREE.Mesh);
    expect(screen.name).toBe('screen');
    let found = false;
    group.traverse((o) => { if (o === screen) found = true; });
    expect(found).toBe(true);
  });

  it('is a thin flat panel, not a boxy CRT — depth is small next to width and height', () => {
    const { group } = buildMonitor(palette);
    const panel = group.getObjectByName('panel') as THREE.Mesh;
    expect(panel).toBeTruthy();
    const geo = panel.geometry as RoundedBoxGeometry;
    const params = geo.parameters as { width: number; height: number; depth: number };
    expect(params.depth).toBeLessThan(params.width * 0.1);
    expect(params.depth).toBeLessThan(params.height * 0.15);
  });

  it('the screen sits flat, not barrel-curved — modern panels are not CRT glass', () => {
    const { screen } = buildMonitor(palette);
    const pos = screen.geometry.attributes.position!;
    for (let i = 0; i < pos.count; i++) expect(pos.getZ(i)).toBeCloseTo(0, 5);
  });

  it('gives the panel rounded edges and a clearcoat so studio IBL shows up', () => {
    const { group } = buildMonitor(palette);
    const panel = group.getObjectByName('panel') as THREE.Mesh;
    expect(panel.geometry).toBeInstanceOf(RoundedBoxGeometry);
    const mat = panel.material as THREE.MeshPhysicalMaterial;
    expect(mat).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect(mat.clearcoat).toBeGreaterThan(0);
  });

  it('stands on a slim neck and a weighted foot, not a CRT-style cylinder stack', () => {
    const { group } = buildMonitor(palette);
    expect(group.getObjectByName('neck')).toBeTruthy();
    expect(group.getObjectByName('foot')).toBeTruthy();
  });

  it('tints the screen from the given palette, not a hardcoded color', () => {
    const a = buildMonitor(palette);
    const b = buildMonitor({ ...palette, glow: '#FF0000' });
    const colorOf = (m: THREE.Material) => (m as THREE.MeshBasicMaterial).color.getHexString();
    expect(colorOf(a.screenMaterial)).not.toBe(colorOf(b.screenMaterial));
    expect(colorOf(b.screenMaterial)).toBe('ff0000');
  });

  it('carries a webcam clip on top, per the reference', () => {
    const { group } = buildMonitor(palette);
    expect(group.getObjectByName('webcam')).toBeTruthy();
  });

  it('never loads an external model — pure primitives only', () => {
    expect(readFileSync('src/three/monitor.ts', 'utf8')).not.toMatch(/GLTFLoader|\.glb|\.gltf/);
  });
});
