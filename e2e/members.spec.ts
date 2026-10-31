import { expect, test } from '@playwright/test';
import {
  PASSWORD,
  confirmLink,
  latestMail,
  createMember,
  logInMember,
  memberEmail,
  publishPost,
  registerMember,
  requestResetLink,
  stamp,
  submitRegistration,
} from './members-support';
import { PNG_1X1, addThumbnail, serviceClient } from './support';

test.afterAll(async () => {
  const db = serviceClient();
  // Posts outlive their writers (shown as "Former member"), so remove them explicitly.
  await db.from('blog_posts').delete().like('title', 'E2E %');
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

  test('opening the confirm link does not use it up; only the button does', async ({
    page,
    baseURL,
  }) => {
    const email = await submitRegistration(page, 'scanner');
    const link = confirmLink(await latestMail(email), baseURL!);

    // A mail scanner or link checker only opens the link. Twice, to be sure.
    await page.goto(link);
    await expect(page.getByRole('button', { name: 'Confirm my email' })).toBeVisible();
    await page.goto(link);
    await expect(page).not.toHaveURL(/\/login/);

    // The person's own click still works afterwards.
    await page.getByRole('button', { name: 'Confirm my email' }).click();
    await expect(page).toHaveURL(/\/login\?verified=1/);
    await expect(page.getByText('Your email is confirmed.')).toBeVisible();

    // A second use of the same link says so kindly and points at logging in.
    await page.goto(link);
    await page.getByRole('button', { name: 'Confirm my email' }).click();
    await expect(page).toHaveURL(/\/login\?error=confirm/);
    await expect(page.getByText(/already confirmed your email, just log in/)).toBeVisible();
  });

  test('a link with no token goes to the login page with the message', async ({ page }) => {
    await page.goto('/auth/confirm');
    await expect(page).toHaveURL(/\/login\?error=confirm/);
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
  }) => {
    const email = await createMember('mallory');
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
    await page.goto(await requestResetLink(page, email, baseURL!));
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/reset-password/);
    await page.getByLabel('Password', { exact: true }).fill('A-brand-new-password-2!');
    await page.getByRole('button', { name: 'Save password' }).click();
    await expect(page.getByText('Your password is changed.')).toBeVisible();
  });

  test('a reset link still works if the email template names the wrong type', async ({
    page,
    baseURL,
  }) => {
    const email = await createMember('wrongtype');
    const link = (await requestResetLink(page, email, baseURL!)).replace(
      'type=recovery',
      'type=email',
    );
    expect(link).toContain('type=email');
    await page.goto(link);
    await page.getByRole('button', { name: 'Confirm my email' }).click();
    await expect(page).toHaveURL(/\/reset-password/);
  });

  test('a used reset link sends the member back to ask for a new one', async ({
    page,
    baseURL,
  }) => {
    const email = await createMember('usedreset');
    const link = await requestResetLink(page, email, baseURL!);
    await page.goto(link);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/reset-password/);

    await page.goto(link);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/forgot-password\?error=expired/);
    await expect(page.getByText(/reset link has expired or was already used/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible();
  });

  test('a member writes a post with images, saves a draft, publishes, unpublishes and deletes it', async ({
    page,
  }) => {
    const email = await createMember('writer');
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

  test('a published post shows on the blog, its own page and its author page, and is searchable', async ({
    page,
    browser,
  }) => {
    const email = await createMember('reader');
    await logInMember(page, email);
    const title = `E2E Public ${stamp}`;
    const { slug } = await publishPost(page, title, '## Heading\n\n' + 'word '.repeat(450));

    const visitor = await (await browser.newContext()).newPage();
    await visitor.goto('/blog', { waitUntil: 'networkidle' });
    await expect(visitor.getByRole('link', { name: title })).toBeVisible();

    const res = await visitor.goto(`/blog/${slug}`, { waitUntil: 'networkidle' });
    expect(res?.status()).toBe(200);
    await expect(visitor.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(visitor.getByText('3 min read')).toBeVisible();
    await expect(visitor.getByRole('link', { name: 'E2E reader' }).first()).toBeVisible();
    await expect(visitor.locator('meta[property="og:title"]')).toHaveAttribute('content', title);

    await visitor.getByRole('link', { name: 'E2E reader' }).first().click();
    await expect(visitor).toHaveURL(/\/blog\/authors\/[0-9a-f-]{36}$/);
    await expect(visitor.getByRole('link', { name: title })).toBeVisible();

    const sitemap = await (await visitor.request.get('/sitemap.xml')).text();
    expect(sitemap).toContain(`/blog/${slug}`);
    const index = await (await visitor.request.get('/search-index.json')).text();
    expect(index).toContain(title);
  });

  test('an unknown blog address is a real 404', async ({ page }) => {
    const res = await page.goto('/blog/no-such-post-abc123');
    expect(res?.status()).toBe(404);
  });

  test('members like and comment on a post, the writer can delete a comment, visitors are asked to log in', async ({
    page,
    browser,
  }) => {
    const authorEmail = await createMember('author');
    await logInMember(page, authorEmail);
    const title = `E2E Engage ${stamp}`;
    const { slug } = await publishPost(page, title);

    const readerPage = await (await browser.newContext()).newPage();
    await logInMember(readerPage, await createMember('fan'));
    await readerPage.goto(`/blog/${slug}`, { waitUntil: 'networkidle' });

    // Like, reload, still liked; a quick double click leaves a sensible count, never 2.
    const like = readerPage.getByRole('button', { name: /^Like this post \(0\)$/ });
    await like.click();
    await expect(
      readerPage.getByRole('button', { name: /^Remove your like \(1\)$/ }),
    ).toBeVisible();
    await readerPage.reload({ waitUntil: 'networkidle' });
    const liked = readerPage.getByRole('button', { name: /^Remove your like \(1\)$/ });
    await expect(liked).toHaveAttribute('aria-pressed', 'true');
    await liked.dblclick();
    await expect(readerPage.getByRole('button', { name: /\((0|1)\)$/ }).first()).toBeVisible();

    // Comment, including text that looks like html.
    const text = `Great read <b>bold</b> ${stamp}`;
    await readerPage.getByLabel('Add a comment').fill(text);
    await readerPage.getByRole('button', { name: 'Post comment' }).click();
    const item = readerPage.getByRole('listitem').filter({ hasText: `Great read` });
    await expect(item).toContainText(text);
    await expect(item.locator('b')).toHaveCount(0);

    // The post's writer sees it and can delete it.
    await expect(async () => {
      await page.goto(`/blog/${slug}`, { waitUntil: 'networkidle' });
      await expect(page.getByRole('listitem').filter({ hasText: 'Great read' })).toBeVisible();
    }).toPass({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Delete comment' }).click();
    await expect(page.getByText('Comment deleted.')).toBeVisible();
    await expect(page.getByText('No comments yet. Be the first.')).toBeVisible();

    // A visitor who is not signed in is asked to log in.
    const visitor = await (await browser.newContext()).newPage();
    await visitor.goto(`/blog/${slug}`, { waitUntil: 'networkidle' });
    await expect(visitor.getByRole('link', { name: 'Log in to comment' })).toBeVisible();
    await expect(visitor.getByRole('link', { name: /^Log in to like/ })).toHaveAttribute(
      'href',
      `/login?next=%2Fblog%2F${slug}`,
    );
  });

  test('the register form links to the terms and privacy pages, which are marked as drafts', async ({
    page,
  }) => {
    await page.goto('/register', { waitUntil: 'networkidle' });
    await expect(page.getByRole('link', { name: 'Terms', exact: true })).toHaveAttribute(
      'href',
      '/terms',
    );
    await expect(page.getByRole('link', { name: 'Privacy notice' }).first()).toHaveAttribute(
      'href',
      '/privacy',
    );
    for (const [path, heading] of [
      ['/terms', 'Terms of use'],
      ['/privacy', 'Privacy notice'],
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole('note')).toContainText('Draft:');
    }
  });

  test('a member deletes their account, cannot log in again, and their post stays as Former member', async ({
    page,
    browser,
  }) => {
    const email = await createMember('leaver');
    await logInMember(page, email);
    const { slug } = await publishPost(page, `E2E Leaver ${stamp}`);

    await page.goto('/account', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Delete my account' }).click();
    const button = page.getByRole('button', { name: 'Delete my account for good' });
    await expect(button).toBeDisabled();
    await page.getByLabel('Type DELETE to confirm').fill('DELETE');
    await button.click();
    await expect(page).toHaveURL(/\/$/);

    await logInMember(page, email, '/', false);
    await expect(page.locator('main').getByRole('alert')).toHaveText(
      'That email and password do not match.',
    );

    const visitor = await (await browser.newContext()).newPage();
    await visitor.goto(`/blog/${slug}`, { waitUntil: 'networkidle' });
    await expect(visitor.getByText('Former member').first()).toBeVisible();
  });
});
