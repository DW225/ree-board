# Tailwind migration checks

The baseline, Fluid removal, lint fixes, migration, Sonar integration, and state fixes are separate functional commits. The lint commit includes the `scripts/**` exclusion. The Stop hook runs lint; the existing lint failures caused its repeated failures. The hook remains enabled.

## Environment and packages

- Base: `853322d5f2d3a396fa4a90ffc0a1f49c0e646891`; branch: `feat/tailwind_v4_upgrade`.
- macOS 26.6.2 (25G83), arm64; Node 24.20.0; pnpm 11.25.0.
- Playwright 1.63.0: Chromium 153.0.8010.12 (1243), Firefox 155.0 (1543), WebKit 26.6 (2359).
- Product minimums confirmed by the user: Safari 16.4+, Chrome 111+, Firefox 128+. The bundled browsers do not test these minimum versions.
- Baseline: Tailwind 3.4.19, Fluid 1.0.4, Fluid merge adapter 0.0.3, tailwind-merge 2.6.1, tailwindcss-animate 1.0.7.
- Migration: Tailwind and matching PostCSS plugin 4.3.3, tw-animate-css 1.4.0, official shadcn `cn` 0.2.6. The npm repository was checked against `shadcn-ui/cn`.
- Typography 0.5.20 and PostCSS 8.5.26 are retained. Fluid, the old animation plugin, autoprefixer, and direct clsx/tailwind-merge dependencies are removed.

## Reproduce the mock checks

```sh
pnpm install --frozen-lockfile
pnpm lint
npx tsc --noEmit
pnpm test --runInBand
node tests/e2e/download-baseline.mjs
pnpm test:e2e:mock
```

The mock command starts a separate server at `127.0.0.1:3100`. It bundles real BoardColumn, PostCard, PostProvider, Markdown, and Radix components with esbuild. Actions use test endpoints. Playwright controls their responses. A successful mock save uses browser local storage for the reload check. Each test gets a fresh browser context.

A bundle assertion rejects live database, Supabase, and Ably clients. Requests to external origins are blocked. The fixture uses React.lazy in place of the Next.js dynamic loader. Production code does not load these mocks. This is a component fixture, not a full Next.js board page.

The suite covers keyboard entry, forward/reverse focus trapping, text limits, validation, Escape and focus return, pending saves, repeated submission, failed saves and retry, reload, task status, card creation, read-only and empty presentation, drag after voting, and merge preview. Popup checks cover normal and reduced motion, sheet close/outside actions, keyboard select, tooltip focus, and alert actions.

The 36 original Chromium reference images are [PR attachments](https://github.com/DW225/ree-board/pull/1017), not Git files. Run the download command above once; it checks each image against `visual-baseline.json` and reuses valid local copies. The images cover board, menu, edit dialog, select, tooltip, and sheet at 375/768/1440px, with light/dark classes. JSON references cover widths at 375/767/768/769/1024/1280/1536px with 16/20px root fonts, plus dialog/sheet enter and exit timing, opacity, and geometry. Reference image bytes and JSON values remain unchanged after migration. `.gitattributes` keeps the JSON files on LF line endings. Visual and measurement cases are skipped on Firefox/WebKit; behavior checks run on all three engines.

## Measured compatibility decisions

- All three Fluid classes emitted no CSS. The old Fluid merge adapter removed the default dialog max-width. The editor was full viewport width and its textarea had a 0px minimum width. `max-w-none` and removal of the ineffective minimum-width class preserve that output; no clamp is needed.
- V3 removed the authored `.dark` token rule because no application source uses the literal `dark` class. Dark variants such as prose-invert still work. The CSS utility retains the authored dark values and the same source boundary without activating an unused theme rule.
- CSS preserves the original rem breakpoints, typography, HSL tokens, used palette colors, sRGB gradients, font stack, button cursors, and table cell padding.
- V4 translate utilities combine with animated transforms differently. Centered dialogs use the original transform behavior and explicit 150ms animation duration. Sheet open/close remains 500/300ms with the original easing.
- The v3 transparent focus outline is retained outside forced-colors mode. Enter/exit keyframes retain the v3 opacity and transform without the new zero-radius blur. Together these avoid a Chromium paint difference at fractional positions; the original 375px images match exactly.
- Unused animation values incorrectly nested under v3 colors were removed. They were not activated as new behavior.

## Verification status — 2026-09-08

- V3 baseline build and stable reference run passed. The original lint run had 26 errors and one warning; these were fixed in the separate lint commit.
- V4 frozen install, lint, TypeScript, 13 Jest suites / 141 tests, and production build pass.
- Negative checks pass: removing the animation import fails the animation assertion; changing max-width fails the width reference; bypassing class merging fails the Jest contract. All mutations were restored.
- The production homepage returns HTTP 200 and has no browser page errors with external requests blocked.
- The final production CSS mock run has 38 passes, 16 deliberate skips, and zero failures. All 36 reference images match with zero allowed pixel difference. Width and animation values match exactly.
- State regression checks cover invitation expiration, an open revoke dialog, an open guest upgrade form, and stale member-import success/error responses. All 12 pass in the three browser engines, and fail when the corresponding fixes are removed.

Build checks use dummy service settings, a temporary SQLite path, an empty Sentry token, and a local dummy Supabase URL. No production credentials are needed. To test compiled CSS, set `E2E_PRODUCTION_CSS` to the main CSS file under `.next/static/chunks` after `pnpm build`, then run `pnpm test:e2e:mock`. This tests production CSS with mocked components; it does not prove real server actions.

Local build/test logs are under `/tmp/ree-v4-*.log`. Playwright writes failure images and traces to ignored `test-results/`. The pnpm launcher stalled in this environment; a temporary wrapper invoked the cached pnpm 11.25.0 CLI. The repository commands are unchanged.

## Acceptance limits

Real Supabase authentication, Turso persistence, guest authorization, Ably two-session delivery, and the authenticated production board have not been tested. Read-only fixture checks prove presentation only. Actual 200% browser zoom and timing samples for every animated surface also remain unverified. These checks are not reported as passing.

To run the shared editor test against disposable services:

1. Configure test services and start the application. Never use production data.
2. Sign in as a test member and save state with `pnpm exec playwright codegen --save-storage=playwright/.auth/member.json http://127.0.0.1:3000`.
3. Create a board and a post containing `Migration baseline post`.
4. Set `E2E_BOARD_PATH=/board/ACTUAL_BOARD_ID` and `E2E_POST_ID=ACTUAL_POST_ID`, then run `pnpm test:e2e`. Use `pnpm start` for production verification.

Auth state is ignored by Git. The remaining service matrix needs a second member and a guest session. No production deployment or merge was performed; the repository runs its existing Vercel preview integration on pushes.
