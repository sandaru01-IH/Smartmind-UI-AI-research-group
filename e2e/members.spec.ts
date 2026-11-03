import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  PASSWORD,
  clearMail,
  confirmLink,
  latestMail,
  createMember,
  createUnconfirmedMember,
  expectSignedIn,
  logInMember,
  logOutMember,
  mailCount,
  memberEmail,
  ownClientAddress,
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

  test('a failed register keeps name, email and terms, empties and focuses the password, and explains it', async ({
    page,
  }) => {
    await page.goto('/register', { waitUntil: 'networkidle' });
    await page.getByLabel('Your name').fill('Keep Me');
    await page.getByLabel('Email').fill('keep-me@example.test');
    await page.getByLabel('Password', { exact: true }).fill('too-short');
    await page.getByLabel(/I accept the/).check();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.locator('main').getByRole('alert')).toHaveText('Fix the highlighted fields.');

    await expect(page.getByLabel('Your name')).toHaveValue('Keep Me');
    await expect(page.getByLabel('Email')).toHaveValue('keep-me@example.test');
    await expect(page.getByLabel(/I accept the/)).toBeChecked();
    const password = page.getByLabel('Password', { exact: true });
    await expect(password).toHaveValue('');
    await expect(password).toBeFocused();
    await expect(password).toHaveAttribute('aria-invalid', 'true');
    // The first id is the error, the second the hint; both must resolve to text.
    const ids = ((await password.getAttribute('aria-describedby')) ?? '').split(' ');
    expect(ids).toHaveLength(2);
    await expect(page.locator(`[id="${ids[0]}"]`)).toHaveText('Use at least 12 characters');
    await expect(page.locator(`[id="${ids[1]}"]`)).toContainText(/characters/);
    // The fields that were fine are not flagged.
    await expect(page.getByLabel('Your name')).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Email')).not.toHaveAttribute('aria-invalid', 'true');

    // The error state has no accessibility violations. The ticker is left out: at this 1440px
    // width axe counts the unclipped box of a wide, scrolling ticker link as covering the "Pause
    // updates" button (target-size), although hit-testing shows the button always takes the click.
    // The public-route scans cover the ticker at the default width.
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .exclude('section[aria-label="Latest updates"]')
      .analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
  });

  test('a failed register points the email and name errors at their fields', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'networkidle' });
    await page.getByLabel('Your name').fill('x');
    await page.getByLabel('Email').fill('not-an-address');
    await page.getByLabel('Password', { exact: true }).fill('a-long-enough-password');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.locator('main').getByRole('alert')).toHaveText('Fix the highlighted fields.');

    // Focus goes to the first invalid field, in page order.
    const name = page.getByLabel('Your name');
    await expect(name).toBeFocused();
    for (const [field, text] of [
      [name, 'Use at least 2 characters'],
      [page.getByLabel('Email'), /email/i],
      [page.getByLabel(/I accept the/), 'Accept the terms to register'],
    ] as const) {
      await expect(field).toHaveAttribute('aria-invalid', 'true');
      const ids = ((await field.getAttribute('aria-describedby')) ?? '').split(' ');
      await expect(page.locator(`[id="${ids[0]}"]`)).toHaveText(text);
    }
    await expect(page.getByLabel('Email')).toHaveValue('not-an-address');
  });

  test('a wrong password keeps the email and puts focus on the message', async ({ page }) => {
    const email = memberEmail('keeper');
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('not-the-password-1');
    await page.getByRole('button', { name: 'Log in' }).click();
    const alert = page.locator('main').getByRole('alert');
    await expect(alert).toHaveText('That email and password do not match.');
    await expect(page.getByLabel('Email')).toHaveValue(email);
    await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
    await expect(alert).toBeFocused();
    // Announced once: the alert is not inside a second live region.
    await expect(page.locator('main [aria-live]')).toHaveCount(0);
  });

  test('a mistyped address on the forgot form is kept', async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill('not-an-address');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.locator('main').getByRole('alert')).toHaveText(
      'Enter a valid email address.',
    );
    await expect(page.getByLabel('Email')).toHaveValue('not-an-address');
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
    // The way out is right there, already holding the address they typed.
    await expect(page.getByRole('button', { name: 'Send the link again' })).toBeVisible();
    await expect(page.getByLabel('Email', { exact: true }).nth(1)).toHaveValue(email);
  });

  test('the register panel names the address, and "Send the link again" sends exactly one new email', async ({
    page,
    baseURL,
  }) => {
    await ownClientAddress(page);
    const email = await submitRegistration(page, 'resend');
    await expect(page.locator('main').getByRole('status')).toContainText(email);
    // The panel's own links, not the page footer's.
    const account = page.getByText(/Then no new link is sent/).locator('..');
    await expect(account.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    await expect(account.getByRole('link', { name: 'Forgot your password?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    await expect(page.getByLabel('Email', { exact: true })).toHaveValue(email);

    await latestMail(email);
    await clearMail(email);
    // Supabase refuses a second email to one address within a second, which would send nothing.
    await page.waitForTimeout(1_100);
    await page.getByRole('button', { name: 'Send the link again' }).click();
    // The answer takes focus from the button it replaces.
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'If that address is waiting for confirmation, we sent a new link.' }),
    ).toBeFocused();
    await expect(async () => expect(await mailCount(email)).toBe(1)).toPass({ timeout: 20_000 });
    // Exactly one: nothing else follows it.
    await page.waitForTimeout(2_000);
    expect(await mailCount(email)).toBe(1);

    // The new link confirms the account.
    await page.goto(confirmLink(await latestMail(email), baseURL!));
    await page.getByRole('button', { name: 'Confirm my email' }).click();
    await expect(page).toHaveURL(/\/login\?verified=1/);
  });

  test('registering an address that already has an account points at log in and reset', async ({
    page,
  }) => {
    await ownClientAddress(page);
    const email = await createMember('again');
    await page.goto('/register', { waitUntil: 'networkidle' });
    await page.getByLabel('Your name').fill('E2E again');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel(/I accept the/).check();
    await page.getByRole('button', { name: 'Create account' }).click();
    // The same panel as a new address, so it cannot tell anyone the account exists.
    await expect(page.getByText('Check your email')).toBeVisible();
    await expect(page.locator('main').getByRole('status')).toContainText(email);
    const account = page
      .getByText(/Already have an account\? Then no new link is sent/)
      .locator('..');
    await expect(account.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    await expect(account.getByRole('link', { name: 'Forgot your password?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  test('a dead confirm link offers to send a new one, and it arrives', async ({
    page,
    baseURL,
  }) => {
    await ownClientAddress(page);
    const email = await createUnconfirmedMember('deadlink');
    await page.goto('/login?error=confirm', { waitUntil: 'networkidle' });
    await expect(page.getByText(/send yourself a new link/)).toBeVisible();
    const field = page.locator('#resend-email');
    await expect(field).toHaveValue('');
    await field.fill(email);
    await page.getByRole('button', { name: 'Send the link again' }).click();
    await expect(
      page.getByText('If that address is waiting for confirmation, we sent a new link.'),
    ).toBeVisible();
    await page.goto(confirmLink(await latestMail(email), baseURL!));
    await page.getByRole('button', { name: 'Confirm my email' }).click();
    await expect(page).toHaveURL(/\/login\?verified=1/);
  });

  test('a fourth resend within the hour is refused', async ({ page }) => {
    await ownClientAddress(page);
    const email = await createUnconfirmedMember('spammed');
    const send = async () => {
      await page.goto('/login?error=confirm', { waitUntil: 'networkidle' });
      await page.locator('#resend-email').fill(email);
      await page.getByRole('button', { name: 'Send the link again' }).click();
    };
    for (let i = 0; i < 3; i++) {
      await send();
      await expect(
        page.getByText('If that address is waiting for confirmation, we sent a new link.'),
      ).toBeVisible();
    }
    await send();
    const alert = page.locator('main').getByRole('alert');
    await expect(alert).toHaveText(/^Too many attempts\. Try again in 60 minutes\.$/);
    await expect(alert).toBeFocused();
    await expect(page.locator('#resend-email')).toHaveValue(email);
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

  test('a reset link lets a member choose a new password, and signs out their other devices', async ({
    page,
    browser,
    baseURL,
  }) => {
    const email = await registerMember(page, 'grace', baseURL!);
    // Another device that was signed in before the reset.
    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await logInMember(other, email);
    await expectSignedIn(other, true);

    await page.goto(await requestResetLink(page, email, baseURL!));
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/reset-password/);
    await page.getByLabel('Password', { exact: true }).fill('A-brand-new-password-2!');
    await page.getByRole('button', { name: 'Save password' }).click();
    await expect(page).toHaveURL(/\/account\?password=changed$/);
    await expect(page.locator('main').getByRole('status')).toHaveText(
      'Your password is changed. You are still logged in here, and logged out everywhere else.',
    );
    await expectSignedIn(page, true);
    await expectSignedIn(other, false);
    await otherContext.close();
  });

  test('a signed-in member or a visitor without a reset link cannot open the new-password form', async ({
    page,
    browser,
  }) => {
    const email = await createMember('noreset');
    await logInMember(page, email);
    await page.goto('/reset-password');
    await expect(page).toHaveURL(/\/forgot-password\?error=expired$/);
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible();

    const visitorContext = await browser.newContext();
    const visitor = await visitorContext.newPage();
    await visitor.goto('/reset-password');
    await expect(visitor).toHaveURL(/\/forgot-password\?error=expired$/);
    await visitorContext.close();
  });

  test('logging out on one device leaves the others signed in', async ({ page, browser }) => {
    const email = await createMember('twodevices');
    await logInMember(page, email);
    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await logInMember(other, email);

    await logOutMember(page);
    await expectSignedIn(page, false);
    await expectSignedIn(other, true);
    await otherContext.close();
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
    browser,
    baseURL,
  }) => {
    const email = await createMember('usedreset');
    const link = await requestResetLink(page, email, baseURL!);
    await page.goto(link);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/reset-password/);

    // Someone else's browser, without the session the first use opened.
    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await other.goto(link);
    await other.getByRole('button', { name: 'Continue' }).click();
    await expect(other).toHaveURL(/\/forgot-password\?error=expired/);
    await expect(other.getByText(/reset link has expired or was already used/)).toBeVisible();
    await expect(other.getByRole('button', { name: 'Send reset link' })).toBeVisible();
    await otherContext.close();
  });

  test('confirm: a double click on a sign-up link sends one request and ends confirmed', async ({
    page,
    baseURL,
  }) => {
    const email = await submitRegistration(page, 'dblsignup');
    const posts: string[] = [];
    page.on('request', (r) => {
      if (r.method() === 'POST') posts.push(r.url());
    });
    await page.goto(confirmLink(await latestMail(email), baseURL!), { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Confirm my email' }).dblclick();
    await expect(page).toHaveURL(/\/login\?verified=1$/);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login\?verified=1$/);
    await expect(page.getByText('Your email is confirmed.')).toBeVisible();
    expect(posts).toHaveLength(1);
  });

  test('confirm: a double click on a reset link ends on the new-password form', async ({
    page,
    baseURL,
  }) => {
    const email = await createMember('dblreset');
    const link = await requestResetLink(page, email, baseURL!);
    const seen: string[] = [];
    page.on('framenavigated', (f) => {
      if (f === page.mainFrame()) seen.push(f.url());
    });
    await page.goto(link, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Continue' }).dblclick();
    await expect(page).toHaveURL(/\/reset-password$/);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/reset-password$/);
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    expect(seen.filter((u) => u.includes('/forgot-password'))).toEqual([]);
  });

  test('confirm: a made-up token goes to the login page with the message', async ({ page }) => {
    await page.goto('/auth/confirm?token_hash=not-a-real-token&type=email', {
      waitUntil: 'networkidle',
    });
    await page.getByRole('button', { name: 'Confirm my email' }).click();
    await expect(page).toHaveURL(/\/login\?error=confirm$/);
    await expect(page.getByText(/already confirmed your email, just log in/)).toBeVisible();
  });

  test('logging in with a tab hidden in ?next= stays on this site', async ({ page, baseURL }) => {
    const email = await createMember('tabnext');
    await page.goto('/login?next=%2F%09%2Fevil.example', { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
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
    await visitor.context().close();
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
    await readerPage.context().close();
    await visitor.context().close();
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
    await visitor.context().close();
  });
});

/** The browser's calls to `/api/me`, the header's "who is signed in" question. */
function watchMe(page: Page) {
  const calls: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).pathname === '/api/me') calls.push(r.url());
  });
  return calls;
}

test.describe('header session check', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const headerLogIn = (page: Page) => page.locator('header').getByRole('link', { name: 'Log in' });
  const accountButton = (page: Page) => page.getByRole('button', { name: /^Your account/ });
  const settle = (page: Page) => page.waitForTimeout(1_000);

  test('a signed-out page load asks once', async ({ page }) => {
    const calls = watchMe(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(headerLogIn(page)).toBeVisible();
    await settle(page);
    expect(calls).toHaveLength(1);
  });

  test('a signed-in page load asks once, and each client-side navigation asks once', async ({
    page,
  }) => {
    await ownClientAddress(page);
    await logInMember(page, await createMember('hdr-nav'));
    // Logging in moves the page client-side, and that move asks too: let it finish before counting.
    await expect(accountButton(page)).toBeVisible();
    await settle(page);
    const calls = watchMe(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(accountButton(page)).toBeVisible();
    await settle(page);
    expect(calls).toHaveLength(1);

    for (const [name, path] of [
      ['About', '/about'],
      ['Research', '/research'],
    ] as const) {
      const before = calls.length;
      await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await settle(page);
      expect(calls.length - before, `navigating to ${path}`).toBe(1);
      await expect(accountButton(page)).toBeVisible();
    }
  });

  test('opening the mobile menu asks nothing more', async ({ page }) => {
    await ownClientAddress(page);
    await logInMember(page, await createMember('hdr-mobile'));
    await page.setViewportSize({ width: 390, height: 844 });
    const calls = watchMe(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await settle(page);
    const before = calls.length;
    expect(before).toBe(1);
    await page.getByRole('button', { name: 'Menu' }).click();
    const menu = page.locator('#mobile-menu');
    // The account links are there at once, from what the header already knows.
    await expect(menu.getByRole('button', { name: 'Log out' })).toBeVisible();
    await settle(page);
    expect(calls.length - before).toBe(0);
  });

  test('after logging out the header stays on "Log in" and nobody is told signed-in again', async ({
    page,
  }) => {
    await ownClientAddress(page);
    await logInMember(page, await createMember('hdr-out'));
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(accountButton(page)).toBeVisible();

    const signedInAnswers: string[] = [];
    let loggedOut = false;
    page.on('response', async (r) => {
      if (!loggedOut || new URL(r.url()).pathname !== '/api/me') return;
      const body = (await r.json().catch(() => null)) as { signedIn?: boolean } | null;
      if (body?.signedIn) signedInAnswers.push(r.url());
    });
    await accountButton(page).click();
    loggedOut = true;
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(headerLogIn(page)).toBeVisible();
    // Three seconds, checked often: it must not flip back to the account button and then to Log in.
    for (let i = 0; i < 6; i++) {
      await expect(accountButton(page)).toHaveCount(0);
      await expect(headerLogIn(page)).toBeVisible();
      await page.waitForTimeout(500);
    }
    expect(signedInAnswers).toEqual([]);
  });

  test('a failing /api/me keeps what the header already knew', async ({ page }) => {
    await ownClientAddress(page);
    await logInMember(page, await createMember('hdr-500'));
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(accountButton(page)).toBeVisible();

    await page.route('**/api/me', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'About' })
      .click();
    await expect(page).toHaveURL(/\/about$/);
    await settle(page);
    await expect(accountButton(page)).toBeVisible();
    await expect(headerLogIn(page)).toHaveCount(0);
  });
});
