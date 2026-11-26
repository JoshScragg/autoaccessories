// Draws the social share card and the iPhone home-screen icon from site.json.
// Re-run after changing the business name:  npm run images
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const site = JSON.parse(await readFile(new URL('../src/_data/site.json', import.meta.url), 'utf8'));
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const BOLT = '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" fill="#FFC93C"/></svg>';
// Same self-hosted Inter as the site, embedded so the render needs no network.
const interFile = new URL('../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', import.meta.url);
const inter = (await readFile(interFile)).toString('base64');
const FONT = `<style>@font-face { font-family: Inter; font-weight: 100 900; font-display: block;
  src: url(data:font/woff2;base64,${inter}) format("woff2"); }</style>`;

const card = `<!DOCTYPE html><html><head>${FONT}<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: #121212; color: #F2F2F0; font-family: Inter, sans-serif; position: relative; overflow: hidden; }
  .stripe { display: flex; height: 12px; } .stripe i:first-child { flex: 3; background: #D32F2F; } .stripe i:last-child { flex: 1; background: #FFC93C; }
  .wrap { padding: 64px 80px; display: flex; flex-direction: column; gap: 32px; }
  .logo { font-size: 34px; font-weight: 800; color: #fff; } .logo span { font-weight: 500; color: #A8A8AC; }
  .pill { align-self: flex-start; padding: 10px 20px; border: 2px solid #4A3D14; border-radius: 999px; background: #2B2410; color: #FFC93C; font-size: 24px; font-weight: 600; }
  h1 { max-width: 860px; font-size: 76px; font-weight: 800; line-height: 1.05; letter-spacing: -2px; color: #fff; }
  .tile { position: absolute; right: 80px; bottom: 72px; width: 120px; height: 120px; border-radius: 28px; background: #D32F2F; display: grid; place-items: center; }
  .tile svg { width: 72px; height: 72px; }
</style></head><body>
  <div class="stripe"><i></i><i></i></div>
  <div class="wrap">
    <div class="logo">${esc(site.name)} <span>${esc(site.tagline)}</span></div>
    <div class="pill">Gauges · Sensors · Sound systems</div>
    <h1>Auto electrical for people who love their cars.</h1>
  </div>
  <div class="tile">${BOLT}</div>
</body></html>`;

const icon = `<!DOCTYPE html><html><head><style>
  body { margin: 0; width: 180px; height: 180px; background: #D32F2F; display: grid; place-items: center; }
  svg { width: 116px; height: 116px; }
</style></head><body>${BOLT}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();

await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(card, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'src/img/social-card.png' });

await page.setViewportSize({ width: 180, height: 180 });
await page.setContent(icon);
await page.screenshot({ path: 'src/apple-touch-icon.png' });

await browser.close();
console.log('Wrote src/img/social-card.png and src/apple-touch-icon.png');
