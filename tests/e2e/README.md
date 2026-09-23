# Local E2E

The default local command runs the real production app, Supabase Auth, libSQL, Mailpit, and Chromium on a Docker network with external access blocked. Board events use a small local relay. CAPTCHA uses an explicit local widget fixture. No production credentials or saved login file are needed.

Use macOS or Linux, Node 24+, pnpm 11.25.0, Docker 29+, and a clean worktree without Next.js `.env` files. The supervisor refuses those files without reading them. Docker selection through `DOCKER_HOST`, `DOCKER_CONTEXT`, and `DOCKER_CONFIG` is supported. The selected endpoint must be a local Unix socket. The supervisor keeps that socket for all service operations and records it for cleanup after a crash; application processes do not inherit Docker settings.

```sh
pnpm install --frozen-lockfile
pnpm test:e2e:tools
pnpm test:e2e:local --slot 0
```

The first run downloads pinned images and prepares the Linux browser image. Runtime starts only after preparation. The supervisor starts the local Supabase stack on a temporary bootstrap network, then moves only its owned containers to an internal network with no host gateway. It preserves generated gateway certificates, database keys, volumes, and DNS aliases. All services, Node, and Chromium must pass external-connection denial checks before the app runs. The browser check uses no request interception. Normal test contexts also reject unexpected requests.

Each run gets fresh storage, replays all nine migrations, builds the app with its local public settings, runs the three browser journeys, and removes its owned resources. The same command is configured in `.github/workflows/local-e2e.yml`. CI execution still requires a pushed branch.

For manual agent browser work, use the host profile:

```sh
pnpm exec playwright install chromium
pnpm e2e:up --slot 0
# Open the printed app and inbox URLs in a NEW browser context/profile.
# In another terminal:
pnpm e2e:down --slot 0
```

This interactive host profile publishes ports on loopback. It does not block host or container internet access. `pnpm test:e2e:local --host --slot 0` is available for diagnosis; the default command is the isolated acceptance run.

`e2e:up` stays in the foreground. Ctrl+C also cancels startup. `pnpm e2e:reset --slot 0` replaces only that checkout's selected run. A second `down` is safe. Stop an interactive run before starting another command in the same checkout. After a hard supervisor stop, use `down` to remove stale resources with the exact run labels. Failed removal keeps the ownership record for a retry.

Use one worktree and slot per concurrent agent. Each checkout has one atomic lock. Ports, Auth data, SQL data, build output, and reports are separate. **Cookies are not isolated by port:** use separate browser contexts or profiles, and close them after the run.

For host slot 0, the app is `http://localhost:35000` and Mailpit is `http://127.0.0.1:35004`. Use the printed URLs for other slots. Addresses such as `alice@ree-board.test` require no external inbox. Auth sends real messages to local Mailpit; SMTP forwarding is not configured. The isolated profile uses internal service DNS and publishes no service ports.

Three focused journeys cover:

- Confirmation, password and OTP login, resend, wrong/used codes, recovery, password replacement, session refresh, sign-out, and visible mail failure. The isolated profile sets a 30-second server OTP lifetime to check expiry with the real Auth clock; the interactive profile keeps one hour. The isolated profile also uses a two-minute JWT lifetime and checks the app's cookie refresh after real token expiry with the browser page closed.
- Board/post persistence, editing, votes, task assignment/status, deletion, two-session delivery, a separate board, owner-only access, membership revocation, database stop/restart, notification loss, and stream reconnect. SQL checks distinguish failed writes from saved data whose notification failed.
- A real anonymous guest invitation, rejected server-action writes, email upgrade, and retention of the same user identity and read-only board role.

The ignored `.e2e/run-…/` directory holds reports, traces, logs, the database, and the build. Traces can contain disposable local session tokens. Generated credentials have restricted file permissions and are removed at teardown. The runner has no host home, source, or Docker socket mount. Its service-failure controls can act only on that run's SQL and mail containers. Host file writes reject symlinks.

Online service checks are separate:

```sh
pnpm test:e2e:captcha --slot 1
# Supply a dedicated test-app key through your secret store or shell environment:
pnpm test:e2e:ably --slot 2
```

The CAPTCHA command runs pass, reject, and used-token scenarios with Cloudflare's official public dummy keys. Local Auth performs the real server verification. It tests signup, password login, OTP send/resend, and anonymous entry. Cloudflare network access is required. Known dummy site keys and local modes are rejected in deployed builds.

The Ably command requires `ABLY_E2E_API_KEY` and the approved `ABLY_E2E_KEY_ID` (`appId.keyId`). It refuses a missing or mismatched key and never uses `ABLY_API_KEY` as a fallback. Use a dedicated test app with no production integrations. The suite uses the real token route and SDK for subscribe-only access, cross-board denial, renewal, reconnect, and membership revocation. It remains unverified until a dedicated test key is supplied.

Local relay success does not prove Ably service behavior. The offline CAPTCHA fixture does not prove Cloudflare verification. Hosted Auth settings, external email delivery, and Turso Cloud replication are outside these local checks. Two final isolated runs passed all three journeys, including real expired-cookie refresh. Separate worktree checks also passed for login, reload, logout, reset, and stop isolation. All three Turnstile scenarios passed. Current evidence and the remaining dedicated-Ably check are in the [implementation plan](../../docs/superpowers/plans/2026-09-14-local-e2e-environment.md).

The existing mock and manually configured browser suites retain their commands below and do not load these local specs.

---

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

At the 2026-09-08 Tailwind checkpoint, real Supabase authentication, Turso persistence, guest authorization, Ably two-session delivery, and the authenticated production board had not been tested. The Local E2E section above records the newer local-service results. Read-only fixture checks prove presentation only. Actual 200% browser zoom and timing samples for every animated surface also remain unverified. These checks are not reported as passing.

To run the shared editor test against disposable services:

1. Configure test services and start the application. Never use production data.
2. Sign in as a test member and save state with `pnpm exec playwright codegen --save-storage=playwright/.auth/member.json http://127.0.0.1:3000`.
3. Create a board and a post containing `Migration baseline post`.
4. Set `E2E_BOARD_PATH=/board/ACTUAL_BOARD_ID` and `E2E_POST_ID=ACTUAL_POST_ID`, then run `pnpm test:e2e`. Use `pnpm start` for production verification.

Auth state is ignored by Git. The remaining service matrix needs a second member and a guest session. No production deployment or merge was performed; the repository runs its existing Vercel preview integration on pushes.
