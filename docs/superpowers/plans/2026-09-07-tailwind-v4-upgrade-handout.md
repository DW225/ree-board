# Tailwind v4 Upgrade Implementation Plan and Handout

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Use checkboxes to record progress. This handout does not authorize deployment.

**Goal:** Upgrade ree-board to Tailwind v4, remove the Fluid dependencies, and preserve the current component appearance and behavior.

**Architecture:** Keep the existing shadcn components and Radix primitives. Replace the small amount of Fluid sizing with native CSS. Move Tailwind configuration to CSS, use `tw-animate-css`, and use the official shadcn `cn` package after v4 is in place.

**Tech stack:** Next.js 16, React 19, TypeScript, Tailwind, Radix, Jest, and Playwright Test.

**Spec:** The requirements and acceptance checks in this handout implement the user request in this task. No separate design document is required.

**Prepared:** 2026-09-07. **Updated:** 2026-09-08. **Status:** V3 baseline and Fluid removal are committed. Tailwind v4 and the review fixes pass the approved mocked production checks. Screenshots are stored as PR attachments with a checksum-pinned download manifest. The user authorized mock services. See `tests/e2e/README.md` for results and explicit acceptance limits. Unchecked service checks remain deferred; mocks do not prove them.

## Global constraints

- Preserve component APIs, form content, permissions, data writes, and realtime behavior.
- Keep Radix. Do not switch to Base UI or overwrite the component directory with the latest shadcn registry.
- Keep the current colors, fonts, radius, spacing, focus indicators, and light/dark behavior.
- Keep `@tailwindcss/typography`. Do not switch Markdown rendering to Typeset during this upgrade.
- Do not add another fluid sizing package. Preserve smooth sizing with CSS `clamp()` where the current output actually uses it.
- Preserve unrelated working-tree changes. Use a branch such as `chore/tailwind-v4-upgrade`.
- Run `pnpm lint` and `npx tsc --noEmit` after TypeScript or React changes. Run the complete Jest suite because the shared `cn()` helper changes.
- Use a disposable test board and test accounts. Do not write test data to production.
- Tailwind v4 requires Safari 16.4+, Chrome 111+, and Firefox 128+. Confirm that this meets the product browser requirement before execution. Playwright's bundled browsers do not prove support at these minimum versions.

## 1. Package decisions

Versions below are the project versions inspected during planning. Check registry metadata again at implementation time and commit exact resolved versions in `pnpm-lock.yaml`.

| Current package | Target decision | Reason |
| --- | --- | --- |
| `tailwindcss` 3.4.19 | A stable v4 release | Main upgrade. Use the matching version of `@tailwindcss/postcss`. |
| `fluid-tailwind` 1.0.4 | Remove | Its latest stable release requires Tailwind v3. Only three Fluid classes were found, on two lines in `PostHeader.tsx`. |
| `@fluid-tailwind/tailwind-merge` 0.0.3 | Remove | Required only for Fluid class conflict handling. |
| `tailwindcss-animate` 1.0.7 | Replace with `tw-animate-css` 1.x | The replacement used by shadcn for Tailwind v4. The release checked was 1.4.0. Review any later major release before selecting it. |
| `tailwind-merge` 2.6.1 and `clsx` 2.1.1 | Replace direct usage with official shadcn `cn`, after v4 | `cn` supports Tailwind v4. Do not install it as the v3 merge engine. Confirm that the npm package points to `shadcn-ui/cn`. |
| `@tailwindcss/typography` 0.5.20 | Keep | Already supports v3 and v4. Existing Markdown uses `prose` classes. |
| `postcss` 8.5.26 | Keep a compatible v8 release | Used by the Next.js CSS pipeline. |
| `autoprefixer` 10.5.4 | Remove from this pipeline | Tailwind v4 handles vendor prefixes. Check for other direct consumers first. |
| No browser test runner found | Add `@playwright/test` as a development dependency | Jest currently uses the Node environment. It cannot check actual CSS layout, portals, or animation timing. |

`shadcn/typeset` remains an optional later change. It replaces Markdown styling, not Fluid width calculation. A switch would change text layout and require separate visual acceptance.

## 2. Files and responsibilities

All paths below are relative to the repository root.

| File | Planned work |
| --- | --- |
| `package.json`, `pnpm-lock.yaml` | Dependencies and browser test script. |
| `tailwind.config.ts` | Remove Fluid setup, then migrate required values to CSS and remove the file when no longer referenced. |
| `postcss.config.mjs` | Register `@tailwindcss/postcss`. |
| `app/globals.css` | Tailwind imports, theme aliases, dark variant, compatibility styles, and any native Fluid replacement rules. |
| `components.json` | Set `tailwind.config` to an empty string after removing the JS config. Preserve all other settings. |
| `lib/utils.ts` | Preserve the public `cn` export and all unrelated helpers. |
| `components/board/Post/PostHeader.tsx` | Replace the three `~` sizing classes. Preserve edit state and callbacks. |
| `components/board/Post/PostCard.tsx` | Add `data-testid={`post-${post.id}`}` to the card root if needed for stable browser selection. |
| `components/ui/{dialog,alert-dialog,sheet,dropdown-menu,select,tooltip}.tsx` | Change only classes needed to preserve v3 output under v4. |
| `components/common/DialogItem.tsx`, `components/board/BoardColumn.tsx` | Check custom overlay and post-entry animation classes. Change only when a regression check requires it. |
| Other files under `app` and `components` | Review actual upgrade-tool changes, including renamed utilities and variant order. No unrelated refactor. |
| `lib/utils.test.ts` — new | Class merge contract checks. |
| `playwright.config.ts` — new | Separate browser suite configuration. |
| `tests/e2e/tailwind-v4.spec.ts` — new | Component behavior, animation, and visual tests. |
| `tests/e2e/tailwind-v4.spec.ts-snapshots/` — new | Reviewed v3 reference images and style data. |
| `tests/e2e/README.md` — new | Test board setup, test identities, browser versions, and reproduction commands. |
| `jest.config.js`, `.gitignore` | Exclude browser tests from Jest; ignore auth state and generated browser reports. |

## 3. Task A — Record and test the v3 baseline

**Produces:** A reproducible v3 reference and regression tests that run unchanged after the upgrade.

- [x] Record the base commit, Node/pnpm versions, OS, browser versions, and dependency versions in the test README.
- [x] Run the current checks. Record existing failures separately; do not report them as migration failures or quietly accept new failures.

```sh
pnpm lint
npx tsc --noEmit
pnpm test --runInBand
pnpm build
```

- [x] Add Playwright Test and its browsers. Add `test:e2e` with value `playwright test` in `package.json`.

```sh
pnpm add -D @playwright/test
pnpm exec playwright install chromium firefox webkit
```

- [x] Add `/tests/e2e/` to Jest's `testPathIgnorePatterns`. Keep `testEnvironment: 'node'` for existing tests.
- [x] Ignore `playwright/.auth/`, `playwright-report/`, and `test-results/`. Never commit saved authentication state.
- [x] Configure the suite against an explicitly started local server. This permits the same tests against v3, v4, and a production build.

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000',
    storageState: 'playwright/.auth/member.json',
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
```

- [ ] Start the local database and application using the existing development configuration. Use separate terminals for `pnpm dev:sql` and `pnpm dev`.
- [ ] Sign in through the real login UI with a test member account. Save its browser state to the ignored path above. Create a disposable board and one post with content `Migration baseline post`.
- [ ] Set `E2E_BOARD_PATH` to `/board/<actual-board-id>` and `E2E_POST_ID` to that post's actual ID. Store reproduction instructions, not session tokens, in the README. Tests must fail if these inputs are absent.
- [ ] Prepare a second member session and a guest session for the realtime and permission checks. Keep their auth state private too.
- [x] Use fixed test content and loaded fonts for screenshots. Disable or mask only unrelated changing timestamps/avatars. Do not mask controls, dialogs, or the content being tested.

Add this starting regression test before changing Tailwind:

```ts
// tests/e2e/tailwind-v4.spec.ts
import { expect, test } from '@playwright/test';

const boardPath = process.env.E2E_BOARD_PATH;
const postId = process.env.E2E_POST_ID;
if (!boardPath || !postId) {
  throw new Error('Set E2E_BOARD_PATH and E2E_POST_ID for a disposable board');
}

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
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Tab');
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
```

These are contract tests: they should pass on v3. If they reveal a current defect, record it and resolve it in a separate change before claiming full behavior parity. Do not weaken an accessibility assertion to make the migration pass.

- [ ] Implement the full test matrix in section 7 using the real components. Do not substitute mock Radix primitives.
- [x] Generate and review v3 snapshots once. Then run again without updating snapshots to prove a stable baseline.

```sh
pnpm exec playwright test --update-snapshots
pnpm exec playwright test
```

- [x] Save the baseline as a separate Conventional Commit: `test: capture Tailwind v3 component baseline`.

## 4. Task B — Remove Fluid while still on v3

**Consumes:** The v3 baseline. **Produces:** The same rendered widths without either Fluid package.

- [x] Inspect the generated CSS and computed widths for the classes at `PostHeader.tsx:184` and `:204`. The single-value `~max-w-[425px]` may not generate a valid Fluid rule. Do not assume its intended value is the current output.
- [ ] Record dialog width, max-width, textarea width, and min-width at 375, 767, 768, 769, 1024, 1280, and 1536 CSS pixels. Repeat at 200% browser zoom and with a larger root font.
- [x] Replace only emitted Fluid rules with equivalent CSS. Use the recorded breakpoint bounds and rem values; preserve the default `DialogContent` width if a Fluid class currently emits nothing.

For each valid linear rule, use this calculation:

```text
slope = (maximum size - minimum size) / (end viewport - start viewport)
intercept = minimum size - slope * start viewport
preferred = intercept rem + (slope * 100) vw
result = clamp(minimum rem, preferred, maximum rem)
```

Example only: a width from `31.25rem` at `48rem` viewport to `43.75rem` at `96rem` viewport becomes:

```css
max-width: clamp(31.25rem, calc(18.75rem + 26.0416667vw), 43.75rem);
```

Use that expression only if the baseline confirms those bounds. Preserve the original media-query activation as well as the clamp value. Keep a short component class in `globals.css` if an arbitrary utility becomes hard to read.

- [x] Remove `fluid`, `extract`, `screens`, and `fontSize` imports from `tailwind.config.ts`. Preserve their effective rem-based breakpoints and font-size/line-height values explicitly until Task C migrates them.
- [x] Change only the `cn()` implementation to ordinary v2 merging:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [x] Remove both Fluid dependencies. Search source and config for `fluid-tailwind`, `withFluid`, and `~` classes to confirm that there are no remaining consumers.
- [x] Add this shared contract test and retain it through Task C:

```ts
// lib/utils.test.ts
import { cn } from './utils';

test('merges conditional and responsive width overrides', () => {
  expect(cn('p-2', false, { hidden: false }, ['p-4'])).toBe('p-4');
  expect(cn('max-w-lg', 'max-w-[700px]')).toBe('max-w-[700px]');
  expect(cn('md:p-2', 'md:p-4', 'p-1')).toBe('md:p-4 p-1');
  expect(cn('text-sm', 'text-red-500')).toBe('text-sm text-red-500');
  expect(cn('data-[state=open]:animate-in', 'data-[state=closed]:animate-out'))
    .toBe('data-[state=open]:animate-in data-[state=closed]:animate-out');
});
```

- [x] Run the focused Jest test, full required checks, and browser suite. Width difference must be at most 1 CSS pixel at each recorded viewport. Review image differences; do not regenerate references.
- [x] Commit: `refactor: replace Fluid sizing with native CSS`.

## 5. Task C — Upgrade Tailwind, animation, and class merging

**Consumes:** The Fluid-free v3 state. **Produces:** A v4 production build using the same components and theme.

- [x] Record selected package versions before installing. Keep unrelated dependency upgrades out of the lockfile diff.
- [x] On the isolated branch, run the official upgrade tool and review all output:

```sh
pnpm dlx @tailwindcss/upgrade
```

- [x] Install matching stable v4 versions of `tailwindcss` and `@tailwindcss/postcss`, plus the selected `tw-animate-css` 1.x release. Set the PostCSS config to:

```js
const config = { plugins: { '@tailwindcss/postcss': {} } };
export default config;
```

- [x] Replace the three `@tailwind` directives with the imports below. Register typography once. Preserve existing HSL variable values and dark values.

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@plugin '@tailwindcss/typography';
@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --color-chart-1: hsl(var(--chart-1));
  --color-chart-2: hsl(var(--chart-2));
  --color-chart-3: hsl(var(--chart-3));
  --color-chart-4: hsl(var(--chart-4));
  --color-chart-5: hsl(var(--chart-5));
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}
```

- [x] Carry over effective breakpoint and font settings from Task B. Verify both value and unit. Do not replace the existing radius values with current shadcn defaults.
- [x] Review v4 changes to borders, rings, shadows, radius names, outline utilities, placeholder color, button cursor, `space-*`, and stacked variants. Preserve the v3 computed result where the upgrade tool changes meaning. Do not apply blind global text replacements.
- [x] The current config places `animation` and `keyframes` under `colors`. Do not move these into working animations without a usage check: that would activate behavior that may not exist in the baseline. Remove unused entries or document a separate defect.
- [x] Verify automatic source detection includes all current `app` and `components` classes. Use `@source` only for an actual missed source. Remove duplicate custom `text-balance` if the built-in utility produces the same result.
- [ ] Remove the old animation plugin and `autoprefixer` after checking other consumers. Inspect each enter/exit animation against section 7. Matching class names alone do not prove equivalent output.
- [x] Install the selected official `cn` release. Preserve caller imports by replacing only the local helper with:

```ts
export { cn } from 'cn';
```

- [x] Keep `getEnumKeys` and `fetcher` unchanged. Search all direct `clsx` and `tailwind-merge` imports before removing their direct dependencies. Transitive copies needed by other packages may remain.
- [x] Run `lib/utils.test.ts` before and after the merge-engine change. Do not alias the old Fluid adapter to the new package.
- [x] Remove `tailwind.config.ts` only when all required settings have moved. Set `components.json` → `tailwind.config` to `""`. Do not run `shadcn init` or `shadcn add --all --overwrite`.
- [x] Run all required checks and the approved mocked browser matrix without changing reference values. Commit: `chore: upgrade Tailwind and shadcn styling dependencies`.

## 6. Task D — Production verification and handoff

- [x] Run these commands with dummy build service settings (live service checks below remain deferred):

```sh
pnpm install --frozen-lockfile
pnpm lint
npx tsc --noEmit
pnpm test --runInBand
pnpm build
```

- [ ] Stop the development server. Start `pnpm start` against the disposable test services, then run `pnpm exec playwright test` again. Ensure tests reach this production server, not an old dev process.
- [ ] Run the guest and two-session checks in section 7. Record build logs, test reports, reference commit, screenshots, and traces in the PR evidence. Keep auth state and credentials out of these artifacts.
- [x] Record each failure as pre-existing, migration-related, or environment-related. A blocked check is not a passing check.
- [x] Review the guest upgrade and invitation UI state fixes with the required security reviewer. Server authorization, database, realtime, and server-action behavior remain unchanged.
- [x] Open [PR #1017](https://github.com/DW225/ree-board/pull/1017) with package decisions, results, and original screenshot attachments. No production deployment or merge is authorized.

## 7. Required component regression matrix

Implement named browser tests for the rows below. Use accessible roles and names. Use a stable post ID for board actions. Keep the same fixtures before and after the upgrade.

| Test | Action | Required result |
| --- | --- | --- |
| Edit entry | Open post menu, then Edit, using mouse and keyboard | One visible edit dialog; same initial text; menu no longer intercepts dialog input. |
| Focus and dismissal | Tab and Shift+Tab through the dialog; press Escape; repeat with Close and outside click | Focus remains trapped while open; the same dismissal rules as v3; focus returns to the original menu button. |
| Scroll and overlays | Open dialog over a long board; close and reopen it three times | Same scroll lock and overlay darkness as v3; no leftover overlay or blocked pointer events. `DialogItem` and `DialogContent` both create overlays, so inspect the actual result. |
| Edit validation | Enter spaces, then 500 characters; try to type one more | Empty save disabled; 500-character limit retained; counter and disabled styles remain readable. |
| Save pending | Hold the save request before forwarding it | `Saving...` visible; textarea and save button disabled; rapid repeated clicks produce one save request. |
| Save success | Release the request; reload the page | Same completion/close behavior as v3; content saved once and visible after reload. Record any existing defect before migration. |
| Save failure and retry | Abort the save request; restore transport and retry | Error visible; draft retained; inputs recover; retry saves once. Use a test scoped to this action, not a global network abort. |
| Sheet | Open mobile navigation; use keyboard, Close, Escape, and outside click | Correct side and layering; same width and scroll lock; focus returns; links remain usable. |
| Dropdown and submenu | Open user/post menu; use arrows, Enter, and Escape; open Status submenu | Correct placement and stacking; submenu usable; item callback fires once. |
| Select | Open a role/member selector; use arrows and Enter | Correct option selected once; selected label persists; popup does not clip or go behind dialog. |
| Tooltip | Focus and hover a tooltip trigger; dismiss it | Text visible on the correct side; keyboard behavior and dismissal match v3. |
| Confirmations | Cancel and confirm a deletion on a disposable item | Cancel performs no write; confirm performs one write; dialog behavior and focus match baseline. Test AlertDialog in a local test-only fixture if it has no application consumer. |
| Post entry | Add one post with normal motion enabled | Fade/slide visible once; no duplicate post; stable final position; spinner and skeleton animations remain correct. |
| Markdown | Render headings, list, link, blockquote, fenced code, and a wide table in a post and merge preview | Same typography and wrapping; no unexpected horizontal page overflow; dark styles retained. |
| UI states | Show loading, empty board, populated board, and failed mutation | Existing progress, error, empty, and success states remain visible and usable. |
| Guest | Open the same board with a guest account | Read access preserved; mutation controls unavailable; existing permission tests still pass. |
| Realtime | Edit a post in one member session; observe another | Exactly one visible update; no reload required; no stale optimistic state. |

### Visual and width checks

Capture board, edit dialog, open dropdown, select popup, tooltip, and mobile sheet. Use light and dark themes. Use 375×812, 768×1024, and 1440×900 viewports in Chromium; run the core behavior tests in all three browser engines.

Add the 767/768/769 and 1024/1280/1536 width measurements from Task B to catch breakpoint and clamp errors. Wait for fonts before capture:

```ts
await page.evaluate(() => document.fonts.ready);
await expect(page.getByRole('dialog', { name: 'Edit Post' }))
  .toHaveScreenshot('edit-post.png', { animations: 'disabled', maxDiffPixels: 0 });
```

Keep browser version, OS, device scale, test text, and font assets fixed between reference and comparison. Do not compare images from different platforms. Any tolerance increase needs a documented rendering reason; do not use it to hide a layout change.

### Animation checks — separate from screenshots

Screenshots with disabled animations cannot prove animation parity. With `reducedMotion: 'no-preference'`, capture animations as they start, before they finish:

```ts
await page.addInitScript(() => {
  document.addEventListener('animationstart', event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const style = getComputedStyle(target);
    const record = {
      role: target.getAttribute('role'),
      state: target.getAttribute('data-state'),
      duration: style.animationDuration,
      easing: style.animationTimingFunction,
      opacity: style.opacity,
      transform: style.transform,
    };
    console.debug('E2E_ANIMATION ' + JSON.stringify(record));
  }, true);
});
```

Collect only `E2E_ANIMATION` console messages in the browser test. Record the v3 duration, easing, transform endpoints, and opacity endpoints for each animated surface. Use the browser Web Animations API to pause a captured animation and sample its start, midpoint, and end; use normalized progress instead of wall-clock sleeps. Assert the same direction, timing, and final geometry after migration. Animation names may change and are not a parity requirement.

For exit tests, assert that content remains present during the exit animation and then leaves the DOM. Reopen while closing and confirm that no invisible overlay blocks input. `tw-animate-css` can differ in its transform implementation, so compare visual position and scale rather than CSS variable names.

Repeat the open/close and focus checks with reduced motion enabled. Preserve current reduced-motion behavior. If the baseline lacks a required accessibility behavior, track and fix it separately rather than treating it as an accepted migration difference.

### Test quality check

- [x] Temporarily remove the animation import: animation assertions must fail. Restore it.
- [x] Temporarily change the dialog width: width or screenshot checks must fail. Restore it.
- [x] Temporarily replace class merging with simple concatenation: the shared contract test must fail. Restore it.
- [x] Restore all temporary mutations before the final check run.

## 8. Acceptance and rollback

The upgrade is ready for review only when:

- [x] The v3 baseline is stable and remains available for review.
- [ ] All required checks pass, or pre-existing/environment failures are explicitly listed and the affected acceptance claim remains blocked.
- [x] No unexplained screenshot differences remain. Measured widths differ by at most 1 CSS pixel.
- [ ] Keyboard, focus, overlay, save, failure, retry, guest, and realtime checks pass.
- [ ] Enter/exit timing and direction match the baseline; no animation or focus check was replaced by a screenshot alone.
- [x] No Fluid or old animation plugin remains in application config or direct dependencies.
- [x] Production CSS and mocked component behavior are verified. Live services remain outside the approved mock scope.

Store the 36 image references as PR attachments and restore them with `node tests/e2e/download-baseline.mjs`; keep the JSON references and checksum manifest in Git. Use separate commits for baseline tests, Fluid removal, and the v4 migration. If v4 fails acceptance, revert the migration commit and restore its lockfile together. The tested Fluid removal can remain on v3. No database migration or data rollback is needed. Do not use a hard reset that could remove another person's work.

Tests give evidence for the listed cases; they cannot prove every possible interaction is unchanged. Unrun browser/service checks must be stated plainly in the handoff.

## 9. Sources

- [Tailwind v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide): PostCSS migration, browser requirements, and utility changes.
- [Fluid v4 support issue](https://github.com/barvian/fluid-tailwind/issues/66): original plugin compatibility status.
- [shadcn Tailwind v4 guide](https://ui.shadcn.com/docs/tailwind-v4): animation package replacement.
- [tw-animate-css](https://github.com/Wombosvideo/tw-animate-css): supported animation utilities and migration notes.
- [shadcn cn](https://github.com/shadcn-ui/cn): official class merge engine; Tailwind v4 support only.
- [Tailwind Typography](https://github.com/tailwindlabs/tailwindcss-typography): support for both Tailwind versions.
- [shadcn Typeset](https://ui.shadcn.com/docs/typeset): optional separate Markdown styling change.
- [Playwright configuration](https://playwright.dev/docs/test-configuration): browser projects and test runner setup.
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots): reference image workflow and environment constraints.
