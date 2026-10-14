/**
 * Captures screenshots of every public route at 390, 768 and 1440 px in dark and light themes.
 *   npm run screenshots -- [baseUrl] [outDir] [routes...]
 * Also records console errors and horizontal overflow per page and prints a summary.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const base = process.argv[2] ?? 'http://localhost:3000';
const out = process.argv[3] ?? 'docs/screenshots';
const routeArgs = process.argv.slice(4);
const ROUTES = routeArgs.length
  ? routeArgs
  : ['/', '/about', '/research', '/chatbots', '/team', '/publications', '/awards', '/partners', '/news', '/news/participatory-chatbot-flood-landslide-resilience', '/collaborate', '/contact', '/does-not-exist'];
const WIDTHS = [390, 768, 1440] as const;
const THEMES = ['dark', 'light'] as const;

async function main() {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const problems: string[] = [];
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({
        viewport: { width, height: width === 1440 ? 900 : 844 },
        colorScheme: theme,
        deviceScaleFactor: 1,
      });
      await ctx.addInitScript((t) => localStorage.setItem('sm-theme', t), theme);
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(String(e)));
      for (const route of ROUTES) {
        errors.length = 0;
        await page.goto(base + route, { waitUntil: 'networkidle' });
        await page.evaluate(async () => {
          const h = document.documentElement.scrollHeight;
          for (let y = 0; y < h; y += 500) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(600);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        const slug = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '_');
        const file = path.join(out, `${slug}-${width}-${theme}.png`);
        await page.screenshot({ path: file, fullPage: !process.env.SHOT_VIEWPORT });
        if (overflow > 0) {
          const culprits = await page.evaluate(() => {
            const vw = document.documentElement.clientWidth;
            return Array.from(document.querySelectorAll('body *'))
              .filter((el) => el.getBoundingClientRect().right > vw + 1)
              .slice(0, 5)
              .map((el) => el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 60));
          });
          problems.push(`${route} @${width} ${theme}: horizontal overflow ${overflow}px — ${culprits.join(' | ')}`);
        }
        for (const e of errors) problems.push(`${route} @${width} ${theme}: console error: ${e}`);
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'No console errors or horizontal overflow.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
