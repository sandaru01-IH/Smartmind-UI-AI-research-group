import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, TITLE_PREFIX, eventually, signIn } from './support';

test.describe('admin access', () => {
  test('anonymous visitors are sent to the login page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto('/admin/posts/new');
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fposts%2Fnew/);
  });

  test('a failed login shows one generic message, whatever the reason', async ({ page }) => {
    const messages: string[] = [];
    for (const [email, password] of [
      ['nobody@example.test', 'wrong-password-123'],
      [ADMIN_EMAIL, 'wrong-password-123'],
    ] as const) {
      await page.goto('/admin/login');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      const alert = page.locator('form').getByRole('alert');
      await expect(alert).toBeVisible();
      messages.push((await alert.innerText()).trim());
    }
    expect(messages[0]).toBe('The email or password is not correct.');
    expect(messages[1]).toBe(messages[0]);
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('the password field can be revealed and there is no public sign-up', async ({ page }) => {
    await page.goto('/admin/login');
    const pw = page.getByLabel('Password', { exact: true });
    await expect(pw).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(pw).toHaveAttribute('type', 'text');
    await expect(page.getByText(/sign up|register|create account/i)).toHaveCount(0);
  });

  test('admin pages are noindex', async ({ page }) => {
    const res = await page.goto('/admin/login');
    expect(res?.headers()['x-robots-tag']).toContain('noindex');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('a redirect target outside /admin is ignored after login', async ({ page }) => {
    await signIn(page, '/admin');
    await page.context().clearCookies();
    await page.goto('/admin/login?next=https://evil.example');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill('E2e-Admin-Password-1!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });
});

test.describe('admin lifecycle', () => {
  const stamp = Date.now().toString(36);
  const title = `${TITLE_PREFIX}Lifecycle ${stamp}`;
  const edited = `${TITLE_PREFIX}Lifecycle edited ${stamp}`;
  const slug = `e2e-lifecycle-${stamp}`;

  test('create a draft, publish it, edit it, unpublish it, delete it', async ({ page }) => {
    await signIn(page);
    await expect(page.getByText(/Signed in as/)).toContainText(ADMIN_EMAIL);

    // 1. Create a draft.
    await page.goto('/admin/posts/new');
    await page.getByLabel('Title', { exact: true }).fill(title);
    await expect(page.getByLabel('Slug')).toHaveValue(slug);
    await page.getByLabel('Excerpt').fill('An end-to-end test post.');
    await page
      .getByLabel('Body (Markdown)')
      .fill('## Heading\n\nSome **bold** body text for the e2e test.');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Draft saved.')).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]{36}$/);
    const editUrl = page.url();

    // A draft is invisible to visitors.
    const anon = await page
      .context()
      .browser()!
      .newContext({ baseURL: new URL(page.url()).origin });
    const visitor = await anon.newPage();
    expect((await visitor.goto(`/news/${slug}`))?.status()).toBe(404);
    await visitor.goto('/news');
    await expect(visitor.locator('main').getByText(title)).toHaveCount(0);

    // 2. Publish.
    await page.getByLabel('Status').selectOption('published');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Saved and published.')).toBeVisible();

    // Visible within seconds on /news, the home Latest strip, the ticker and its own page.
    await eventually(visitor, '/news', async () => {
      await expect(visitor.locator('main').getByRole('link', { name: title })).toBeVisible();
    });
    await eventually(visitor, '/', async () => {
      await expect(visitor.locator('#latest').getByText(title)).toBeVisible();
      await expect(
        visitor.getByRole('region', { name: 'Latest updates' }).getByText(title).first(),
      ).toBeAttached();
    });
    await eventually(visitor, `/news/${slug}`, async () => {
      await expect(visitor.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expect(visitor.locator('strong', { hasText: 'bold' })).toBeVisible();
    });

    // 3. Edit.
    await page.goto(editUrl);
    await page.getByLabel('Title', { exact: true }).fill(edited);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Saved and published.')).toBeVisible();
    await eventually(visitor, '/news', async () => {
      await expect(visitor.locator('main').getByRole('link', { name: edited })).toBeVisible();
    });

    // 4. Unpublish from the dashboard.
    await page.goto('/admin');
    await page.getByLabel('Search', { exact: true }).fill(stamp);
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await page.getByRole('button', { name: `Unpublish ${edited}` }).click();
    await expect(page.getByText('Unpublished. It is a draft again.')).toBeVisible();
    await eventually(visitor, '/news', async () => {
      await expect(visitor.locator('main').getByText(edited)).toHaveCount(0);
    });
    expect((await visitor.goto(`/news/${slug}`))?.status()).toBe(404);

    // 5. Delete with confirmation.
    await page.getByRole('button', { name: `Delete ${edited}` }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete this post?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Deleted.')).toBeVisible();
    await expect(page.getByRole('link', { name: edited })).toHaveCount(0);
    await anon.close();
  });

  test('a quick update reaches the ticker within seconds', async ({ page, browser }) => {
    const headline = `${TITLE_PREFIX}Quick update ${stamp}`;
    await signIn(page);
    await page.getByLabel('Headline').fill(headline);
    await page.getByRole('button', { name: 'Publish update' }).click();
    await expect(page.getByText('Published. It is live in the ticker now.')).toBeVisible();

    const visitor = await (await browser.newContext()).newPage();
    await eventually(visitor, '/', async () => {
      await expect(
        visitor.getByRole('region', { name: 'Latest updates' }).getByText(headline).first(),
      ).toBeAttached();
    });
  });

  test('a scheduled post stays hidden, then goes live without any manual step', async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);
    const scheduled = `${TITLE_PREFIX}Scheduled ${stamp}`;
    await signIn(page);
    await page.goto('/admin/posts/new');
    await page.getByLabel('Title', { exact: true }).fill(scheduled);
    await page.getByLabel('Body (Markdown)').fill('Scheduled body.');
    await page.getByLabel('Status').selectOption('published');
    const when = new Date(Date.now() + 20_000);
    const pad = (n: number) => String(n).padStart(2, '0');
    // datetime-local has minute precision, so schedule for the next full minute boundary after 20 s.
    when.setSeconds(0, 0);
    if (when.getTime() < Date.now() + 5_000) when.setMinutes(when.getMinutes() + 1);
    await page
      .getByLabel('Publish at (optional)')
      .fill(
        `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}T${pad(when.getHours())}:${pad(when.getMinutes())}`,
      );
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Saved and published.')).toBeVisible();

    const visitor = await (await browser.newContext()).newPage();
    await visitor.goto('/news');
    await expect(visitor.locator('main').getByText(scheduled)).toHaveCount(0);
    await eventually(
      visitor,
      '/news',
      async () => {
        await expect(visitor.locator('main').getByRole('link', { name: scheduled })).toBeVisible();
      },
      120_000,
    );
  });

  test('uploads reject files that are not images', async ({ page }) => {
    await signIn(page);
    await page.goto('/admin/posts/new', { waitUntil: 'networkidle' });
    await page.locator('input[type=file]').setInputFiles({
      name: 'not-an-image.html',
      mimeType: 'text/html',
      buffer: Buffer.from('<script>alert(1)</script>'),
    });
    await expect(page.getByText('Use a JPEG, PNG or WebP image.')).toBeVisible();
    await page.locator('input[type=file]').setInputFiles({
      name: 'big.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(5 * 1024 * 1024 + 10, 1),
    });
    await expect(page.getByText('Images must be 5 MB or smaller.')).toBeVisible();
    // A file that claims to be a PNG but is not: the server rejects it after upload.
    await page.locator('input[type=file]').setInputFiles({
      name: 'fake.png',
      mimeType: 'image/png',
      buffer: Buffer.from('<html>not a png</html>'),
    });
    await expect(page.getByText(/does not match|Use a JPEG/)).toBeVisible();
  });
});
