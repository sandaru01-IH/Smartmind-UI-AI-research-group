import { expect, test, type Page } from '@playwright/test';
import { PNG_1X1, addThumbnail, serviceClient } from './support';

const MAIL = 'http://127.0.0.1:54324'; // the local Supabase test inbox (Mailpit)
const PASSWORD = 'E2e-Member-Password-1!';
const stamp = Date.now().toString(36);

export const memberEmail = (name: string) => `e2e-${name}-${stamp}@example.test`;

/** The newest email sent to an address, polled until it arrives. */
export async function latestMail(to: string): Promise<{ html: string; text: string }> {
  let found: { html: string; text: string } | null = null;
  await expect(async () => {
    const list = await (
      await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`)
    ).json();
    const id = list.messages?.[0]?.ID;
    expect(id, `no email for ${to} yet`).toBeTruthy();
    const msg = await (await fetch(`${MAIL}/api/v1/message/${id}`)).json();
    found = { html: String(msg.HTML ?? ''), text: String(msg.Text ?? '') };
  }).toPass({ timeout: 20_000, intervals: [500, 1000] });
  return found!;
}

/** The first link in an email that points at the site's confirm page, moved onto the test server. */
export function confirmLink(mail: { html: string; text: string }, baseURL: string): string {
  const match = /https?:\/\/[^\s"'<>]*\/auth\/confirm\?[^\s"'<>]+/.exec(mail.html + mail.text);
  expect(match, 'no confirm link in the email').not.toBeNull();
  const link = new URL(match![0].replace(/&amp;/g, '&'));
  return `${baseURL}${link.pathname}${link.search}`;
}

export async function registerMember(page: Page, name: string, baseURL: string) {
  const email = memberEmail(name);
  await page.goto('/register', { waitUntil: 'networkidle' });
  await page.getByLabel('Your name').fill(`E2E ${name}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel(/I accept the/).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();
  await page.goto(confirmLink(await latestMail(email), baseURL));
  await expect(page).toHaveURL(/\/login\?verified=1/);
  return email;
}

export async function logInMember(page: Page, email: string, next = '/', expectSuccess = true) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  if (expectSuccess) await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

test.afterAll(async () => {
  const db = serviceClient();
  const { data } = await db.auth.admin.listUsers({ perPage: 200 });
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith('e2e-') && u.email.includes(stamp))
      await db.auth.admin.deleteUser(u.id);
  }
});

test.describe('member accounts', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('register, confirm by email, log in, see the account menu, log out', async ({
    page,
    baseURL,
  }) => {
    const email = await registerMember(page, 'ada', baseURL!);
    await expect(page.getByText('Your email is confirmed. You can log in now.')).toBeVisible();

    await logInMember(page, email);
    await expect(page).toHaveURL(/\/$/);
    const menu = page.getByRole('button', { name: 'Your account: E2E ada' });
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(page.getByRole('link', { name: 'Write', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  });

  test('a wrong password gives one generic message', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(memberEmail('nobody'));
    await page.getByLabel('Password', { exact: true }).fill('not-the-password-1');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.locator('main').getByRole('alert')).toHaveText(
      'That email and password do not match.',
    );
  });

  test('an unconfirmed account is told to confirm its email', async ({ page }) => {
    const email = memberEmail('late');
    await page.goto('/register', { waitUntil: 'networkidle' });
    await page.getByLabel('Your name').fill('E2E late');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel(/I accept the/).check();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Check your email')).toBeVisible();
    await logInMember(page, email, '/', false);
    await expect(page.locator('main').getByRole('alert')).toContainText('Confirm your email first');
  });

  test('a member cannot get into the admin, with or without trying the admin login', async ({
    page,
    baseURL,
  }) => {
    const email = await registerMember(page, 'mallory', baseURL!);
    await logInMember(page, email);
    await expect(page.getByRole('button', { name: /Your account/ })).toBeVisible();

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('main').getByRole('alert')).toBeVisible();
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('a reset link lets a member choose a new password', async ({ page, baseURL }) => {
    const email = await registerMember(page, 'grace', baseURL!);
    await page.goto('/forgot-password', { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText(/reset link is on its way/)).toBeVisible();

    await expect(async () => {
      const list = await (
        await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
      ).json();
      expect(list.messages.length).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 20_000 });
    const list = await (
      await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
    ).json();
    const msg = await (await fetch(`${MAIL}/api/v1/message/${list.messages[0].ID}`)).json();
    await page.goto(
      confirmLink({ html: String(msg.HTML ?? ''), text: String(msg.Text ?? '') }, baseURL!),
    );
    await expect(page).toHaveURL(/\/reset-password/);
    await page.getByLabel('Password', { exact: true }).fill('A-brand-new-password-2!');
    await page.getByRole('button', { name: 'Save password' }).click();
    await expect(page.getByText('Your password is changed.')).toBeVisible();
  });

  test('a member writes a post with images, saves a draft, publishes, unpublishes and deletes it', async ({
    page,
    baseURL,
  }) => {
    const email = await registerMember(page, 'writer', baseURL!);
    await logInMember(page, email);
    const title = `E2E Post ${stamp}`;

    await page.goto('/write', { waitUntil: 'networkidle' });
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page.getByLabel('Short summary').fill('A short summary of the post.');
    await addThumbnail(page);
    await page.getByLabel('Body (Markdown)').fill('## Hello\n\nSome words to read.');
    await page.locator('input[type=file]').nth(1).setInputFiles({
      name: 'inline.png',
      mimeType: 'image/png',
      buffer: PNG_1X1,
    });
    await expect(page.getByLabel('Body (Markdown)')).toHaveValue(
      /!\[Describe this image\]\(http[^)]*\/media\/members\/[^)]+\.png\)/,
    );

    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByText('Draft saved.')).toBeVisible();
    await expect(page).toHaveURL(/\/write\/[0-9a-f-]{36}$/);

    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByText('Published. It is live now.')).toBeVisible();

    await page.goto('/account/posts', { waitUntil: 'networkidle' });
    const row = page.getByRole('listitem').filter({ hasText: title });
    await expect(row).toContainText('Published');

    await row.getByRole('link', { name: 'Edit' }).click();
    await expect(page.getByRole('button', { name: 'Update' })).toBeVisible();
    await page.getByRole('button', { name: 'Unpublish' }).click();
    await expect(page.getByText('Back to a draft. It is no longer public.')).toBeVisible();

    await page.getByRole('button', { name: 'Delete post' }).click();
    await page.getByRole('button', { name: 'Delete post' }).last().click();
    await expect(page).toHaveURL(/\/account\/posts$/);
    await expect(page.getByText('You have not written anything yet.')).toBeVisible();
  });

  test('signed-out visitors are sent to log in before writing', async ({ page }) => {
    await page.goto('/write');
    await expect(page).toHaveURL(/\/login\?next=%2Fwrite/);
  });
});
