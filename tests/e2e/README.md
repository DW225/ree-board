# Tailwind migration browser baseline

Status: Task A in progress. On 2026-09-08, the user authorized mock services. Six mock editor checks pass across three browsers. Tailwind remains on v3. No browser reference images have been captured. Tasks B–D have not started.

## Environment

- Base commit: `853322d5f2d3a396fa4a90ffc0a1f49c0e646891`.
- Branch: `feat/tailwind_v4_upgrade`.
- macOS 26.6.2 (25G83), arm64; Node 24.20.0; pnpm 11.25.0.
- Tailwind 3.4.19, Fluid 1.0.4, Fluid merge adapter 0.0.3, tailwind-merge 2.6.1, tailwindcss-animate 1.0.7, typography 0.5.20, PostCSS 8.5.26.
- Playwright Test 1.63.0; installed Chromium 153.0.8010.12 (1243), Firefox 155.0 (1543), WebKit 26.6 (2359).
- The user confirmed the product minimums: Safari 16.4+, Chrome 111+, Firefox 128+.

## Checks

Before setup changes, the installed Jest runner passed 12 suites and 140 tests. `npx tsc --noEmit` passed. The installed ESLint runner found 26 errors and one warning. After setup changes, the same test and type checks passed, and lint reported the same totals.

Existing lint issues include React effect/render rules, unused variables, unescaped text, test import rules, and three scripts outside the configured TypeScript project. Full local logs: `/tmp/ree-tailwind-baseline-eslint-direct.log` and `/tmp/ree-tailwind-lint-after.log`.

The Homebrew pnpm launcher could not write its global package-manager lockfile inside the sandbox. The cached pnpm 11.25.0 CLI worked when run with Node. Package installation used that version. Direct runner commands used for checks:

```sh
node node_modules/eslint/bin/eslint.js .
node node_modules/typescript/bin/tsc --noEmit
node node_modules/jest/bin/jest.js --runInBand
```

The direct Next.js production build remained at “Creating an optimized production build” and was stopped. Build verification is incomplete, not a pass. Its local log is `/tmp/ree-tailwind-baseline-build-direct.log`.

Playwright lists the first test in all three projects when setup IDs are supplied. Missing IDs produce the required setup error. Listing tests does not verify browser behavior.

## Run without Supabase or Turso

```sh
pnpm test:e2e:mock
```

This command starts and stops a separate local server on `127.0.0.1:3100`. No accounts, database, environment file, or saved login state are needed. The existing esbuild dependency bundles the real `PostHeader`, `DialogItem`, Radix controls, signals, and application CSS. The fixture uses a simple card container; it is not the full board page or Next.js server.

Playwright supplies the avatar API response and controls a mock save endpoint. A successful save stores text in browser local storage, which permits a reload check. Each test gets a fresh browser context. The task server action is replaced at build time with a test module that throws if called. A bundle assertion rejects live database, Supabase, or Ably clients. Browser requests to other origins are blocked. These mocks are under `tests/e2e/mock`; production code does not load them.

Verified on 2026-09-08: keyboard edit entry, forward and reverse focus trapping, 500-character limit, whitespace validation, Escape, focus return, menu reopening, save pending/disabled state, repeated submission, network failure, retained draft, retry, and reload of mock saved content. Two tests pass in each browser: six checks total.

This is component evidence only. It does not prove real authentication, RBAC, server-action transport, database persistence, guest permissions, or realtime delivery. Those still need service integration tests. Full board screenshots, the remaining component matrix, and animation/width reference measurements remain pending.

The fixture uses the documented [esbuild alias API](https://esbuild.github.io/api/#alias) and [Playwright web server setup](https://playwright.dev/docs/test-webserver).

## Run against test services

1. Configure disposable test services. Do not use production data.
2. Start `pnpm dev:sql` and `pnpm dev` in separate terminals.
3. Sign in with a test member using the real login UI. Save browser state with `pnpm exec playwright codegen --save-storage=playwright/.auth/member.json http://127.0.0.1:3000`.
4. Create a disposable board and a post with content `Migration baseline post`.
5. Supply its actual path and post ID:

```sh
export E2E_BOARD_PATH=/board/ACTUAL_BOARD_ID
export E2E_POST_ID=ACTUAL_POST_ID
pnpm test:e2e
```

The suite uses an explicitly started server at `http://127.0.0.1:3000`. Set `E2E_BASE_URL` only to an approved test server. Authentication state and reports are ignored by Git. Keep credentials out of this directory.

## Remaining work

The test board and member, second-member, and guest sessions have not been supplied. The shared editor test has run against the mock fixture only. It has not run against a real board.

Complete the remaining component matrix in the handout, capture and review v3 screenshots and animation/width data, and rerun without snapshot updates before removing Fluid. No baseline commit, migration commit, PR, or deployment has been made.


## Baseline update — 2026-09-08

Lint is now clean; `scripts/**` is excluded. TypeScript and all 140 Jest tests pass. The v3 production build passed outside the sandbox with dummy service settings (no production credentials), using Next.js 16.3.3/Turbopack. The earlier build stall was environment-related.

The fixture now uses real BoardColumn, PostCard, PostProvider, Markdown, and popup components. It replaces service actions at build time and uses React.lazy in place of the Next.js chunk loader. The mock data tests passed: 23 tests, with 16 Chromium-only visual/measurement cases deliberately skipped on Firefox/WebKit. References were captured once and passed again without updates. The 36 screenshots cover the board, menu, edit dialog, select, tooltip, and sheet at three widths and both theme classes. JSON references cover root sizes 16/20px at seven viewport widths and dialog/sheet enter/exit geometry and timing.

Measured v3 findings: all three Fluid classes emit no CSS. The Fluid merge adapter removes max-w-lg, leaving the editor at full viewport width. Textarea min-width is 0px. Preserve this with max-w-none and no Fluid minimum width. The authored .dark base rule is also removed by v3 source scanning: no application source contains the literal dark class. Dark variants such as prose-invert still work. The migration must preserve this compiled output and keep the authored theme values available.

Remaining acceptance limits: no real Supabase/Turso/Ably checks, real guest authorization, two-session delivery, or full Next.js page screenshots. Browser zoom at 200%, all animated surfaces, and all component states are not yet covered. Mock read-only checks verify presentation only. AlertDialog is a local fixture because application deletion uses a different flow.
