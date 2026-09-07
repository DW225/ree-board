import { expect, test } from '@playwright/test';
import type { Route } from '@playwright/test';

const mock = process.env.E2E_MOCK === '1';
const boardPath = mock ? '/board/mock' : process.env.E2E_BOARD_PATH;
const postId = mock ? 'mock-post' : process.env.E2E_POST_ID;
if (!boardPath || !postId) {
  throw new Error('Set E2E_BOARD_PATH and E2E_POST_ID for a disposable board');
}

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => console.error('Browser error:', error));
  if (!mock) return;
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin !== 'http://127.0.0.1:3100') {
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  await page.route('**/api/user/mock-member', route => route.fulfill({
    json: { user: { id: 'mock-member', name: 'Test Member', avatar_url: '/avatar' } },
  }));
  await page.route('**/mock/save', route => route.fulfill({ status: 204 }));
});

test('post edit keeps keyboard focus and text limits', async ({ page }) => {
  await page.goto(boardPath);
  const card = page.getByTestId(`post-${postId}`);
  const trigger = card.getByRole('button', { name: 'Open menu', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const edit = page.getByRole('menuitem', { name: 'Edit', exact: true });
  await edit.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Edit Post' });
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole('textbox', { name: 'Edit post content' });
  await expect(input).toHaveAttribute('maxlength', '500');
  await input.fill('   ');
  await expect(dialog.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
  await input.fill('Migration baseline post');
  await expect(dialog.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
  await input.fill('x'.repeat(500));
  await input.press('End');
  await input.press('x');
  await expect(input).toHaveValue('x'.repeat(500));
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Tab');
    await expect.poll(() => dialog.evaluate(
      element => element.contains(document.activeElement)
    )).toBe(true);
  }
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Shift+Tab');
    await expect.poll(() => dialog.evaluate(
      element => element.contains(document.activeElement)
    )).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.getByRole('menuitem', { name: 'Edit', exact: true })).toBeVisible();
});

test('mock save shows pending state, keeps failed draft, and retries once', async ({ page }) => {
  test.skip(!mock, 'This test controls the mock save endpoint only');
  await page.goto(boardPath);
  const card = page.getByTestId(`post-${postId}`);
  await card.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit Post' });
  const input = dialog.getByRole('textbox', { name: 'Edit post content' });
  const draft = 'Saved through the mock service';
  await input.fill(draft);

  let requests = 0;
  const pending = Promise.withResolvers<Route>();
  await page.route('**/mock/save', route => {
    requests += 1;
    pending.resolve(route);
  });
  await dialog.getByRole('button', { name: 'Save Changes' }).click();
  const route = await pending.promise;
  const saving = dialog.getByRole('button', { name: 'Saving...' });
  await expect(saving).toBeDisabled();
  await expect(input).toBeDisabled();
  await saving.evaluate(button => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  expect(requests).toBe(1);
  await route.abort('failed');
  await expect(page.getByText('Failed to save post', { exact: true })).toBeVisible();
  await expect(input).toHaveValue(draft);
  await expect(input).toBeEnabled();

  await page.unroute('**/mock/save');
  await page.route('**/mock/save', route => {
    requests += 1;
    expect(route.request().postData()).toBe(draft);
    return route.fulfill({ status: 204 });
  });
  await dialog.getByRole('button', { name: 'Save Changes' }).click();
  await expect(dialog).toBeHidden();
  expect(requests).toBe(2);
  await page.reload();
  await expect(card).toContainText(draft);
});

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`mock popup controls and dismissal (${reducedMotion})`, async ({ page }) => {
    test.skip(!mock);
    await page.emulateMedia({ reducedMotion });
    await page.goto(boardPath);
    const navigation = page.getByRole('button', { name: 'Navigation', exact: true });
    for (let i = 0; i < 3; i += 1) {
      await navigation.click();
      const sheet = page.getByRole('dialog', { name: 'Navigation' });
      await expect(sheet).toBeVisible();
      await expect(page.locator('body')).toHaveAttribute('data-scroll-locked', '1');
      await page.keyboard.press('Escape');
      await expect(sheet).toBeHidden();
      await expect(navigation).toBeFocused();
    }
    await navigation.click();
    await page.getByRole('dialog', { name: 'Navigation' }).getByRole('button', { name: 'Close', exact: true }).click();
    await expect(navigation).toBeFocused();
    await navigation.click();
    await page.getByRole('dialog', { name: 'Navigation' }).getByRole('link', { name: 'Board', exact: true }).hover();
    await page.mouse.click(1250, 800);
    await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeHidden();
    await page.getByRole('combobox', { name: 'Role' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox')).toBeVisible();
    await expect(page.getByRole('option', { name: 'Member', exact: true })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('option', { name: 'Guest', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('combobox', { name: 'Role' })).toHaveText('Guest');
    await page.getByRole('button', { name: 'Help', exact: true }).focus();
    await expect(page.getByRole('tooltip')).toHaveText('Board help');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toBeHidden();
    await page.getByRole('button', { name: 'Delete fixture' }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Delete fixture' })).toBeFocused();
    await page.getByRole('button', { name: 'Delete fixture' }).click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByRole('alertdialog')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Delete fixture' })).toHaveCount(0);
  });
}

test('mock status submenu, post entry, empty and read-only states', async ({ page }) => {
  test.skip(!mock);
  let statusWrites = 0;
  await page.route('**/mock/status', route => { statusWrites += 1; return route.fulfill({ status: 204 }); });
  await page.route('**/mock/create', route => route.fulfill({ status: 204 }));
  await page.goto(boardPath);
  const task = page.getByTestId('post-mock-task');
  await task.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('menuitem', { name: 'Status', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await page.getByRole('menuitem', { name: 'In Progress', exact: true }).click();
  await expect(task.getByText('In Progress', { exact: true })).toBeVisible();
  expect(statusWrites).toBe(1);
  await page.getByRole('button', { name: 'Add a card', exact: true }).first().click();
  await page.getByPlaceholder('What went well this sprint?').fill('New baseline card');
  await page.getByRole('button', { name: 'Add card', exact: true }).click();
  await expect(page.getByText('New baseline card', { exact: true })).toHaveCount(1);
  await page.goto('/board/mock?guest');
  await expect(page.getByTestId('post-mock-post')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add a card', exact: true })).toHaveCount(0);
  await page.goto('/board/mock?empty');
  await expect(page.getByTestId('post-mock-post')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add a card', exact: true })).toHaveCount(2);
});

for (const theme of ['light', 'dark']) {
  for (const width of [375, 768, 1440]) {
    test(`mock visual reference ${theme} ${width}`, async ({ page, browserName }) => {
      test.skip(!mock || browserName !== 'chromium');
      await page.setViewportSize({ width, height: width === 375 ? 812 : width === 768 ? 1024 : 900 });
      await page.goto(boardPath);
      await page.evaluate(value => document.documentElement.classList.toggle('dark', value === 'dark'), theme);
      await expect(page.getByTestId('post-mock-post')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`board-${theme}-${width}.png`, { animations: 'disabled', maxDiffPixels: 0 });
      await page.getByTestId('post-mock-post').getByRole('button', { name: 'Open menu' }).click();
      await expect(page.getByRole('menu')).toHaveScreenshot(`menu-${theme}-${width}.png`, { animations: 'disabled', maxDiffPixels: 0 });
      await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Edit Post' })).toHaveScreenshot(`edit-${theme}-${width}.png`, { animations: 'disabled', maxDiffPixels: 0 });
      await page.keyboard.press('Escape');
      await page.getByRole('combobox', { name: 'Role' }).click();
      await expect(page.getByRole('listbox')).toHaveScreenshot(`select-${theme}-${width}.png`, { animations: 'disabled', maxDiffPixels: 0 });
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Help', exact: true }).hover();
      await expect(page.getByRole('tooltip')).toBeVisible();
      await expect(page).toHaveScreenshot(`tooltip-${theme}-${width}.png`, { animations: 'disabled', maxDiffPixels: 0 });
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Navigation', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Navigation' })).toHaveScreenshot(`sheet-${theme}-${width}.png`, { animations: 'disabled', maxDiffPixels: 0 });
    });
  }
}

test('mock dialog widths match the v3 reference', async ({ page, browserName }) => {
  test.skip(!mock || browserName !== 'chromium');
  await page.goto(boardPath);
  const measurements = [];
  for (const rootSize of [16, 20]) {
    for (const width of [375, 767, 768, 769, 1024, 1280, 1536]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px`; }, rootSize);
      await page.getByTestId('post-mock-post').getByRole('button', { name: 'Open menu' }).click();
      await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Edit Post' });
      await expect(dialog).toBeVisible();
      const measured = await dialog.evaluate(element => {
        for (const animation of element.getAnimations()) animation.finish();
        const input = element.querySelector('textarea')!;
        return { dialogWidth: element.getBoundingClientRect().width, maxWidth: getComputedStyle(element).maxWidth, inputWidth: input.getBoundingClientRect().width, minWidth: getComputedStyle(input).minWidth };
      });
      measurements.push({ rootSize, width, ...measured });
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }
  }
  expect(JSON.stringify(measurements, null, 2)).toMatchSnapshot('dialog-widths.json');
});

interface AnimationSample { x: number; y: number; width: number; height: number; opacity: string }
interface AnimationRecord { role: string; state: string | null; duration: number; easing: string; samples: AnimationSample[] }
declare global { interface Window { migrationAnimations: AnimationRecord[] } }

test('mock enter and exit animations retain timing and geometry', async ({ page, browserName }) => {
  test.skip(!mock || browserName !== 'chromium');
  await page.addInitScript(() => {
    window.migrationAnimations = [];
    document.addEventListener('animationstart', event => {
      const element = event.target;
      if (!(element instanceof HTMLElement)) return;
      const role = element.getAttribute('role');
      if (!role || !['dialog', 'menu', 'listbox', 'tooltip'].includes(role)) return;
      const animation = element.getAnimations().find(item => item instanceof CSSAnimation && item.animationName === event.animationName);
      if (!animation?.effect) return;
      const timing = animation.effect.getTiming();
      if (typeof timing.duration !== 'number' || !timing.duration) return;
      const time = animation.currentTime;
      animation.pause();
      const samples = [0, 0.5, 0.999].map(progress => {
        animation.currentTime = timing.duration as number * progress;
        const rect = element.getBoundingClientRect();
        const round = (value: number) => Math.round(value * 10) / 10;
        return { x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height), opacity: getComputedStyle(element).opacity };
      });
      window.migrationAnimations.push({ role, state: element.getAttribute('data-state'), duration: timing.duration, easing: getComputedStyle(element).animationTimingFunction, samples });
      animation.currentTime = time;
      animation.play();
    }, true);
  });
  await page.goto(boardPath);
  await page.getByTestId('post-mock-post').getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit Post' });
  await expect(dialog).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.migrationAnimations.filter(a => a.role === 'dialog' && a.state === 'open').length)).toBe(1);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Navigation', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.migrationAnimations.filter(a => a.role === 'dialog' && a.state === 'open').length)).toBe(2);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeHidden();
  const records = await page.evaluate(() => window.migrationAnimations.filter(a => a.role === 'dialog'));
  expect(records).toHaveLength(4);
  expect(JSON.stringify(records, null, 2)).toMatchSnapshot('dialog-sheet-animations.json');
});

test('mock vote update keeps dragging active and merge preview usable', async ({ page }) => {
  test.skip(!mock);
  await page.route('**/mock/vote', route => route.fulfill({ status: 204 }));
  await page.goto(boardPath);
  const source = page.getByTestId('post-mock-post');
  const target = page.getByTestId('post-mock-task');
  await target.hover();
  await source.hover();
  await expect(source).toHaveAttribute('draggable', 'true');
  await source.getByRole('button', { name: 'Vote for this post' }).click();
  await expect(source.getByRole('button', { name: 'Remove vote' })).toBeEnabled();
  await expect(source).toHaveAttribute('draggable', 'true');
  await source.dragTo(target);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox')).toHaveValue(/Migration baseline post/);
  await dialog.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Heading', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
