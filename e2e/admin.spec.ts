import { expect, test } from '@playwright/test';
import { createMember, logInMember, publishPost, stamp as memberStamp } from './members-support';
import {
  ADMIN_EMAIL,
  TITLE_PREFIX,
  addThumbnail,
  eventually,
  serviceClient,
  signIn,
} from './support';

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
    // Without a thumbnail the editor advises one, but does not block publishing.
    await expect(page.getByText('No thumbnail yet')).toBeVisible();
    await addThumbnail(page);
    await page.getByRole('checkbox', { name: /ticker at the top/ }).check();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText(/^Posted!/)).toBeVisible();

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
    await expect(page.getByText(/^Posted!/)).toBeVisible();
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
    // Up to a minute to the schedule, then the cached news list can take 2 more minutes to refresh.
    test.setTimeout(360_000);
    const scheduled = `${TITLE_PREFIX}Scheduled ${stamp}`;
    await signIn(page);
    await page.goto('/admin/posts/new');
    await page.getByLabel('Title', { exact: true }).fill(scheduled);
    await page.getByLabel('Body (Markdown)').fill('Scheduled body.');
    await page.getByLabel('Status').selectOption('published');
    await addThumbnail(page);
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
    await expect(page.getByText(/^Posted!/)).toBeVisible();

    const visitor = await (await browser.newContext()).newPage();
    await visitor.goto('/news');
    await expect(visitor.locator('main').getByText(scheduled)).toHaveCount(0);
    await eventually(
      visitor,
      '/news',
      async () => {
        await expect(visitor.locator('main').getByRole('link', { name: scheduled })).toBeVisible();
      },
      300_000,
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

test.describe('Medium articles', () => {
  const stamp = Date.now().toString(36);
  const title = `${TITLE_PREFIX}Medium ${stamp}`;

  test.afterAll(async () => {
    await serviceClient().from('medium_articles').delete().like('title', `${TITLE_PREFIX}Medium %`);
  });

  test('an article added in the admin shows on /medium and disappears when hidden', async ({
    page,
  }) => {
    await signIn(page);
    await page.goto('/admin/content/medium', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Add an article' }).click();
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page.getByLabel('Link to the article on Medium').fill(`https://medium.com/@e2e/${stamp}`);
    await page.getByLabel('Short summary').fill('An end to end summary.');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('button', { name: new RegExp(title) })).toBeVisible();

    await eventually(page, '/medium', async () => {
      const link = page.getByRole('link', { name: new RegExp(title) });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', `https://medium.com/@e2e/${stamp}`);
      await expect(link).toHaveAttribute('target', '_blank');
    });

    await page.goto('/admin/content/medium', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: new RegExp(title) }).click();
    await page.getByLabel('Show on the Medium articles page').uncheck();
    await page.getByRole('button', { name: 'Save' }).click();
    await eventually(page, '/medium', async () => {
      await expect(page.getByRole('link', { name: new RegExp(title) })).toHaveCount(0);
    });
  });
});

test.describe('home page sections', () => {
  const stamp = Date.now().toString(36);
  const title = `${TITLE_PREFIX}Medium home ${stamp}`;

  test.afterAll(async () => {
    const db = serviceClient();
    await db.from('medium_articles').delete().like('title', `${TITLE_PREFIX}Medium %`);
    await db.from('home_sections').update({ enabled: true }).eq('id', 'medium');
  });

  test('the Medium section shows on the home page, and leaves when its switch is off', async ({
    page,
  }) => {
    await signIn(page);
    // Added through the admin so the site's caches are told about it.
    await page.goto('/admin/content/medium', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Add an article' }).click();
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page
      .getByLabel('Link to the article on Medium')
      .fill(`https://medium.com/@e2e/home-${stamp}`);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('button', { name: new RegExp(title) })).toBeVisible();
    await eventually(page, '/', async () => {
      await expect(page.locator('#latest-medium')).toContainText(title);
    });

    await page.goto('/admin/home', { waitUntil: 'networkidle' });
    const toggle = page.getByLabel('Latest on Medium');
    await expect(toggle).toBeChecked();
    await toggle.uncheck();
    await expect(page.getByText('Latest on Medium is now off.')).toBeVisible();
    await eventually(page, '/', async () => {
      await expect(page.locator('#latest-medium')).toHaveCount(0);
    });

    await page.goto('/admin/home', { waitUntil: 'networkidle' });
    await page.getByLabel('Latest on Medium').check();
    await expect(page.getByText('Latest on Medium is now on.')).toBeVisible();
    await eventually(page, '/', async () => {
      await expect(page.locator('#latest-medium')).toContainText(title);
    });
  });
});

test.describe('community moderation', () => {
  const title = `E2E Moderated ${memberStamp}`;

  test.afterAll(async () => {
    const db = serviceClient();
    await db.from('blog_posts').delete().like('title', 'E2E Moderated %');
    const { data } = await db.auth.admin.listUsers({ perPage: 200 });
    for (const u of data?.users ?? []) {
      if (u.email?.startsWith('e2e-mod-') && u.email.includes(memberStamp)) {
        await db.auth.admin.deleteUser(u.id);
      }
    }
  });

  test('the admin hides a post, a comment and a member, and cannot edit what was written', async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000);
    const writer = await (await browser.newContext()).newPage();
    await logInMember(writer, await createMember('mod-writer'));
    const { slug } = await publishPost(writer, title);

    const fan = await (await browser.newContext()).newPage();
    await logInMember(fan, await createMember('mod-fan'));
    await fan.goto(`/blog/${slug}`, { waitUntil: 'networkidle' });
    await fan.getByLabel('Add a comment').fill('Moderate me please');
    await fan.getByRole('button', { name: 'Post comment' }).click();
    await expect(fan.getByText('Comment posted.')).toBeVisible();

    const visitor = await (await browser.newContext()).newPage();
    const postStatus = async () => (await visitor.goto(`/blog/${slug}`))?.status();

    await signIn(page);

    // Posts: hide, then the public loses it and its writer is told.
    await page.goto('/admin/community', { waitUntil: 'networkidle' });
    const postSwitch = page.getByRole('switch', { name: `Show post: ${title}` });
    await expect(postSwitch).toBeChecked();
    await postSwitch.uncheck();
    await expect(page.getByText('Hidden', { exact: true }).first()).toBeVisible();
    await eventually(visitor, '/blog', async () => {
      await expect(visitor.getByRole('link', { name: title })).toHaveCount(0);
    });
    await expect(async () => expect(await postStatus()).toBe(404)).toPass({ timeout: 20_000 });
    // A hidden post's address also leaves the sitemap.
    await expect(async () => {
      const sitemap = await (await visitor.request.get('/sitemap.xml')).text();
      expect(sitemap).not.toContain(`/blog/${slug}`);
    }).toPass({ timeout: 20_000 });
    await writer.goto('/account/posts', { waitUntil: 'networkidle' });
    await expect(writer.getByText('Hidden by an admin').first()).toBeVisible();

    // The admin has no way to edit the writing.
    await expect(page.getByRole('link', { name: /edit/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^(save|edit)/i })).toHaveCount(0);

    // Show it again.
    await postSwitch.check();
    await eventually(visitor, '/blog', async () => {
      await expect(visitor.getByRole('link', { name: title })).toBeVisible();
    });

    // Comments: hide the comment, the post page loses it.
    await page.goto('/admin/community/comments', { waitUntil: 'networkidle' });
    await page.getByRole('switch', { name: 'Show comment by E2E mod-fan' }).uncheck();
    await expect(page.getByText('Hidden', { exact: true }).first()).toBeVisible();
    await eventually(visitor, `/blog/${slug}`, async () => {
      await expect(visitor.getByText('Moderate me please')).toHaveCount(0);
    });

    // Members: block the writer; their posts leave the site and they cannot publish.
    await page.goto('/admin/community/members', { waitUntil: 'networkidle' });
    await page.getByRole('switch', { name: 'Allow E2E mod-writer to post' }).uncheck();
    await expect(page.getByText('Blocked', { exact: true }).first()).toBeVisible();
    await eventually(visitor, '/blog', async () => {
      await expect(visitor.getByRole('link', { name: title })).toHaveCount(0);
    });
    await writer.goto('/write', { waitUntil: 'networkidle' });
    await expect(writer.getByText(/cannot post right now/)).toBeVisible();

    await page.getByRole('switch', { name: 'Allow E2E mod-writer to post' }).check();
    await eventually(visitor, '/blog', async () => {
      await expect(visitor.getByRole('link', { name: title })).toBeVisible();
    });
  });
});

test.describe('community posts on the home page', () => {
  const title = `E2E Moderated Home ${memberStamp}`;

  test.beforeAll(async () => {
    await serviceClient().from('blog_posts').delete().like('title', 'E2E %');
  });

  test.afterAll(async () => {
    const db = serviceClient();
    await db.from('blog_posts').delete().like('title', 'E2E Moderated %');
    await db.from('home_sections').update({ enabled: true }).eq('id', 'blog');
    const { data } = await db.auth.admin.listUsers({ perPage: 200 });
    for (const u of data?.users ?? []) {
      if (u.email?.startsWith('e2e-mod-') && u.email.includes(memberStamp)) {
        await db.auth.admin.deleteUser(u.id);
      }
    }
  });

  test('the section shows the newest post and goes away when switched off or when the post is hidden', async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);
    const writer = await (await browser.newContext()).newPage();
    await logInMember(writer, await createMember('mod-home'));
    await publishPost(writer, title);

    const visitor = await (await browser.newContext()).newPage();
    await eventually(visitor, '/', async () => {
      await expect(visitor.locator('#latest-blog')).toContainText(title);
    });

    await signIn(page);
    await page.goto('/admin/home', { waitUntil: 'networkidle' });
    await page.getByLabel('Latest from the community').uncheck();
    await expect(page.getByText('Latest from the community is now off.')).toBeVisible();
    await eventually(visitor, '/', async () => {
      await expect(visitor.locator('#latest-blog')).toHaveCount(0);
    });
    await page.getByLabel('Latest from the community').check();
    await expect(page.getByText('Latest from the community is now on.')).toBeVisible();
    await eventually(visitor, '/', async () => {
      await expect(visitor.locator('#latest-blog')).toContainText(title);
    });

    await page.goto('/admin/community', { waitUntil: 'networkidle' });
    await page.getByRole('switch', { name: `Show post: ${title}` }).uncheck();
    await eventually(visitor, '/', async () => {
      await expect(visitor.locator('#latest-blog')).toHaveCount(0);
    });
  });
});
