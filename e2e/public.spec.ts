import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const ROUTES = [
  '/',
  '/about',
  '/research',
  '/team',
  '/publications',
  '/awards',
  '/gallery',
  '/news',
  '/news/participatory-chatbot-flood-landslide-resilience',
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
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
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
  const KEY = [
    '/',
    '/news',
    '/news/participatory-chatbot-flood-landslide-resilience',
    '/research',
    '/publications',
    '/team',
    '/awards',
    '/gallery',
    '/contact',
    '/admin/login',
  ];
  for (const theme of THEMES) {
    for (const route of KEY) {
      test(`${theme}: ${route}`, async ({ page }) => {
        await open(page, route, theme);
        await page.waitForTimeout(800);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(
          results.violations.map(
            (v) =>
              `${v.id}: ${v.nodes
                .map((n) => n.target.join(' '))
                .slice(0, 3)
                .join(' | ')}`,
          ),
        ).toEqual([]);
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
    // It must fill the screen, not sit clipped inside the 56px header.
    expect((await menu.boundingBox())?.height).toBeGreaterThan(700);
    await expect(menu.getByRole('link', { name: 'Gallery & Partners' })).toBeInViewport();
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

  test('hero: layered depth, no legend, and the first paint is already the final picture', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForSelector('#hero-title');
    const map = page.getByRole('img', { name: /Layered road networks/ });
    // Four sheets of roads, each fainter than the one in front of it.
    const sheets = map.locator('> g');
    await expect(sheets).toHaveCount(4);
    const opacities = await sheets.evaluateAll((els) =>
      els.map((g) => Number(g.querySelector('path')!.getAttribute('opacity'))),
    );
    expect([...opacities].sort((a, b) => a - b)).toEqual(opacities);
    expect(opacities[0]).toBeLessThan(opacities[3]);
    // The wording the client asked to remove is gone.
    await expect(page.getByText(/agents rerouting/i)).toHaveCount(0);
    await expect(page.getByText(/Point at a road/i)).toHaveCount(0);
    // The canvas adds no second set of roads. It is transparent apart from agents and selections.
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#hero-sim-host canvas')).toHaveCSS('opacity', '1', {
      timeout: 8000,
    });
    const coverage = await page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>('#hero-sim-host canvas')!;
      const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let painted = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) painted++;
      return painted / (c.width * c.height);
    });
    expect(coverage).toBeGreaterThan(0);
    expect(coverage).toBeLessThan(0.02);
  });

  test('hero: the canvas runs only a few agents, and is replaced by the static network under reduced motion', async ({
    browser,
  }) => {
    const live = await (await browser.newContext()).newPage();
    await live.goto('/', { waitUntil: 'networkidle' });
    await expect(live.locator('#hero-sim-host canvas')).toHaveCSS('opacity', '1', {
      timeout: 8000,
    });
    const painted = await live.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>('#hero-sim-host canvas');
      if (!c) return 0;
      const ctx = c.getContext('2d');
      return ctx
        ? ctx.getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0)
          ? 1
          : 0
        : 0;
    });
    expect(painted).toBe(1);

    const calm = await (await browser.newContext({ reducedMotion: 'reduce' })).newPage();
    await calm.goto('/', { waitUntil: 'networkidle' });
    await expect(calm.locator('#hero-sim-host canvas')).toHaveCount(0);
    await expect(calm.getByRole('img', { name: /Layered road networks/ })).toBeVisible();
  });

  test('hero: moving the pointer floods roads', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('#hero-sim-host canvas')).toHaveCSS('opacity', '1', {
      timeout: 8000,
    });
    const before = await page.locator('#hero-sim-host canvas').screenshot();
    for (let i = 0; i < 25; i++) await page.mouse.move(300 + i * 25, 420 + Math.sin(i / 3) * 40);
    await page.waitForTimeout(250);
    const after = await page.locator('#hero-sim-host canvas').screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);
  });

  test('numbers strip shows plain figures and no hover pop-ups', async ({ page }) => {
    await page.goto('/');
    const strip = page.locator('#numbers');
    for (const [value, label] of [
      ['12', 'Listed papers'],
      ['14', 'People in the network'],
      ['4', 'Research themes'],
      ['7', 'Awards, 2018 and 2019'],
      ['14', 'Listed partners'],
    ]) {
      const stat = strip.getByRole('listitem').filter({ hasText: label });
      await stat.scrollIntoViewIfNeeded();
      await expect(stat.locator('.sr-only')).toHaveText(value);
    }
    await strip.getByRole('listitem').first().hover();
    await expect(strip.getByRole('note')).toHaveCount(0);
    await expect(strip.getByRole('button')).toHaveCount(0);
  });

  test('hero headline rolls in word by word', async ({ page }) => {
    await page.goto('/');
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveText('The city as an adaptive & dynamic system.');
    await expect(h1.locator('.roll-word')).toHaveCount(8);
  });

  test('home: themes are renamed, partners are not repeated, journey replaces the chatbot teaser', async ({
    page,
  }) => {
    await page.goto('/');
    const main = page.locator('main');
    for (const t of [
      'Urban Science',
      'Disaster Management',
      'Transport & Mobility Systems',
      'AI and machine learning',
    ])
      await expect(main.getByRole('heading', { name: t })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'The Journey of Smartmind' })).toBeVisible();
    await expect(main.getByText('Build a chatbot with us')).toHaveCount(0);
    await expect(main.getByRole('heading', { name: /partners/i })).toHaveCount(0);
  });

  test('contact beacon opens an email to the team', async ({ page }) => {
    await page.goto('/');
    const beacon = page.locator('#contact a');
    await expect(beacon).toHaveAttribute('href', /^mailto:info@smartminduiai\.com/);
    await expect(page.locator('#contact')).toContainText('Spark your idea');
    await expect(page.locator('#contact')).toContainText('Project with the support of Smartmind');
  });

  test('old routes redirect to their new homes', async ({ page }) => {
    await page.goto('/chatbots');
    await expect(page).toHaveURL(/\/research#journey$/);
    await page.goto('/partners');
    await expect(page).toHaveURL(/\/gallery#partners$/);
  });

  test('the open invitation page opens with the invitation and the ways to participate', async ({
    page,
  }) => {
    await page.goto('/collaborate');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Collaborate With Us' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ways to participate' })).toBeVisible();
  });

  test('team network: hover traces links, select shows only personal details', async ({ page }) => {
    await page.goto('/team', { waitUntil: 'networkidle' });
    const amila = page.getByRole('button', { name: /^Amila Jayasinghe/ });
    await amila.focus();
    await expect(page.locator('svg .team-edge-active').first()).toBeAttached();
    await amila.press('Enter');
    const panel = page.getByRole('complementary', { name: 'Person details' });
    await expect(panel.getByRole('heading', { name: 'Amila Jayasinghe' })).toBeVisible();
    await expect(panel.getByText('Works with')).toHaveCount(0);
    await panel.getByRole('button', { name: 'Close details' }).click();
    await expect(panel.getByRole('heading', { name: 'Amila Jayasinghe' })).toHaveCount(0);
  });

  test('team network: search finds people by name', async ({ page }) => {
    await page.goto('/team', { waitUntil: 'networkidle' });
    const box = page.getByRole('combobox', { name: 'Search the team by name' });
    await box.fill('chethika');
    await expect(page.getByRole('status').filter({ hasText: 'found' })).toContainText('1 found');
    await box.press('Enter');
    const panel = page.getByRole('complementary', { name: 'Person details' });
    await expect(panel.getByRole('heading', { name: 'Chethika Abenayake' })).toBeVisible();
    await box.fill('zzzz');
    await expect(page.getByRole('status').filter({ hasText: 'No one' })).toBeVisible();
  });

  test('team network: circles can be dragged, and the layout can be reset', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/team', { waitUntil: 'networkidle' });
    const node = page.getByRole('button', { name: /^Malith Deshan/ });
    await page.getByRole('group', { name: /Team network/ }).scrollIntoViewIfNeeded();
    const before = await node.boundingBox();
    const reset = page.getByRole('button', { name: 'Reset layout' });
    await expect(reset).toBeDisabled();
    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
    await page.mouse.down();
    await page.mouse.move(before!.x + 160, before!.y + 120, { steps: 8 });
    await page.mouse.up();
    // A drag moves the circle and does not open the profile.
    await page.waitForTimeout(300);
    const after = await node.boundingBox();
    expect(Math.abs(after!.x - before!.x) + Math.abs(after!.y - before!.y)).toBeGreaterThan(60);
    await expect(page.getByRole('heading', { name: 'Malith Deshan' })).toHaveCount(0);
    await expect(reset).toBeEnabled();
    await reset.click();
    await expect(reset).toBeDisabled();
  });

  test('gallery comes first and partners follow as linked grey tiles', async ({ page }) => {
    await page.goto('/gallery', { waitUntil: 'networkidle' });
    const headings = await page.getByRole('heading', { level: 2 }).allInnerTexts();
    expect(headings.indexOf('Gallery')).toBeLessThan(headings.indexOf('Partners'));
    const nbro = page.getByRole('link', { name: /National Building Research Organization/ });
    await expect(nbro).toHaveAttribute('href', 'https://www.nbro.gov.lk');
    await expect(nbro).toHaveAttribute('target', '_blank');
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
    await expect(page.getByText('To be confirmed')).toHaveCount(3);
  });

  test('journey timeline progresses with native scrolling', async ({ page }) => {
    await page.goto('/research');
    await expect(
      page
        .getByRole('list')
        .filter({ has: page.getByRole('heading', { name: /First chatbot launched/ }) }),
    ).toBeVisible();
    await page.locator('#journey').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 2600));
    await page.waitForTimeout(400);
    await expect(page.locator('[aria-current="step"]')).toBeVisible();
    const sticky = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#journey *')).some(
        (el) => getComputedStyle(el).position === 'sticky',
      ),
    );
    expect(sticky).toBe(true);
    // Native scroll only: no scroll-jacking handlers that block wheel events.
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  });

  test('architecture diagram is drawn from named components only', async ({ page }) => {
    await page.goto('/research');
    const svg = page.getByRole('img', { name: /Architecture of the participatory/ });
    await svg.scrollIntoViewIfNeeded();
    for (const label of [
      'WhatsApp',
      'Language agent',
      'Live-weather API agent',
      'Scheduler agent',
      'Residents',
      'Planners',
    ]) {
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
    await expect(page.getByRole('link', { name: /Network Centrality Assessment/ })).toHaveAttribute(
      'href',
      /slstl\.lk/,
    );
  });

  test('contact page: one big email button, plus the three members', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('link', { name: /Contact us/ }).first()).toBeVisible();
    await expect(page.locator('main a[href^="mailto:info@smartminduiai.com"]')).toHaveCount(2);
    await expect(page.locator('main').getByText('Samith Madusanka')).toBeVisible();
    await expect(page.getByRole('link', { name: '077 277 7236' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'amilabj@uom.lk' })).toBeVisible();
    await expect(page.locator('main')).not.toContainText('+94 11 2640051');
  });

  test('footer carries the university details and no same-name disclaimer', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    await expect(footer).toContainText('Bandaranayake Mawatha');
    await expect(footer).toContainText('Moratuwa 10400');
    await expect(footer).toContainText('+94 11 2650301');
    await expect(footer).not.toContainText('smartmind.net');
    await expect(footer).not.toContainText('Not related to other organisations');
    await expect(footer.getByRole('link', { name: /Facebook/ })).toHaveAttribute(
      'href',
      /facebook\.com\/share/,
    );
  });

  test('news filters, featured post and tags', async ({ page }) => {
    await page.goto('/news');
    await expect(page.getByText('Featured', { exact: true })).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Filter news by category' })
      .getByRole('link', { name: 'Partnership' })
      .click();
    await expect(page).toHaveURL(/category=Partnership/);
    await expect(
      page.getByRole('heading', { name: /NBRO and the University of Manchester/ }),
    ).toBeVisible();
  });

  test('metadata: unique titles, canonicals, sitemap, robots and JSON-LD', async ({
    page,
    request,
  }) => {
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
    expect(await sitemap.text()).toContain(
      '/news/participatory-chatbot-flood-landslide-resilience',
    );
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /admin');
    expect((await request.get('/opengraph-image')).headers()['content-type']).toContain(
      'image/png',
    );
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
