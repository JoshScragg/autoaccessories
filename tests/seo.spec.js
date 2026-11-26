import { test, expect } from '@playwright/test';

// SEO output doesn't depend on the browser, so check it once.
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'Chrome desktop', 'SEO checks run once');
});

const INDEXABLE = ['/', '/services.html'];
const NOINDEX = ['/thanks.html', '/404.html'];

const head = (page) => page.evaluate(() => {
  const meta = (sel) => document.querySelector(sel)?.getAttribute('content') ?? null;
  const ld = document.querySelector('script[type="application/ld+json"]');
  return {
    title: document.title,
    description: meta('meta[name="description"]'),
    robots: meta('meta[name="robots"]'),
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
    ogTitle: meta('meta[property="og:title"]'),
    ogUrl: meta('meta[property="og:url"]'),
    ogImage: meta('meta[property="og:image"]'),
    twitterCard: meta('meta[name="twitter:card"]'),
    lang: document.documentElement.lang,
    h1Count: document.querySelectorAll('h1').length,
    jsonLd: ld ? JSON.parse(ld.textContent) : null,
  };
});

for (const path of INDEXABLE) {
  test(`${path}: title, description, canonical, social tags, structured data`, async ({ page }) => {
    await page.goto(path);
    const h = await head(page);
    expect(h.title).toContain('AutoAccessories');
    expect(h.title.length).toBeLessThanOrEqual(65);
    expect(h.description.length).toBeGreaterThanOrEqual(50);
    expect(h.description.length).toBeLessThanOrEqual(170);
    expect(h.robots).toBeNull();
    expect(h.canonical).toMatch(/^https:\/\//);
    expect(h.ogUrl).toBe(h.canonical);
    expect(h.ogTitle).toBe(h.title);
    expect(h.ogImage).toMatch(/\/img\/social-card\.png$/);
    expect(h.twitterCard).toBe('summary_large_image');
    expect(h.lang).toBe('en-NZ');
    expect(h.h1Count).toBe(1);
    expect(h.jsonLd['@type']).toBe('AutoRepair');
    expect(h.jsonLd['@id']).toMatch(/#business$/);
  });
}

for (const path of NOINDEX) {
  test(`${path}: kept out of search results`, async ({ page }) => {
    await page.goto(path);
    expect((await head(page)).robots).toBe('noindex');
  });
}

test('services structured data lists services with real starting prices', async ({ page }) => {
  await page.goto('/services.html');
  const { jsonLd } = await head(page);
  const groups = jsonLd.hasOfferCatalog.itemListElement;
  expect(groups.map((g) => g.name)).toEqual(['Performance', 'Sound systems', 'Auto electrical']);
  const prices = groups.flatMap((g) => g.itemListElement)
    .filter((o) => o.priceSpecification)
    .map((o) => o.priceSpecification.minPrice);
  expect(prices).toEqual([700, 250, 200]);
});

test('sitemap lists only indexable pages; robots.txt points to it', async ({ request }) => {
  const site = await (await request.get('/')).text();
  const home = /<link rel="canonical" href="([^"]+)"/.exec(site)[1];
  const sitemap = await (await request.get('/sitemap.xml')).text();
  const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  expect(locs).toEqual([home, `${home}services.html`]);

  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/^Sitemap: https:\/\/.+\/sitemap\.xml$/m);
});

test('share image, icons and 404 page are published', async ({ request, page }) => {
  for (const asset of ['/img/social-card.png', '/apple-touch-icon.png', '/favicon.svg', '/404.html']) {
    expect((await request.get(asset)).status(), asset).toBe(200);
  }
  await page.goto('/404.html');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(18, 18, 18)');
});

test('missing deep URL gets a styled 404 (as on GitHub Pages)', async ({ page }) => {
  const prefix = await page.goto('/').then(() =>
    page.locator('link[rel="canonical"]').getAttribute('href')).then((u) => new URL(u).pathname);
  const res = await page.goto(`${prefix}some/missing/page`);
  expect(res.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found.');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(18, 18, 18)');
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Auto electrical for people who love their cars.');
});
