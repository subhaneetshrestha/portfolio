// @ts-nocheck
// Dev-only visual QA. `playwright` is deliberately NOT a tracked dependency —
// package.json and package-lock.json never see it — so it can never end up
// on Cloudflare's build machine. Install it locally, once, to use this:
//   npm install --no-save playwright && npx playwright install chromium
import { execSync, spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4319;
const URL = `http://localhost:${PORT}/`;
const SIZES = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

console.log('building...');
execSync('npm run build', { stdio: 'inherit' });

mkdirSync('shots', { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
server.stdout.on('data', (d) => process.stdout.write(`[preview] ${d}`));
server.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`));

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(URL);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('preview server never came up');
}

async function main() {
  await waitForServer();

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  for (const { name, width, height } of SIZES) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('console', (msg) => console.log(`  [console:${name}] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', (err) => console.error(`  [pageerror:${name}]`, err));
    await page.goto(URL, { waitUntil: 'networkidle' });
    // Let the WebGL scene actually render a frame before capturing.
    await page.waitForSelector('canvas', { timeout: 5000 }).catch(() => console.warn(`  [warn:${name}] no <canvas> found`));
    await page.waitForTimeout(600);
    await page.screenshot({ path: `shots/${name}.png` });
    console.log(`  wrote shots/${name}.png`);
    await page.close();
  }

  await browser.close();
  server.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  server.kill();
  process.exit(1);
});
