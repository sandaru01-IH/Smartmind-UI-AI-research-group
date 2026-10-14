import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const ROUTES = [
  '/',
  '/about',
  '/research',
  '/chatbots',
  '/team',
  '/publications',
  '/awards',
  '/partners',
  '/news',
  '/news/participatory-chatbot-flood-landslide-resilience',
  '/collaborate',
  '/contact',
];
const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
] as const;
const THEMES = ['dark', 'light'] as const;

async function open(page: Page, route: string, theme: (typeof THEMES)[number]) {
  await page.addInitScript((t) => localStorage.setItem('sm-theme', t), theme);
  await page.goto(route, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

test.describe('every public route renders cleanly', () => {
  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      test(`${theme} @ ${vp.name}px: no console errors, no horizontal scroll`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const errors: string[] = [];
        page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
        page.on('pageerror', (e) => errors.push(String(e)));
        for (const route of ROUTES) {
          errors.length = 0;
          await open(page, route, theme);
          await expect(page.locator('main')).toBeVisible();
          await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(overflow, `${route} overflows horizontally`).toBeLessThanOrEqual(0);
          expect(errors, `${route} logged errors`).toEqual([]);
        }
      });
    }
  }

  test('unknown routes show the branded 404 with a 404 status', async ({ page }) => {
    const res = await page.goto('/this-road-is-closed');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'This road is closed' })).toBeVisible();
    expect((await page.goto('/news/not-a-real-post'))?.status()).toBe(404);
  });
});

test.describe('accessibility (axe, WCAG 2.2 AA)', () => {
  const KEY = ['/', '/news', '/news/participatory-chatbot-flood-landslide-resilience', '/research', '/chatbots', '/publications', '/team', '/awards', '/partners', '/contact', '/admin/login'];
  for (const theme of THEMES) {
    for (const route of KEY) {
      test(`${theme}: ${route}`, async ({ page }) => {
        await open(page, route, theme);
        await page.waitForTimeout(800);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
      });
    }
  }
});

test.describe('features', () => {
  test('theme toggle switches and persists', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('follows the system theme when nothing is saved', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('command palette: Ctrl+K, search, keyboard select, navigate', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.keyboard.press('Control+k');
    const box = page.getByRole('combobox', { name: /Search pages/ });
    await expect(box).toBeFocused();
    await box.fill('publications');
    await expect(page.getByRole('option').first()).toContainText(/publications/i);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/publications$/);
  });

  test('command palette finds team members and news', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox').fill('Chethika');
    await expect(page.getByRole('option', { name: /Chethika Abenayake/ })).toBeVisible();
    await page.getByRole('combobox').fill('NBRO');
    await expect(page.getByRole('option', { name: /NBRO/ }).first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('mobile menu opens full screen, traps escape and navigates', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Menu' }).click();
    const menu = page.getByRole('dialog', { name: 'Menu' });
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await page.getByRole('button', { name: 'Menu' }).click();
    await menu.getByRole('link', { name: 'Research' }).click();
    await expect(page).toHaveURL(/\/research$/);
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
  });

  test('skip link moves focus to the main landmark', async ({ page }) => {
    await page.goto('/about');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });

  test('ticker shows live updates and can be paused', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const ticker = page.getByRole('region', { name: 'Latest updates' });
    await expect(ticker).toBeVisible();
    await expect(ticker.getByText('Live')).toBeVisible();
    await ticker.getByRole('button', { name: 'Pause updates' }).click();
    await expect(ticker.locator('.ticker-track')).toHaveAttribute('data-paused', 'true');
    await expect(ticker.getByRole('button', { name: 'Play updates' })).toBeVisible();
  });

  test('hero: canvas runs, and is replaced by the static network under reduced motion', async ({ browser }) => {
    const live = await (await browser.newContext()).newPage();
    await live.goto('/', { waitUntil: 'networkidle' });
    await expect(live.locator('#hero-sim-host canvas')).toHaveCSS('opacity', '1', { timeout: 8000 });
    const painted = await live.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>('#hero-sim-host canvas');
      if (!c) return 0;
      const ctx = c.getContext('2d');
      return ctx ? ctx.getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0) ? 1 : 0 : 0;
    });
    expect(painted).toBe(1);

    const calm = await (await browser.newContext({ reducedMotion: 'reduce' })).newPage();
    await calm.goto('/', { waitUntil: 'networkidle' });
    await expect(calm.locator('#hero-sim-host canvas')).toHaveCount(0);
    await expect(calm.getByRole('img', { name: /road network drawn as nodes/ })).toBeVisible();
  });

  test('hero: moving the pointer floods roads', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('#hero-sim-host canvas')).toHaveCSS('opacity', '1', { timeout: 8000 });
    const before = await page.locator('#hero-sim-host canvas').screenshot();
    for (let i = 0; i < 25; i++) await page.mouse.move(300 + i * 25, 420 + Math.sin(i / 3) * 40);
    await page.waitForTimeout(250);
    const after = await page.locator('#hero-sim-host canvas').screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);
  });

  test('numbers strip shows sourced figures with a source note', async ({ page }) => {
    await page.goto('/');
    const strip = page.locator('#numbers');
    for (const [value, label] of [['12', 'Listed papers'], ['8', 'Core team members'], ['4', 'Research themes'], ['7', 'Awards, 2018 and 2019'], ['14', 'Listed partners']]) {
      const stat = strip.getByRole('button', { name: new RegExp(label) });
      await stat.scrollIntoViewIfNeeded();
      await expect(stat.getByLabel(value, { exact: true })).toBeVisible();
    }
    await strip.getByRole('button', { name: /Listed papers/ }).hover();
    await expect(strip.getByRole('note').first()).toContainText('this.md');
  });

  test('numbers strip never shows the unconfirmed 4ONSE station count', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).not.toContainText('27 stations');
  });

  test('unconfirmed items stay off the home page and are flagged elsewhere', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main')).not.toContainText('Street Cloud');
    await expect(page.locator('main')).not.toContainText('ICSD-2025');
    await expect(page.locator('main')).not.toContainText('To be confirmed');
    await page.goto('/awards');
    await expect(page.getByText('To be confirmed').first()).toBeVisible();
    await page.goto('/research');
    await expect(page.getByText('To be confirmed')).toBeVisible();
    await page.goto('/chatbots');
    await expect(page.getByText('To be confirmed')).toHaveCount(2);
  });

  test('chatbots timeline progresses with native scrolling', async ({ page }) => {
    await page.goto('/chatbots');
    await expect(page.getByRole('list').filter({ has: page.getByRole('heading', { name: /First chatbot launched/ }) })).toBeVisible();
    await page.locator('#journey').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 2600));
    await page.waitForTimeout(400);
    await expect(page.locator('[aria-current="step"]')).toBeVisible();
    const sticky = await page.evaluate(() => Array.from(document.querySelectorAll('#journey *')).some((el) => getComputedStyle(el).position === 'sticky'));
    expect(sticky).toBe(true);
    // Native scroll only: no scroll-jacking handlers that block wheel events.
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  });

  test('architecture diagram is drawn from named components only', async ({ page }) => {
    await page.goto('/chatbots');
    const svg = page.getByRole('img', { name: /Architecture of the participatory/ });
    await svg.scrollIntoViewIfNeeded();
    for (const label of ['WhatsApp', 'Language agent', 'Live-weather API agent', 'Scheduler agent', 'Residents', 'Planners']) {
      await expect(svg.getByText(label, { exact: true })).toBeAttached();
    }
  });

  test('publications: search and filter by year and venue', async ({ page }) => {
    await page.goto('/publications', { waitUntil: 'networkidle' });
    const status = page.getByRole('status').filter({ hasText: 'publications' });
    await expect(status).toContainText('14 of 14');
    await page.getByLabel('Year').selectOption('2021');
    await expect(status).toContainText('4 of 14');
    await page.getByLabel('Venue').selectOption('Sustainability 13(2), 467');
    await expect(status).toContainText('1 of 14');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox', { name: 'Search' }).fill('flood');
    await expect(status).not.toContainText('14 of 14');
    await expect(page.getByRole('link', { name: /Network Centrality Assessment/ })).toHaveAttribute('href', /slstl\.lk/);
  });

  test('contact shows a coming-soon state until an email is configured', async ({ page }) => {
    await page.goto('/contact');
    if (process.env.NEXT_PUBLIC_CONTACT_EMAIL) {
      await expect(page.getByRole('link', { name: 'Email the team' })).toBeVisible();
    } else {
      await expect(page.getByTestId('contact-soon')).toContainText('Contact details coming soon');
      await expect(page.getByRole('link', { name: 'Email the team' })).toHaveCount(0);
    }
    await expect(page.locator('main').getByText('+94 11 2640051')).toBeVisible();
    await expect(page.getByRole('link', { name: 'info@uom.lk' })).toBeVisible();
  });

  test('footer carries the university details and the same-name note', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    await expect(footer).toContainText('Bandaranayake Mawatha');
    await expect(footer).toContainText('Moratuwa 10400');
    await expect(footer).toContainText('+94 11 2650301');
    await expect(footer).toContainText('smartmind.net');
    await expect(footer.getByRole('link', { name: /Facebook/ })).toHaveAttribute('href', /facebook\.com\/share/);
  });

  test('news filters, featured post and tags', async ({ page }) => {
    await page.goto('/news');
    await expect(page.getByText('Featured', { exact: true })).toBeVisible();
    await page.getByRole('navigation', { name: 'Filter news by category' }).getByRole('link', { name: 'Partnership' }).click();
    await expect(page).toHaveURL(/category=Partnership/);
    await expect(page.getByRole('heading', { name: /NBRO and the University of Manchester/ })).toBeVisible();
  });

  test('metadata: unique titles, canonicals, sitemap, robots and JSON-LD', async ({ page, request }) => {
    const titles = new Set<string>();
    for (const route of ['/', '/about', '/research', '/news']) {
      await page.goto(route);
      const title = await page.title();
      expect(title).toContain('Urban Simulation Lab');
      titles.add(title);
      await expect(page.locator('link[rel=canonical]')).toHaveCount(1);
      await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    }
    expect(titles.size).toBe(4);
    await page.goto('/');
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(ld!)['@type']).toBe('ResearchOrganization');
    await page.goto('/news/participatory-chatbot-flood-landslide-resilience');
    const ld2 = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(ld2!)['@type']).toBe('NewsArticle');
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain('/news/participatory-chatbot-flood-landslide-resilience');
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /admin');
    expect((await request.get('/opengraph-image')).headers()['content-type']).toContain('image/png');
  });

  test('security headers are present', async ({ request }) => {
    const res = await request.get('/');
    const h = res.headers();
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(h['x-frame-options']).toBe('DENY');
  });
});
