import { expect, test } from '@playwright/test';
import type { Route } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // These cases exercise isolated service fixtures, not live accounts or boards.
  test.skip(process.env.E2E_MOCK !== '1');
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:3100'
    ? route.continue() : route.abort('blockedbyclient'));
  const now = new Date('2026-09-08T00:00:00Z');
  await page.clock.install({ time: now });
  await page.route('**/api/board/mock/links', route => route.fulfill({ json: {
    links: [{ id: 1, token: 'fixture-token', boardId: 'mock', role: 1, creator: null, creatorName: 'Test Member',
      createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 30_000).toISOString(), isExpired: false, expiresIn: '1 minute' }], count: 1,
  } }));
});

test('expiration updates link state without discarding an open upgrade form', async ({ page }) => {
  await page.goto('/board/mock?review=expiration');
  await expect(page.getByRole('button', { name: 'Copy invite link' })).toBeEnabled();
  await page.getByRole('button', { name: 'Upgrade to Keep Access' }).click();
  await page.getByLabel('Email Address').fill('guest@example.invalid');
  await page.getByRole('button', { name: 'Send Verification Code' }).click();
  await page.getByLabel('Verification Code', { exact: true }).fill('123456');
  await page.getByLabel('Display Name').fill('Test Guest');
  await page.clock.runFor(61_000);
  await expect(page.getByRole('dialog', { name: 'Verify Your Email' })).toBeVisible();
  await expect(page.getByLabel('Verification Code', { exact: true })).toHaveValue('123456');
  await expect(page.getByLabel('Display Name')).toHaveValue('Test Guest');
  await expect(page.getByRole('dialog')).toContainText('guest@example.invalid');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Upgrade to Keep Access' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy invite link' })).toHaveCount(0);
  await expect(page.getByText('1 expired', { exact: true })).toBeVisible();
});

test('expiration text updates across the 24-hour warning boundary', async ({ page }) => {
  await page.route('**/api/board/mock/links', route => route.fulfill({ json: {
    links: [{ id: 1, token: 'fixture-token', boardId: 'mock', role: 1, creator: null, creatorName: 'Test Member',
      createdAt: '2026-09-08T00:00:00Z', expiresAt: '2026-09-09T00:00:30Z', isExpired: false, expiresIn: '1 day' }], count: 1,
  } }));
  await page.goto('/board/mock?review=expiration');
  await expect(page.getByText('Expires in 1 day', { exact: true })).toBeVisible();
  await page.clock.runFor(61_000);
  await expect(page.getByText('Expires in 23 hours', { exact: true })).toBeVisible();
  await expect(page.getByText('Expires in 1 day', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy invite link' })).toBeEnabled();
});

test('expiration updates an already open revoke dialog', async ({ page }) => {
  await page.goto('/board/mock?review=expiration');
  await page.getByRole('button', { name: 'Revoke magic link' }).click();
  await expect(page.getByRole('dialog')).toContainText('can currently be used to join');
  await page.clock.runFor(61_000);
  await expect(page.getByRole('dialog')).not.toContainText('can currently be used to join');
  await expect(page.getByRole('dialog').getByText('Expired', { exact: true })).toBeVisible();
});

for (const staleResult of ['success', 'failure']) {
  test(`member loads ignore a stale ${staleResult} after closing and reopening`, async ({ page }) => {
    await page.route('**/mock/boards', route => route.fulfill({ json: [{ id: 'a', title: 'Board A' }, { id: 'b', title: 'Board B' }] }));
    const oldRequest = Promise.withResolvers<Route>();
    await page.route('**/mock/members', route => {
      if (route.request().postData() === 'a') { oldRequest.resolve(route); return; }
      return route.fulfill({ json: [{ id: 'member-b', userId: 'user-b', role: 1, username: 'Member B', email: 'b@example.invalid', boardId: 'b', boardTitle: 'Board B' }] });
    });
    await page.goto('/board/mock?review=members');
    await page.getByRole('button', { name: 'Import from Other Boards' }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Board A' }).click();
    const pending = await oldRequest.promise;
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Import from Other Boards' }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Board B' }).click();
    await expect(page.getByRole('button', { name: /Member B/ })).toBeVisible();
    if (staleResult === 'success') {
      await pending.fulfill({ json: [{ id: 'member-a', userId: 'user-a', role: 1, username: 'Member A', email: 'a@example.invalid', boardId: 'a', boardTitle: 'Board A' }] });
    } else {
      await pending.abort('failed');
    }
    await expect(page.getByRole('combobox')).toHaveText('Board B');
    await expect(page.getByRole('button', { name: /Member B/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Member A/ })).toHaveCount(0);
    await expect(page.getByText('Failed to load board members', { exact: true })).toHaveCount(0);
  });
}
