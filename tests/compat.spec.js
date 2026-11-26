import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/', name: 'home', current: 'Home' },
  { path: '/services.html', name: 'services', current: 'Services' },
  { path: '/thanks.html', name: 'thanks', current: null },
  { path: '/404.html', name: '404', current: null },
];

// Collect console errors and uncaught exceptions for every test.
test.beforeEach(async ({ page }, testInfo) => {
  testInfo.errors_ = [];
  page.on('pageerror', (e) => testInfo.errors_.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') testInfo.errors_.push(m.text()); });
});

test.afterEach(async ({}, testInfo) => {
  expect(testInfo.errors_, 'console / page errors').toEqual([]);
});

for (const p of PAGES) {
  test(`${p.name}: renders, no sideways scroll, fonts and nav`, async ({ page }, testInfo) => {
    const requests = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.goto(p.path);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');

    // Everything (including Inter) is served by the site itself.
    const external = requests.filter((u) => !u.startsWith(testInfo.project.use.baseURL ?? 'http://localhost'));
    expect(external, 'no third-party requests').toEqual([]);
    const fonts = requests.filter((u) => u.endsWith('.woff2')).map((u) => u.split('/').pop());
    expect([...new Set(fonts)], 'only the main Latin font file is needed').toEqual(['inter-latin-wght-normal.woff2']);

    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      inter: document.fonts.check('800 20px Inter'),
      bodyBg: getComputedStyle(document.body).backgroundColor,
      h1: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),
    }));
    expect(layout.scrollWidth, 'no horizontal overflow').toBeLessThanOrEqual(layout.clientWidth);
    expect(layout.inter, 'Inter font loaded').toBe(true);
    expect(layout.bodyBg).toBe('rgb(18, 18, 18)');
    expect(layout.h1).toBeGreaterThanOrEqual(40);
    expect(layout.h1).toBeLessThanOrEqual(76);

    const current = page.locator('nav [aria-current="page"]');
    if (p.current) await expect(current).toHaveText(p.current);
    else await expect(current).toHaveCount(0);

    // Every nav item is visible (wraps under the logo on narrow screens rather than hiding).
    for (const label of ['Home', 'Services', 'Get a quote']) {
      await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: label })).toBeVisible();
    }

    await page.screenshot({
      path: `screenshots/${testInfo.project.name}/${p.name}.png`,
      fullPage: true,
    });
  });
}

test('skip link is first and visible on focus', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Safari only tabs to links with "Press Tab to highlight each item" turned on');
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  const box = await skip.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(0);
});

test.describe('home slideshow', () => {
  test('next/prev wrap, dots jump, counter and inert update', async ({ page }) => {
    await page.goto('/');
    const counter = page.locator('.work-counter');
    const next = page.getByRole('button', { name: 'Next job' });
    const prev = page.getByRole('button', { name: 'Previous job' });

    await expect(counter).toHaveText('1 / 6');
    await expect(page.locator('.work-dots button')).toHaveCount(6);

    await next.click();
    await expect(counter).toHaveText('2 / 6');
    await prev.click();
    await prev.click();
    await expect(counter).toHaveText('6 / 6'); // wrapped first → last
    await next.click();
    await expect(counter).toHaveText('1 / 6'); // wrapped last → first

    await page.getByRole('button', { name: 'Go to job 4' }).click();
    await expect(counter).toHaveText('4 / 6');
    await expect(page.getByRole('button', { name: 'Go to job 4' })).toHaveAttribute('aria-current', 'true');

    const inert = await page.locator('.job').evaluateAll((cards) => cards.map((c) => c.inert));
    expect(inert[3], 'current card is interactive').toBe(false);
    expect(inert[0], 'cards scrolled past are inert').toBe(true);
  });

  test('arrow keys work while focus is in the carousel', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Next job' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.work-counter')).toHaveText('2 / 6');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.work-counter')).toHaveText('1 / 6');
  });

  test('touch swipe moves one card', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.use.hasTouch, 'touch devices only');
    await page.goto('/');
    const swipe = (fromX, toX) => page.locator('.work-viewport').evaluate((vp, [a, b]) => {
      const fire = (type, x, active) => {
        let e;
        try {
          const t = new Touch({ identifier: 1, target: vp, clientX: x, clientY: 300 });
          e = new TouchEvent(type, { touches: active ? [t] : [], changedTouches: [t], bubbles: true });
        } catch {
          // WebKit doesn't let scripts construct Touch objects: send an event of
          // the same type carrying the same touch coordinates instead.
          const t = { identifier: 1, target: vp, clientX: x, clientY: 300 };
          e = new Event(type, { bubbles: true });
          Object.defineProperty(e, 'touches', { value: active ? [t] : [] });
          Object.defineProperty(e, 'changedTouches', { value: [t] });
        }
        vp.dispatchEvent(e);
      };
      fire('touchstart', a, true);
      fire('touchend', b, false);
    }, [fromX, toX]);

    await swipe(250, 100);   // left swipe → next
    await expect(page.locator('.work-counter')).toHaveText('2 / 6');
    await swipe(100, 130);   // 30px drag is ignored
    await expect(page.locator('.work-counter')).toHaveText('2 / 6');
    await swipe(100, 250);   // right swipe → previous
    await expect(page.locator('.work-counter')).toHaveText('1 / 6');
  });

  test('works with JavaScript off (native scroll fallback)', async ({ browser }, testInfo) => {
    const context = await browser.newContext({ ...testInfo.project.use, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('.work-controls')).toBeHidden();
    await expect(page.locator('.work-dots')).toBeHidden();
    const vp = page.locator('.work-viewport');
    await expect(vp).toHaveCSS('overflow-x', 'auto');
    await vp.evaluate((el) => { el.scrollLeft = 1000; });
    expect(await vp.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sw).toBeLessThanOrEqual(0);
    await context.close();
  });

  test('reduced motion turns off the slide animation', async ({ browser }, testInfo) => {
    const context = await browser.newContext({ ...testInfo.project.use, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    const t = await page.locator('.work-track').evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(t).toBe('0s');
    await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
    await context.close();
  });
});

test.describe('services quote form', () => {
  test('empty submit is blocked and invalid fields turn red', async ({ page }) => {
    let posted = false;
    await page.route('https://formspree.io/**', (route) => { posted = true; route.abort(); });
    await page.goto('/services.html');
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page).toHaveURL(/services\.html/);
    expect(posted).toBe(false);
    await expect(page.getByLabel('Name')).toHaveCSS('border-top-color', 'rgb(255, 107, 107)');
  });

  test('valid submit goes to Formspree then thanks.html', async ({ page }) => {
    let body = '';
    await page.route('https://formspree.io/**', (route) => {
      body = route.request().postData() || '';
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    await page.goto('/services.html');
    await page.getByLabel('Name').fill('Test Person');
    await page.getByLabel('Phone or email').fill('test@example.com');
    await page.getByLabel('Your car').fill('2004 Subaru WRX');
    await page.getByLabel('What would you like done?').fill('Boost gauge install');
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page).toHaveURL(/thanks\.html$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Thanks, we've got your request.");
    expect(body).toContain('Boost gauge install');
  });

  test('nav "Get a quote" jumps to the form', async ({ page }) => {
    await page.goto('/services.html');
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Get a quote' }).click();
    await expect(page.getByRole('heading', { name: 'Get a quote' })).toBeInViewport();
  });

  test('home "Get a quote" opens services at the form', async ({ page }) => {
    await page.goto('/');
    await page.locator('.hero').getByRole('link', { name: 'Get a quote' }).click();
    await expect(page).toHaveURL(/services\.html#quote$/);
    await expect(page.getByRole('heading', { name: 'Get a quote' })).toBeInViewport();
  });
});
