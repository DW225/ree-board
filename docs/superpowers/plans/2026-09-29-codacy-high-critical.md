# Codacy High and Critical Issues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task. Use the specialized reviewers required by AGENTS.md for security or database changes. Steps use checkbox syntax for tracking.

**Goal:** Resolve the high and critical Codacy alerts through small code fixes or evidence-backed false-positive decisions.

**Architecture:** Reuse the existing Zod validators, redirect helper, promise error handlers, and signal update functions. Keep server authorization in place. Group related alerts into six tasks; retain every source issue ID in the inventory below.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod, Preact Signals, Drizzle/Turso, Jest, Playwright, Codacy Cloud.

**Spec:** The user requested a plan for high and critical Codacy issues in `DW225/ree-board`. Project constraints come from `AGENTS.md`.

## Evidence and limits

Reviewed on 2026-09-29. Codacy's default branch is `master`.

- The issue query returned **68 active issues across 30 files and 12 rules**: 60 `High` and 8 legacy `Error` entries.
- The security query returned **29 active findings: 8 Critical and 21 High**. All 29 map to IDs in the 68-issue list. Do not add the two totals.
- Critical findings cover six filesystem alerts and two password-comparison alerts. All eight are marked overdue. The 21 High security findings are marked due soon, with a due date of 2026-10-13.
- Some source-code findings carry the scan-type label `SCA`. Their details map to ESLint rules and contain no CVE. No dependency upgrade is supported by this high/critical dataset.
- Codacy last analyzed `a9df985db8af07c73bfadd084cb2f185ebed8c15`, ending at 2026-09-29 07:12:48 UTC. The local checkout is `b90d133a5697281c88858ac79200160d1716f83e`. The Codacy commit is not available in the local object database. These are different snapshots; commit order was not established.
- Codacy uses organization-managed ESLint, SQLint, and Opengrep rules under standard `165789` (Default coding standard). ESLint 9 with repository configuration is disabled. Local lint success alone cannot prove Codacy closure.
- This was a static review of the reported locations and related code. Tests, migrations, builds, and exploit checks were not run. No code, remote findings, or scanner settings were changed.
- No applicable `SECURITY.md` was found. AGENTS.md and source/command definitions provide the local boundary evidence. No critical exploit was confirmed by this review.
- Sonar's separate secret alert at `components/landing/AuthCard.tsx:113` is a false alert on the public heading `Welcome back`. It is not a credential and needs no rotation or copy change. The user confirmed the correction.

## Global constraints

- Scan workspace files with `sonar analyze secrets <path>` before reading them. The AuthCard heading exception above is specific to that alert.
- Preserve unrelated changes in `.codex/config.toml`, `.codex/hooks.json`, and `docs/superpowers/plans/2026-09-14-local-e2e-environment.md`.
- Use a clean worktree and a `fix/` branch for implementation. Use Conventional Commits.
- Guests remain read-only. Validate untrusted input with Zod. Modified server actions must use `actionWithAuth` or `rbacWithAuth`.
- Keep visible failure messages, loading state, repeat-submit prevention, and success confirmation.
- Do not use `void` to hide a rejected promise. Use it only when the called operation already handles failures.
- Keep applied migrations unchanged. Use disposable local services for tests. Do not run migration or cleanup scripts against production.
- Add no dependencies or general-purpose async wrapper. Use the existing Jest and Playwright setup.
- Run `pnpm lint` and `npx tsc --noEmit` after TypeScript changes. Run focused Jest tests for behavior changes and `pnpm test` for security, auth, shared logic, or database changes.

## Alert groups

| Group                        |  Count | Main action                                                                        |
| ---------------------------- | -----: | ---------------------------------------------------------------------------------- |
| Misused or floating promises |     26 | Handle real failures; adapt event callbacks that must return void                  |
| Object/array access          |     17 | Fix drag payload handling; preserve safe bounded lookups or document false alerts  |
| Filesystem paths             |      8 | Review build-tool input boundary before closing six Critical and two High findings |
| Password timing              |      3 | Record false positives for a same-user confirmation check                          |
| Invite redirect              |      1 | Reuse the existing safe-path helper as defense in depth                            |
| Non-null assertions          |      2 | Validate required database configuration at runtime                                |
| Unnecessary conditions       |      9 | Correct types or remove only redundant checks                                      |
| SQL syntax                   |      2 | Validate with SQLite; resolve parser mismatch without rewriting migrations         |
| **Total**                    | **68** |                                                                                    |

## Review focus

1. Failed auth lookup or route parameters must show an error instead of an endless loading screen — Task 2.
2. Invalid drag data must not change signals or invoke a server action — Task 3.
3. A failed or late drag save must not erase a newer update — Task 3.
4. A failed task assignment must keep the dialog open and restore the prior assignment — Task 4.
5. Missing database settings and non-browser rendering must fail or fall back as intended — Task 5.

## Baseline gate

- [ ] Confirm the implementation branch and the latest remote `master` before editing. Do not reset the user's working tree.
- [ ] Refresh both Codacy lists with `--severities Critical,High --limit 1000 --output json`; also record `codacy repository --output json` and `codacy tools --output json`.
- [ ] Reconcile changed IDs by rule, path, line, and source context. Retain a disposition for each inventory row, including alerts already fixed on the implementation branch.
- [ ] Search all callers of a function before changing it. Scan candidate files first. Keep scope within the reported behavior and its direct callers.

## Task 1: Review critical alerts and bounded lookup false positives

**Scope:** 25 alerts, including all eight Critical findings. This task prepares exact closure decisions; it does not disable whole rule families.

**Files to inspect:** `scripts/bundle-analysis.js`, `package.json`, `app/reset-password/page.tsx`, the bounded lookup files listed below, and migrations `0004`/`0008`.

**Interface:** Produce one evidence note per issue/finding ID. No application interface change is required for a false positive.

- [ ] For the three password timing alerts at `app/reset-password/page.tsx:32`, record that both operands come from the user's two password fields. The comparison does not check a stored password, token, or server secret. Propose `FalsePositive` for these exact IDs. Do not add constant-time crypto to this form.
- [ ] For the eight filesystem alerts, trace the fixed paths `../.next/static` and `../.bundle-stats.json` from `__dirname`. `package.json:19-20` exposes the code as a local bundle-report command. The recursive walker follows `statSync`, so record the remaining question: can a less-trusted actor provide build files or symlinks to a more-privileged execution of this command? Until that boundary is settled, retain `needs_review`; do not claim a proven exploit or silently ignore it. If the execution boundary is trusted, close the exact alerts with that evidence. If hostile artifacts are supported, add path containment and a symlink policy, with a temporary-directory test, before closure.
- [ ] Review the twelve other bounded lookup alerts: OTP indices are generated by a six-element UI or six-character paste; strength score is bounded from 0 to 5; role choices come from `[Role.member, Role.guest]`; dashboard label keys come from filter controls; column/placeholder keys come from board configuration. These reads and bounded local array writes do not establish prototype pollution. Confirm callers before proposing `FalsePositive`. Keep the two PostProvider accesses for Task 3 and three merge-display accesses for Task 6.
- [ ] For `drizzle/0004_panoramic_lilandra.sql:1` and `drizzle/0008_free_stark_industries.sql:1`, document the mismatch between the scanner's parser and Turso/SQLite migrations. Verify through the existing local migration replay. Do not edit historical SQL solely to remove valid backtick quoting. Prefer exact false-positive decisions; any wider parser change requires a separate review of the organization standard.
- [ ] At implementation closeout, apply only reviewed issue-specific decisions and record the matching security finding IDs. Recheck both issue and security views. A disappearing alert is not evidence that a real defect was fixed.

**Check:** All 25 rows have an evidence-backed decision. The eight filesystem alerts remain open if the artifact trust question remains unresolved. No source change is required to close the proven password-confirmation false alerts.

## Task 2: Make invitation failure and navigation behavior explicit

**Scope:** Four alerts at `app/invite/[token]/page.tsx:53,70,84,120`.

**Modify:** `app/invite/[token]/page.tsx`.
**Reuse:** `lib/utils/redirect.ts`; inspect `lib/actions/link/action.ts` without changing the invitation authorization model.
**Tests:** Create `app/invite/[token]/page.test.tsx`; reuse `lib/utils/__tests__/redirect.test.ts` and the anonymous-invite journey in `tests/e2e/local/journey.spec.ts`.

**Interfaces:** Keep the server result `{ success: boolean; redirectUrl?: string; error?: string }`. Use `getSafeRedirectPath(path: string | null): string`, which returns `/board` for an invalid path.

- [ ] Add regression cases: rejected route parameters and rejected `supabase.auth.getUser()` produce a visible error and no endless spinner; rejected invitation processing does not navigate; failed guest creation resets CAPTCHA; each operation runs once while pending.
- [ ] Test navigation values `/board/example`, `/invite/error?reason=invalid_or_expired`, `javascript:alert(1)`, `//example.invalid`, and slash/control-character inputs. Valid internal paths remain intact; invalid paths cannot navigate outside the app.
- [ ] Add a failure path to `checkAuth`. Render fatal load/auth errors before the checking screen. Preserve the existing handled failures in `processInvite` and `createGuestAndProcess`, and explicitly mark their handled promises with `void`.
- [ ] Replace the raw assignment with full-page navigation through `globalThis.location.assign(getSafeRedirectPath(result.redirectUrl))`. Full-page navigation preserves the current session refresh behavior. The server currently returns fixed error paths or `/board/` plus a database ID, so this is defense in depth, not a confirmed XSS exploit. Do not use the scanner's suggested `escape()` as URL validation.
- [ ] Run the new page test and the existing redirect tests: `pnpm test --runInBand --runTestsByPath 'app/invite/[token]/page.test.tsx' lib/utils/__tests__/redirect.test.ts`.

**Done when:** Failure is visible, loading ends, and every navigation uses the existing safe-path validator.

## Task 3: Fix drag data and asynchronous drag lifecycle

**Scope:** Twelve alerts in `PostProvider.tsx`, `BoardColumn.tsx`, and `Post/PostCard.tsx`.

**Modify:** `components/board/PostProvider.tsx`, `components/board/BoardColumn.tsx`, `components/board/Post/PostCard.tsx`.
**Reuse:** `PostType`, Zod, `postsSignal`, `updatePostType`, and `UpdatePostTypeAction`.
**Tests:** Create `components/board/PostProvider.test.tsx`; add lifecycle/failure checks to `tests/e2e/local/journey.spec.ts` using the existing local services.

**Interfaces:** Keep `UpdatePostTypeAction(postId, boardId, value)` and `updatePostType(postId, newType)`. The server already uses `z.enum(PostType)` and RBAC; retain those checks.

- [ ] Capture the adapter's drop callback in a Jest test. Valid types `0,1,2,3` must reach both the signal update and action unchanged. `-1`, `4`, `NaN`, and a string must reach neither. Reject missing posts and a source from a different board.
- [ ] Remove the `Object.keys` / `Object.values` enum round trip. Validate the source/destination data with a small local Zod schema, including `z.enum(PostType)`, then use the validated destination value directly.
- [ ] Catch the asynchronous drop save itself. The outer initialization `try/catch` does not catch a later `onDrop` rejection. Show an error and reconcile the optimistic type on failure. Capture the prior type from current signal state; prevent repeat moves while that post is pending and preserve a newer incoming update during rollback.
- [ ] Make hover/touch listeners synchronous wrappers around handled async initialization. Add and remove the same function reference. Retain retry after a failed import. Do not remove a listener merely because initialization started.
- [ ] Give PostProvider and BoardColumn the same cancellation protection already present in PostCard. A deferred import resolved after unmount must not register a monitor or target. Repeated events must register once. Remove only PostCard's redundant inner `if (!viewOnly)`; keep the outer read-only guard.
- [ ] Test a rejected save, a newer signal update before that rejection, repeated interaction, import failure followed by retry, and unmount before import completion. Run `pnpm test --runInBand --runTestsByPath components/board/PostProvider.test.tsx`; run the local journey at final validation.

**Done when:** Invalid data cannot mutate UI state, rejected saves do not leave a false success, and no listener survives unmount.

## Task 4: Resolve remaining UI promise alerts at their event boundaries

**Scope:** Eleven alerts: reset form; merge keyboard shortcut; assignment; vote; two link buttons; two guest-upgrade forms; two AuthCard form props; password-change form.

**Modify:** `app/reset-password/page.tsx`, `components/board/MergePostDialog.tsx`, `components/board/Post/AssignTaskDialog.tsx`, `components/board/Post/PostFooter.tsx`, `components/board/MagicLink/LinkButton.tsx`, `components/guest/UpgradeAccountDialog.tsx`, `components/landing/AuthCard.tsx`, `components/profile/ChangePasswordSection.tsx`.
**Tests:** Extend `tests/e2e/local/journey.spec.ts`; retain existing auth, vote, and task-action Jest tests.

**Interfaces:** DOM/React event callbacks return `void`. Asynchronous business callbacks keep `Promise<void>` where callers must await them. `AssignTaskDialog.onAssign` must reject after a failed save.

- [ ] For handlers that already catch service errors, use a synchronous callback with `void handledOperation(...)`. Preserve synchronous `preventDefault`, progress, CAPTCHA reset, failure messages, and disabled buttons. Do not use `() => asyncOperation()` because it still returns a promise.
- [ ] Remove the unnecessary `async` from `ChangePasswordSection.handleSubmit`; its awaited work is already inside a handled `startTransition` callback.
- [ ] Fix the assignment contract: `PostFooter.handleAssign` currently catches the save failure, restores state, and resolves. That makes the dialog close after failure. Rethrow after rollback; catch in the dialog, retain the form for retry, and clear pending state in `finally`. Keep one visible error message.
- [ ] Verify success, rejection, and repeat activation for the assignment, merge, vote, link, and auth controls. Add focused new cases for assignment failure/retry and the merge keyboard path; reuse existing journeys for behavior-preserving wrapper changes.
- [ ] Run relevant Jest suites and the local browser journey. Check that no unhandled rejection appears and that a failed assignment does not close the dialog.

**Done when:** The callbacks meet their return contracts without hiding failures or changing success behavior.

## Task 5: Correct configuration types, redundant checks, and script entry calls

**Scope:** Ten alerts: two non-null assertions, five remaining condition alerts, and three script entry promises.

**Modify:** `drizzle.config.ts`, `db/actionTableMigration.ts`, `components/board/MemberList.tsx`, `components/board/Post/PostHeader.tsx`, `components/common/AvatarIcon.tsx`, `hooks/useMagicLinks.ts`, `scripts/migrate-to-passwordless.ts`, `scripts/test-guest-cleanup.ts`, `scripts/verify-migration.ts`.
**Related file:** `lib/db/client.ts` has the same asserted environment-variable pattern; correct it in the same small change if still present on the implementation branch.
**Tests:** Add `drizzle.config.test.ts`; extend `lib/db/client.test.ts` for missing configuration. Mock environment loading and database creation; make no network connection.

**Interfaces:** Database configuration supplies a validated nonempty URL. Development and local-E2E branches keep their existing destinations.

- [ ] Test missing and empty `TURSO_DATABASE_URL`: fail with a clear configuration error before client creation. Test configured, development, and local-E2E branches separately.
- [ ] Remove the `!` assertions. Keep the runtime guard in `actionTableMigration.ts`; the assertion is why Codacy incorrectly sees the guard as impossible. Add the equivalent guard to the production branch of `drizzle.config.ts`. Reuse the existing error wording.
- [ ] Remove the guard around required `PostHeader.onUpdate`. Keep its `await` and catch. Narrow `MemberList.handleRemoveMember` in the render guard before calling it. Remove only `nameParts?.` from AvatarIcon; preserve the optional result of `.at(-1)` and its fallback.
- [ ] Change the browser-existence check in `useMagicLinks.getLinkUrl` to a `typeof` check. Retain the non-browser empty-origin fallback.
- [ ] Mark the three script entry promises explicitly with `void` after confirming their existing catch paths report failure and exit nonzero. Do not add duplicate catch wrappers solely for lint. `verify-migration.ts` still references the removed `kinde_id`; record that existing incompatibility and do not execute it against the current schema merely to test a promise annotation.
- [ ] Run configuration tests, lint, and TypeScript. Local lint ignores `scripts/**`, and TypeScript excludes `scripts/**/*.ts`; verify those three source changes through a matching Codacy analysis. Passing local checks do not cover them.

**Done when:** Missing configuration is rejected at runtime, useful fallbacks remain, and script exit behavior is unchanged.

## Task 6: Keep merge display fallbacks with accurate lookup types

**Scope:** Six alerts at `components/board/MergePostDialog.tsx:51,55,66`: three object-access alerts and three condition alerts.

**Modify:** `components/board/MergePostDialog.tsx`.
**Tests:** Add a focused display fallback case to the existing browser coverage in `tests/e2e/tailwind-v4.spec.ts`.

**Interfaces:** Keep `getPostAccentBg`, `getPostAccentText`, and `getPostLabel` returning strings.

- [ ] Convert only the three static merge-display dictionaries to `Map<Post['type'], string>`, following the existing `Map` pattern in AuthCard. Use `.get(type)` so a missing value is represented in the return type.
- [ ] Preserve `bg-[#94A3B8]`, `text-[#94A3B8]`, and the displayed unknown type (`String(type)`) as fallbacks. Keep Tailwind class names as complete literal strings.
- [ ] Check all four valid post types plus an unknown numeric value in the display test. The normal labels and colors must remain unchanged; unknown values must keep the fallback. Do not replace every safe dictionary in the repository.

**Done when:** Both rule families are satisfied without removing intentional fallback behavior.

## Final validation and closure

- [ ] Run `pnpm lint`, `npx tsc --noEmit`, and `pnpm test --runInBand`. Run newly added focused tests first while implementing each task.
- [ ] Run `pnpm test:e2e:local --slot 0` from a clean worktree with Node 24+, Docker 29+, and no Next.js `.env` files. This checks real local auth, guest restrictions, persistence, assignment, and all nine migrations. It does not replace the added drag/import and rejection tests.
- [ ] Run the applicable existing mock browser suite for the merge display change. Keep test services isolated from production.
- [ ] Obtain the security/database review required by AGENTS.md for the resulting patch.
- [ ] Push through the approved development workflow, then wait for Codacy to finish analyzing that exact commit. Requery both views, matching remaining IDs by rule and source location.
- [ ] Record each source issue as fixed, an approved false positive, already absent on the verified commit, or unresolved with an owner and exact evidence gap. Do not describe unresolved filesystem alerts as fixed.

Recommended execution order: settle Critical triage in Task 1, then Tasks 2–4 for user-visible failures, then Tasks 5–6. Use separate Conventional Commits for independently testable changes. This document is a plan; implementation and remote closure actions have not started.

## Per-issue inventory

The inventory retains all 68 source IDs. Security finding IDs are included where available. `Error` is the legacy Critical severity in this query. Proposed actions are not completed work.

| Issue ID       | Severity | Location                                              | Task | Proposed action                                     | Security finding ID                    |
| -------------- | -------- | ----------------------------------------------------- | ---- | --------------------------------------------------- | -------------------------------------- |
| `131526823006` | Error    | `app/reset-password/page.tsx:32`                      | 1    | Propose false positive: same-user confirmation      | `3a4fc11c-78f4-414b-b86e-2440baddaa0a` |
| `131526823095` | High     | `app/reset-password/page.tsx:32`                      | 1    | Propose false positive: same-user confirmation      | `a3adbb51-37c9-4098-858b-23384fe6115c` |
| `131526823150` | Error    | `app/reset-password/page.tsx:32`                      | 1    | Propose false positive: same-user confirmation      | `a7c94cee-da8d-48d0-a3d1-6e889f5e3bce` |
| `131526823021` | High     | `components/board/AddPostForm.tsx:136`                | 1    | Review bounded lookup; propose exact false positive | `78a0c276-1403-4669-a4ca-b7b403e8f13b` |
| `131526823101` | High     | `components/board/BoardColumn.tsx:220`                | 1    | Review bounded lookup; propose exact false positive | `507c6a22-d8f4-4214-9cde-2fd7cc823fbe` |
| `131526823004` | High     | `components/board/MagicLink/MagicLinkCreator.tsx:109` | 1    | Review bounded lookup; propose exact false positive | `6e5fb686-a8ee-46bd-b7ba-ebaf2f570a02` |
| `131526823117` | High     | `components/board/MagicLink/MagicLinkCreator.tsx:114` | 1    | Review bounded lookup; propose exact false positive | `f86516c8-150c-49d9-bf0c-02636f04c87d` |
| `131526823052` | High     | `components/board/MagicLink/MagicLinkCreator.tsx:117` | 1    | Review bounded lookup; propose exact false positive | `870b12e1-ea80-470c-ae74-f54e095a8291` |
| `131526823002` | High     | `components/home/DashboardSearch.tsx:204`             | 1    | Review bounded lookup; propose exact false positive | `83bd5913-d671-4c1d-a7c9-0dd5b58e3a25` |
| `131526823045` | High     | `components/home/DashboardSearch.tsx:213`             | 1    | Review bounded lookup; propose exact false positive | `64e25be7-0bb0-4af8-ae1b-a64a7b0152b8` |
| `131526823089` | High     | `components/landing/auth/OtpInput.tsx:35`             | 1    | Review bounded lookup; propose exact false positive | `22820196-0abf-4280-afa0-01a8e29b0ccc` |
| `131526823042` | High     | `components/landing/auth/useOtpInput.ts:14`           | 1    | Review bounded lookup; propose exact false positive | `72e8f69c-78a0-43c8-b22c-ddb107a3c528` |
| `131526823115` | High     | `components/landing/auth/useOtpInput.ts:25`           | 1    | Review bounded lookup; propose exact false positive | `617bc9df-d0f8-4f5b-8978-6862e55afed0` |
| `131526823020` | High     | `components/landing/auth/useOtpInput.ts:38`           | 1    | Review bounded lookup; propose exact false positive | `4c71ca3d-94d7-4cff-8465-f890c853d778` |
| `131526823037` | High     | `components/profile/SecurityCard.tsx:21`              | 1    | Review bounded lookup; propose exact false positive | `a1ce350e-e211-4336-86a5-cbb8aa1473a5` |
| `131526822942` | High     | `drizzle/0004_panoramic_lilandra.sql:1`               | 1    | Verify SQLite replay; propose parser false positive | `—`                                    |
| `131526822937` | High     | `drizzle/0008_free_stark_industries.sql:1`            | 1    | Verify SQLite replay; propose parser false positive | `—`                                    |
| `131526823147` | Error    | `scripts/bundle-analysis.js:16`                       | 1    | Needs review: artifact and symlink trust boundary   | `dfd72486-32a3-4e15-b5c7-bb8c06ff048b` |
| `131526823128` | High     | `scripts/bundle-analysis.js:24`                       | 1    | Needs review: artifact and symlink trust boundary   | `b09938f6-4748-4a07-800a-9f624c15858d` |
| `131526823143` | Error    | `scripts/bundle-analysis.js:24`                       | 1    | Needs review: artifact and symlink trust boundary   | `251a42da-3899-4e93-87e0-02f22013fe47` |
| `131526823127` | High     | `scripts/bundle-analysis.js:28`                       | 1    | Needs review: artifact and symlink trust boundary   | `09513400-9d42-4008-b42c-d3626aaf3079` |
| `131526823145` | Error    | `scripts/bundle-analysis.js:28`                       | 1    | Needs review: artifact and symlink trust boundary   | `a3194c86-7116-4f05-b4e5-3847b4ca44cc` |
| `131526823148` | Error    | `scripts/bundle-analysis.js:68`                       | 1    | Needs review: artifact and symlink trust boundary   | `5c03aa1e-1f5e-4264-952d-de32ec179240` |
| `131526823146` | Error    | `scripts/bundle-analysis.js:70`                       | 1    | Needs review: artifact and symlink trust boundary   | `252a2b4e-04a5-464f-9346-9e8ec742cc4f` |
| `131526823144` | Error    | `scripts/bundle-analysis.js:83`                       | 1    | Needs review: artifact and symlink trust boundary   | `fdc630f5-e2c4-4e53-b23b-3485df30127d` |
| `131526823088` | High     | `app/invite/[token]/page.tsx:53`                      | 2    | Handle failure / validate navigation                | `—`                                    |
| `131526822998` | High     | `app/invite/[token]/page.tsx:70`                      | 2    | Handle failure / validate navigation                | `8822b472-beb0-487b-a62e-7c2cf118b753` |
| `131526823041` | High     | `app/invite/[token]/page.tsx:84`                      | 2    | Handle failure / validate navigation                | `—`                                    |
| `131526823074` | High     | `app/invite/[token]/page.tsx:120`                     | 2    | Handle failure / validate navigation                | `—`                                    |
| `131526823060` | High     | `components/board/BoardColumn.tsx:159`                | 3    | Fix async listener contract / retain outer guard    | `—`                                    |
| `131526823054` | High     | `components/board/BoardColumn.tsx:160`                | 3    | Fix async listener contract / retain outer guard    | `—`                                    |
| `131526822986` | High     | `components/board/BoardColumn.tsx:163`                | 3    | Fix async listener contract / retain outer guard    | `—`                                    |
| `131526823104` | High     | `components/board/BoardColumn.tsx:166`                | 3    | Fix async listener contract / retain outer guard    | `—`                                    |
| `131526823033` | High     | `components/board/Post/PostCard.tsx:146`              | 3    | Fix async listener contract / retain outer guard    | `—`                                    |
| `131526823059` | High     | `components/board/Post/PostCard.tsx:187`              | 3    | Fix async listener contract / retain outer guard    | `—`                                    |
| `131526823098` | High     | `components/board/Post/PostCard.tsx:188`              | 3    | Fix async listener contract / retain outer guard    | `—`                                    |
| `131526823079` | High     | `components/board/Post/PostCard.tsx:191`              | 3    | Fix async listener contract / retain outer guard    | `—`                                    |
| `131526822981` | High     | `components/board/Post/PostCard.tsx:194`              | 3    | Fix async listener contract / retain outer guard    | `—`                                    |
| `131526823093` | High     | `components/board/PostProvider.tsx:183`               | 3    | Validate drop data / catch save failure             | `0535e9cb-c5e8-44e8-ae68-7d44dbe1beb2` |
| `131526823047` | High     | `components/board/PostProvider.tsx:185`               | 3    | Validate drop data / catch save failure             | `27c358a2-0731-4191-bbc3-d60560eec0da` |
| `131526823046` | High     | `components/board/PostProvider.tsx:200`               | 3    | Validate drop data / catch save failure             | `—`                                    |
| `131526823085` | High     | `app/reset-password/page.tsx:146`                     | 4    | Fix event promise contract                          | `—`                                    |
| `131526822982` | High     | `components/board/MagicLink/LinkButton.tsx:236`       | 4    | Fix event promise contract                          | `—`                                    |
| `131526823022` | High     | `components/board/MagicLink/LinkButton.tsx:381`       | 4    | Fix event promise contract                          | `—`                                    |
| `131526822995` | High     | `components/board/MergePostDialog.tsx:183`            | 4    | Fix event promise contract                          | `—`                                    |
| `131526823064` | High     | `components/board/Post/AssignTaskDialog.tsx:126`      | 4    | Fix event promise contract                          | `—`                                    |
| `131526822985` | High     | `components/board/Post/PostFooter.tsx:144`            | 4    | Fix event promise contract                          | `—`                                    |
| `131526823108` | High     | `components/guest/UpgradeAccountDialog.tsx:148`       | 4    | Fix event promise contract                          | `—`                                    |
| `131526823016` | High     | `components/guest/UpgradeAccountDialog.tsx:198`       | 4    | Fix event promise contract                          | `—`                                    |
| `131526823008` | High     | `components/landing/AuthCard.tsx:153`                 | 4    | Fix event promise contract                          | `—`                                    |
| `131526822997` | High     | `components/landing/AuthCard.tsx:175`                 | 4    | Fix event promise contract                          | `—`                                    |
| `131526823036` | High     | `components/profile/ChangePasswordSection.tsx:127`    | 4    | Fix event promise contract                          | `—`                                    |
| `131526823080` | High     | `components/board/MemberList.tsx:97`                  | 5    | Correct types / retain handled script failure       | `—`                                    |
| `131526823116` | High     | `components/board/Post/PostHeader.tsx:73`             | 5    | Correct types / retain handled script failure       | `—`                                    |
| `131526823092` | High     | `components/common/AvatarIcon.tsx:34`                 | 5    | Correct types / retain handled script failure       | `—`                                    |
| `131526823024` | High     | `db/actionTableMigration.ts:14`                       | 5    | Correct types / retain handled script failure       | `—`                                    |
| `131526823025` | High     | `db/actionTableMigration.ts:16`                       | 5    | Correct types / retain handled script failure       | `—`                                    |
| `131526822980` | High     | `drizzle.config.ts:14`                                | 5    | Correct types / retain handled script failure       | `—`                                    |
| `131526823014` | High     | `hooks/useMagicLinks.ts:172`                          | 5    | Correct types / retain handled script failure       | `—`                                    |
| `131526823049` | High     | `scripts/migrate-to-passwordless.ts:227`              | 5    | Correct types / retain handled script failure       | `—`                                    |
| `131526823005` | High     | `scripts/test-guest-cleanup.ts:212`                   | 5    | Correct types / retain handled script failure       | `—`                                    |
| `131526823105` | High     | `scripts/verify-migration.ts:177`                     | 5    | Correct types / retain handled script failure       | `—`                                    |
| `131526823050` | High     | `components/board/MergePostDialog.tsx:51`             | 6    | Use Map lookup and keep fallback                    | `783aca26-8bcc-494a-bd1d-d9f1b3a931e9` |
| `131526823103` | High     | `components/board/MergePostDialog.tsx:51`             | 6    | Use Map lookup and keep fallback                    | `—`                                    |
| `131526822992` | High     | `components/board/MergePostDialog.tsx:55`             | 6    | Use Map lookup and keep fallback                    | `bedaf0ea-a409-4255-94cd-f68563698037` |
| `131526823061` | High     | `components/board/MergePostDialog.tsx:55`             | 6    | Use Map lookup and keep fallback                    | `—`                                    |
| `131526823017` | High     | `components/board/MergePostDialog.tsx:66`             | 6    | Use Map lookup and keep fallback                    | `—`                                    |
| `131526823100` | High     | `components/board/MergePostDialog.tsx:66`             | 6    | Use Map lookup and keep fallback                    | `1c6b9413-65f4-4faf-9687-159d8c3503f2` |
