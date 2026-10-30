import { expect, type Page } from '@playwright/test';
import { addThumbnail, serviceClient } from './support';

export const MAIL = 'http://127.0.0.1:54324'; // the local Supabase test inbox (Mailpit)
export const PASSWORD = 'E2e-Member-Password-1!';
export const stamp = Date.now().toString(36);

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

/** A confirmed member made through the admin API. Registration is rate limited, so most tests skip the form. */
export async function createMember(name: string): Promise<string> {
  const email = memberEmail(name);
  const { error } = await serviceClient().auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: `E2E ${name}` },
  });
  if (error) throw error;
  return email;
}

export async function logInMember(page: Page, email: string, next = '/', expectSuccess = true) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  if (expectSuccess) await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

/** Writes and publishes a post as the signed-in member. Returns its address (slug) and id. */
export async function publishPost(
  page: Page,
  title: string,
  body = 'Some words to read.',
): Promise<{ slug: string; id: string }> {
  await page.goto('/write', { waitUntil: 'networkidle' });
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Short summary').fill(`Summary of ${title}`);
  await addThumbnail(page);
  await page.getByLabel('Body (Markdown)').fill(body);
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByText('Published. It is live now.')).toBeVisible();
  await expect(page).toHaveURL(/\/write\/[0-9a-f-]{36}$/);
  const id = page.url().split('/').pop()!;
  const href = await page.getByRole('link', { name: 'View post' }).getAttribute('href');
  return { slug: href!.split('/').pop()!, id };
}
