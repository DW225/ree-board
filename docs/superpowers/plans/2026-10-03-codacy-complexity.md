# Codacy Complexity Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan one task at a time. Use the specialized reviewers required by `AGENTS.md` for security or database changes. Checkboxes record implementation progress, not work completed during this review.

**Goal:** Reduce avoidable code complexity and reach the existing Codacy goal of at most 10% complex files without changing application behavior.

**Architecture:** First remove unused code. Then reuse existing operations and remove repeated validation and rendering work. Keep the current signal stores, public processor functions, server actions, and UI contracts.

**Tech Stack:** Next.js 16, React 19, TypeScript, Preact Signals, Zod, Jest, Playwright, Codacy Cloud.

**Spec:** The user requested remote synchronization, local development branch cleanup, and a plan to address the Codacy complexity metric. This document covers the metric work. `AGENTS.md` supplies the project constraints.

## Verified baseline

Reviewed on 2026-10-03 against `master` at `382be8045db0ea1f797797d50f1871524183638b`.

- `git fetch --all --prune` completed. `git merge --ff-only origin/master` reported that the checkout was already up to date. Only local `master` and the primary worktree remained. No development branch required deletion.
- Codacy analyzed the same commit. Analysis ended at **2026-10-03 06:39:16 UTC**.
- The dashboard reports **15% complex files**. The goal is **10%**. A file is complex when its score is **greater than 20**; a score of 20 is within the limit.
- The filename search returned 324 files. The root directory counts include 325 files. The remaining file, `scripts/e2e/Dockerfile`, has no complexity value. The search returned 252 files with numeric complexity values and **51 files above 20**.
- Of those 51 files, **30 are application files, 17 are tests, and 4 are tools**. The full inventory is below.
- The `CodeComplexity` issue query returned no issues. This does not mean that the complexity metric passes. Metric values and rule alerts are separate results.
- Codacy reports coverage as `Stopped`; its last commit with coverage is `9b7745debcec29a438a5dbb005696a92ef5ff44c`. Current per-file coverage was absent. Do not treat absent coverage as zero or use it to claim a tested baseline.
- This review used source inspection and caller searches. It did not run application tests or change code, Codacy settings, or remote findings.

Codacy sums the cyclomatic complexity of the methods in each file. Its dashboard reports the percentage of complex files. Therefore, moving code into several files can change the dashboard without removing decisions. Track the absolute complex-file count and the scores of all changed files as well as the percentage. See [Codacy metric definitions](https://docs.codacy.com/faq/code-analysis/which-metrics-does-codacy-calculate/) and [quality goals](https://docs.codacy.com/repositories-configure/adjusting-quality-goals/).

At an unchanged total of 325 files, at least **19** of the 51 complex files must move below the threshold to reach 10%. Deletions and new files change that calculation. The first tasks below will not by themselves prove that the goal is met; Task 6 measures the remaining work.

## Global constraints

- Scan files before reading them. The user explicitly allowed the known `AuthCard.tsx:113` false alert in this session. This exception does not disable secret scanning for other alerts.
- Use a `refactor/` branch for the later code work. Keep unrelated changes. Use Conventional Commits.
- Add no dependency, generic state framework, event framework, or configuration option.
- Keep Zod checks at trust boundaries, server authorization, guest read-only behavior, and the 30,000 ms stale-message threshold.
- Keep loading, error, empty, and success states. Keep repeat-submit prevention, request cancellation, rollback, and keyboard access.
- Keep the threshold at 20 and the goal at 10%. Do not exclude tests, change analyzer scope, or add files merely to improve the percentage.
- Preserve useful tests. A test file can have a high aggregate score because it contains many independent cases. Do not remove a case because of its score.
- For changed TypeScript, run `pnpm lint` and `npx tsc --noEmit`. Run the focused Jest tests. Run `pnpm test --runInBand` for shared state, realtime, auth, security, or database changes.
- Use the isolated local E2E setup in `tests/e2e/README.md`: Node 24+, Docker 29+, a clean worktree without Next `.env` files, and a separate browser context. Never use production services.

## Review focus

1. Used aliases and internal computed-signal dependencies must survive dead-code removal — Task 1.
2. A task update must retain its ID, creation time, and fields that the operation does not change — Task 2.
3. Invalid JSON, invalid payloads, own votes, and messages at the stale boundary must retain their behavior — Task 3.
4. An old import request must not replace the current selection; only server-confirmed members enter state — Task 4.
5. Board simplification must retain post order, read-only controls, drag cleanup, and failed-edit recovery — Task 5.

## Task 1: Remove code with no callers

**Modify:** `lib/signal/memberSignals.ts`, `lib/signal/postSignals.ts`.
**Delete:** `components/board/MagicLink/MagicLinkCreator.tsx` after the final reference check.
**Interfaces:** Keep `membersSignal`, `initializeMemberSignals`, `addMember`, `removeMember`, `memberSignalInitial`, and `memberSignal`. Keep the identity of every live signal.

- [x] Repeat the reference search on the implementation commit, including dynamic imports, scripts, and E2E fixtures. Inspect internal dependencies as well as external references. The current search covered TypeScript and JavaScript under `app`, `components`, `lib`, `hooks`, `tests`, and `scripts`.
- [x] Remove the unused member feature group: `memberSortCriteriaSignal`, `memberFilterSignal`, `memberRoleFilterSignal`, `filteredMembersSignal`, `sortedMembersSignal`, `memberStatsSignal`, `membersByRoleSignal`, `updateMember`, `updateMemberRole`, `updateMemberUsername`, `updateMemberEmail`, `addMultipleMembers`, `removeMultipleMembers`, `sortMembers`, `filterMembers`, `filterMembersByRole`, `getMemberById`, `getMembersByRole`, `getOwners`, `getRegularMembers`, and `getGuests`. Remove the imports used only by this group.
- [x] Remove `postsByTypeSignal` and `updatePostVoteCount`, which have no callers. Keep `sortCriteriaSignal` and `enrichedPostsSignal`: `sortedPostsSignal` uses them internally.
- [x] Remove `MagicLinkCreator.tsx`, which has no caller in the inspected code. The application uses `LinkButton.tsx`. Keep `MagicLinkManager.tsx`: the expiration fixture still uses it and has specific behavior tests.
- [x] Run `pnpm test --runInBand --runTestsByPath lib/signal/postSignals.test.ts components/board/LocalPostChannel.test.tsx components/board/PostProvider.test.tsx`, then the global TypeScript and full Jest checks. All must pass. The added member-state test checks initialization, addition, removal, and both alias consumers.
- [x] Commit as `refactor: remove unused board state and invite UI`.

**Verification:** 36 Jest suites / 392 tests passed, including the new alias/state check; lint and TypeScript passed. The member-state check failed on a temporary split-alias mutation.

**Expected result:** The member signal file should fall below 20 and one complex UI file should disappear. Confirm both results with Codacy; this is a forecast, not a measured result.

## Task 2: Reuse task creation in post state

**Modify:** `lib/signal/postSignals.ts`, `lib/signal/postSignals.test.ts`.
**Interfaces:** Preserve `assignTask(postId: Post["id"], userId: Task["userId"], boardId?: string)` and `updatePostState(postId: Post["id"], state: Task["state"], boardId?: string)`. Reuse `addPostTask(task: NewTask)`.

- [x] Add a compact table of behavior cases through the two public operations: update an existing task, create a missing task for an existing post, and reject a missing post. Assert retained task ID, creation time, unchanged state/assignee, board-ID fallback, and the visible failure message. Run these characterization cases before editing and confirm that they pass.
- [x] Keep the existing-task update and its `updatedAt` change. For the missing-task path, keep the post lookup and error return, then call `addPostTask` with the generated ID and the requested fields. Remove the two copied task-construction and record-assignment blocks. Keep the current board-ID fallback semantics and different error messages.
- [x] Run `pnpm test --runInBand --runTestsByPath lib/signal/postSignals.test.ts components/board/Post/AssignTaskDialog.test.tsx components/board/PostChannelComponent.test.ts`, then the global TypeScript and full Jest checks.
- [x] Retain the existing duplicate-create and merge/rollback tests. Do not change merge concurrency behavior in this cleanup. In particular, rollback currently restores complete task and vote maps; review any change to that behavior as a separate defect fix.
- [x] Commit as `refactor: reuse post task initialization`.

**Expected result:** Fewer repeated branches in the highest-scoring file, with no new helper framework or signal store.

## Task 3: Remove repeated realtime validation work

**Modify:** `lib/realtime/messageProcessors.ts`, `lib/realtime/__tests__/messageProcessors.test.ts`.
**Reuse:** `lib/realtime/types.ts`, `components/board/PostChannelComponent.tsx`.
**Interfaces:** Preserve `processPostMessage`, `processTaskMessage`, `createMessageProcessor`, `createPostMessageProcessor`, and `createTaskMessageProcessor` with their existing signatures.

- [x] Extend the existing test file through the public factory functions. Cover both JSON strings and objects, malformed JSON, arrays/null, schema failure, default vote count, unknown events, and a handler failure. Assert dispatch or absence of a state update, not only `not.toThrow()`.
- [x] Add the missing merge event and `updatePost` mock to the test setup. Check a valid merge, an invalid embedded post, and timestamps at 30,000 and 30,001 ms. Retain the existing own-vote and vote-age cases. These cases must pass before the refactor; investigate an existing failure separately.
- [x] Replace the four copied Zod error-formatting bodies with one private `validateMessage<T>(schema: z.ZodType<T>, rawData: unknown, label: string): ValidationResult<T>`. Keep schema selection and the existing error labels at the call sites. Use the parsed output, including defaults.
- [x] Remove the second full-post parse in ADD and MERGE after the complete schema has already succeeded. Keep the full schema at each incoming-data boundary; do not replace it with a cast.
- [x] In task processing, recognize supported events, then perform the common task validation once. Retain the distinct CREATE fields, null-assignee handling, valid state value `0`, and unknown-event warning.
- [x] Run `pnpm test --runInBand --runTestsByPath lib/realtime/__tests__/messageProcessors.test.ts components/board/PostChannelComponent.test.ts`, then the global TypeScript and full Jest checks. Obtain the security review required for realtime changes.
- [x] Commit as `refactor: remove repeated realtime validation`.

**Expected result:** Lower aggregate complexity and less duplicate code. Keep the existing event switch unless measurement and readability justify another change.

## Task 4: Simplify member import presentation

**Modify:** `components/board/ImportMembersComponent.tsx`.
**Reuse tests:** `tests/e2e/review-state.spec.ts`, `lib/actions/member/action.test.ts`.
**Interfaces:** Preserve `ImportMembersProps`, all three member server-action calls, the request counter, and the returned-member reconciliation.

- [x] Run the existing import browser cases before editing. They already cover zero/partial saved members and stale success/failure after close and reopen. Extend those cases only for a missing contract: owner-to-member request mapping, selection clearing on a new source board, and loading/empty display.
- [x] Reuse `roleDisplayName` from `lib/constants/role.ts` for the role label, retaining lowercase text and the unknown-role fallback. Replace the style switch with a local `Map<Role, string>` and the existing guest-style fallback. Keep full Tailwind classes as literals.
- [x] Replace the three separate member-list rendering guards with one loading/empty/list branch. Keep the same buttons, labels, disabled states, and selection updates. Keep the request counter checks in success, error, and finalization paths.
- [x] Run `pnpm test:e2e:mock tests/e2e/review-state.spec.ts --grep 'member'` and `pnpm test --runInBand --runTestsByPath lib/actions/member/action.test.ts`, plus lint and TypeScript. Do not report the mock fixture as proof of real authorization.
- [x] Commit as `refactor: simplify member import presentation`.

**Expected result:** Remove repeated display decisions in the 68-point component. Do not split the workflow into several files solely to cross the threshold. Measure this small pass before deciding on a larger change.

**Verification through Task 4:** Task updates retained IDs and dates (25 focused tests; 402 full Jest tests). Realtime processing passed 51 focused tests, 420 full Jest tests, and a specialized security review. Member import passed 15 browser checks across Chromium, Firefox, and WebKit, plus 20 member-action tests. Lint and TypeScript passed for each task. Deliberate task-ID, stale-boundary, and owner-role mutations were detected and restored.

## Task 5: Remove the redundant board render model

**Modify:** `components/board/BoardColumn.tsx`.
**Reuse tests:** `tests/e2e/tailwind-v4.spec.ts`, `components/board/PostProvider.test.tsx`.
**Interfaces:** Preserve `BoardColumnProps` and the `PostCard` callbacks.

- [x] Run the existing board mock tests before editing. They cover read-only and empty states, edit failure/retry, dragging after a vote update, and merge preview. Add a post-order assertion to an existing case if it is not already present.
- [x] Remove `AnimatedPost`, `animatedPosts`, and the second per-item search in `filteredPosts`. Every derived row has `isRemoving: false`, and no code changes it. Render `filteredPosts.value` directly with the same keys, wrapper animation classes, and callbacks. This also removes the repeated linear search.
- [x] Keep the lazy drop-target setup, cancellation flag, cleanup, board check, and failure handling. These branches control real behavior and are not deletion targets.
- [x] Run `pnpm test:e2e:mock tests/e2e/tailwind-v4.spec.ts`, `pnpm test --runInBand --runTestsByPath components/board/PostProvider.test.tsx`, lint, and TypeScript. If required reference images are absent, use the documented baseline download procedure.
- [x] Commit as `refactor: render board posts directly`.

**Verification for Task 5:** The unchanged and refactored board browser suites each passed 44 checks with 16 intended skips. All 36 reference images matched. The new post-order assertion passed in all three browsers and detected a temporary reversal. Provider tests (15), lint, and TypeScript passed.

## Task 6: Measure the first pass and choose the next batch

**Update:** This plan with the new analyzed SHA and before/after values.

- [ ] Run the full Jest checks and `pnpm test:e2e:local --slot 0` on the combined implementation. Confirm the local merge/persistence and two-session collaboration flows. Report any service checks that remain unavailable.
- [ ] Obtain Codacy results for the implementation branch or PR after its analysis completes. Verify its analyzed SHA before comparing it with this baseline. Use `codacy repository --output json` for the default-branch snapshot and `codacy ls --path . --search . --branch <branch> --sort complexity --direction desc --output json` for the file list. Check extensionless files separately.
- [ ] Record dashboard percentage, absolute count above 20, deleted complex files, and the summed scores across every changed source file. Keep tests and tools in the inventory. Do not claim a score reduction from lint alone.
- [ ] Continue with application files from the inventory while the goal remains unmet. Inspect `MergePostDialog.tsx` (48), `LinkButton.tsx` (43), `PostCard.tsx` (40), `useMagicLinks.ts` (38), and `boardSignals.ts` (36) next. Give each batch a concrete caller map, behavior checks, and measured result before selecting the following batch.
- [ ] Review `MagicLinkManager.tsx` separately: it has no application caller but has live expiration tests in the mock editor. Replace that fixture with coverage of the active `LinkButton` flow before proposing removal. Retain expiry and open-dialog contracts; do not delete tests just to delete the component.
- [ ] Keep auth, guest actions, database files, and local service tools for separate small batches with the required specialized review. Keep their input checks, authorization, transaction, and isolation behavior. A high file score alone is not evidence of a defect.
- [ ] Review complex test files only for repeated setup or branching that hides their assertions. Use `it.each`/`test.each` for equivalent cases where useful. Keep independent scenarios and their failure checks. Do not promise that every useful test file will fall below 20.
- [ ] Close this work only when Codacy reports at most 10% at the verified final commit and the behavior checks pass. If the remaining score comes from valid independent cases, present that evidence before proposing a separate metric-policy decision. Do not relax the goal silently.

## Complete inventory above 20

The scores below are Codacy file totals at the baseline SHA. They are not per-function scores. Only the first-pass files and the direct supporting flows listed above received detailed source inspection; the rest form the measured backlog.

| File                                               | Score | Kind        |
| -------------------------------------------------- | ----: | ----------- |
| `lib/signal/postSignals.ts`                        |    82 | Application |
| `components/board/ImportMembersComponent.tsx`      |    68 | Application |
| `lib/realtime/messageProcessors.ts`                |    68 | Application |
| `tests/e2e/tailwind-v4.spec.ts`                    |    65 | Test        |
| `lib/signal/memberSignals.ts`                      |    53 | Application |
| `lib/realtime/__tests__/messageProcessors.test.ts` |    51 | Test        |
| `components/board/MergePostDialog.tsx`             |    48 | Application |
| `scripts/e2e/realtime.mjs`                         |    46 | Tool        |
| `components/board/Post/AssignTaskDialog.test.tsx`  |    44 | Test        |
| `lib/actions/guest/action.ts`                      |    44 | Application |
| `components/board/BoardColumn.tsx`                 |    43 | Application |
| `components/board/MagicLink/LinkButton.tsx`        |    43 | Application |
| `lib/utils/__tests__/redirect.test.ts`             |    43 | Test        |
| `lib/actions/task/action.test.ts`                  |    41 | Test        |
| `lib/utils/logger.ts`                              |    41 | Application |
| `components/board/Post/PostCard.tsx`               |    40 | Application |
| `scripts/e2e/isolated.mjs`                         |    40 | Tool        |
| `hooks/useMagicLinks.ts`                           |    38 | Application |
| `components/board/PostProvider.test.tsx`           |    38 | Test        |
| `components/guest/UpgradeAccountDialog.tsx`        |    38 | Application |
| `lib/signal/boardSignals.ts`                       |    36 | Application |
| `components/home/EditBoardDialog.tsx`              |    35 | Application |
| `lib/config/localE2e.ts`                           |    34 | Application |
| `components/landing/auth/useAuthForm.ts`           |    33 | Application |
| `components/landing/AuthCard.tsx`                  |    33 | Application |
| `lib/config/localE2e.test.ts`                      |    32 | Test        |
| `components/board/MemberManageModalComponent.tsx`  |    31 | Application |
| `lib/actions/member/action.test.ts`                |    30 | Test        |
| `lib/actions/vote/action.test.ts`                  |    30 | Test        |
| `scripts/e2e/env.check.mjs`                        |    29 | Test        |
| `app/invite/[token]/page.test.tsx`                 |    28 | Test        |
| `lib/db/link.ts`                                   |    28 | Application |
| `lib/db/post.ts`                                   |    28 | Application |
| `components/profile/SecurityCard.tsx`              |    27 | Application |
| `components/board/MagicLink/MagicLinkCreator.tsx`  |    27 | Application |
| `lib/db/client.test.ts`                            |    27 | Test        |
| `tests/e2e/vote-flow.spec.ts`                      |    26 | Test        |
| `components/home/CreateBoardModal.tsx`             |    26 | Application |
| `lib/actions/post/action.test.ts`                  |    25 | Test        |
| `lib/actions/post/action.ts`                       |    25 | Application |
| `components/board/MemberList.tsx`                  |    25 | Application |
| `components/board/MagicLink/MagicLinkManager.tsx`  |    25 | Application |
| `components/board/Post/PostHeader.tsx`             |    25 | Application |
| `components/board/LocalPostChannel.test.tsx`       |    25 | Test        |
| `scripts/bundle-analysis.js`                       |    23 | Tool        |
| `scripts/test-guest-cleanup.ts`                    |    22 | Tool        |
| `components/board/Post/PostFooter.tsx`             |    22 | Application |
| `lib/utils/supabase/__tests__/clients.test.ts`     |    21 | Test        |
| `tests/e2e/local/journey.spec.ts`                  |    21 | Test        |
| `components/guest/GuestBanner.tsx`                 |    21 | Application |
| `components/board/Post/AssignTaskDialog.tsx`       |    21 | Application |
