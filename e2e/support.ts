import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect, type Page } from '@playwright/test';

export const ADMIN_EMAIL = 'e2e-admin@example.test';
export const ADMIN_PASSWORD = 'E2e-Admin-Password-1!';
export const TITLE_PREFIX = 'E2E ';

export function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env is missing. Start Supabase and fill .env.local.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function signIn(page: Page, next = '/admin') {
  await page.goto(`/admin/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/[/?]/g, '\\$&')}$`));
}

/** Reload until `assertion` passes. Public pages should update within seconds of an admin change. */
export async function eventually(
  page: Page,
  url: string,
  assertion: () => Promise<void>,
  timeoutMs = 15_000,
) {
  await expect(async () => {
    await page.goto(url);
    await assertion();
  }).toPass({ timeout: timeoutMs, intervals: [500, 1000, 1500] });
}

// A valid 1x1 PNG. The server checks the real bytes, so a fake image would be refused.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/** Publishing an article needs a thumbnail: upload a tiny one and describe it. */
export async function addThumbnail(page: Page) {
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'thumb.png',
    mimeType: 'image/png',
    buffer: PNG_1X1,
  });
  await page.getByLabel('Alt text (required)').fill('A test thumbnail');
}
