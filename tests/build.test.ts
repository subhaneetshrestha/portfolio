import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

// The single most important structural guarantee in tasks/plan.md:
// /tui must never pay for the 3D landing. This reads Vite's manifest and
// asserts the landing is a dynamic import living in its own chunk.
type Chunk = {
  file: string;
  isEntry?: boolean;
  isDynamicEntry?: boolean;
  dynamicImports?: string[];
};

let manifest: Record<string, Chunk>;

beforeAll(() => {
  execSync('npx vite build --logLevel error', { stdio: 'inherit' });
  manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
}, 120_000);

describe('build output', () => {
  it('emits a static index.html', () => {
    expect(existsSync('dist/index.html')).toBe(true);
  });

  it('configures the Workers SPA fallback so deep links survive a cold load', () => {
    // Cloudflare Workers static assets: unmatched paths serve index.html.
    const cfg = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
    expect(cfg.assets.directory).toBe('./dist');
    expect(cfg.assets.not_found_handling).toBe('single-page-application');
  });

  it('loads the landing as a dynamic import from the entry', () => {
    const entry = Object.values(manifest).find((c) => c.isEntry);
    expect(entry).toBeDefined();
    expect(entry!.dynamicImports ?? []).toContain('src/landing/Landing.tsx');
  });

  it('gives the landing its own chunk, separate from the entry', () => {
    const entry = Object.values(manifest).find((c) => c.isEntry)!;
    const landing = manifest['src/landing/Landing.tsx'];
    expect(landing?.isDynamicEntry).toBe(true);
    expect(landing!.file).not.toBe(entry.file);
  });

  it('keeps WebGL code out of the entry chunk', () => {
    // Trivially true today; becomes the real guard once three.js lands in Task 8.
    const entry = Object.values(manifest).find((c) => c.isEntry)!;
    expect(readFileSync(`dist/${entry.file}`, 'utf8')).not.toContain('WebGLRenderer');
  });
});
