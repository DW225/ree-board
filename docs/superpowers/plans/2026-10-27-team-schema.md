# Team Schema Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for this single schema task.

**Goal:** Add the approved team data model without changing board access.

**Architecture:** Add `team`, `team_member`, and `team_invitation` in the existing Drizzle schema. Add nullable `board.teamId`. Keep direct board membership and all authorization queries unchanged.

**Tech Stack:** TypeScript, Drizzle ORM, Turso SQLite, Jest.

**Spec:** The team schema approved in this chat on 2026-10-27, with the user's explicit decision to defer the visibility/team-ID constraint until the forms can select a team.

## Global Constraints

- Rebase onto current `origin/master` before implementation; preserve existing edits.
- Do not generate or apply migrations, or add migration tests.
- Keep existing Team/Private form behavior and access checks unchanged.
- Use Nano IDs supplied by callers, foreign keys, indexes, and Drizzle relations.
- Keep team roles `owner` and `member` in `lib/constants/team.ts`.
- Defer team services, invitations by email, last-owner transaction guards, and inherited access to the team feature.
- Keep team access changes and migration application outside this PR.

## Review Focus

- Team membership must not grant board access yet.
- Current boards must work with `teamId: null`, including Team labels.
- Team deletion must not delete attached boards.
- Duplicate memberships, duplicate invitations, and invalid team roles must be rejected.
- Invitation hashes must be unique; emails must use a consistent normalized form.

### Task 1: Add the schema and keep board callers compatible

**Files:**

- Create `lib/constants/team.ts` and `db/schema.test.ts`.
- Modify `db/schema.ts` and the two board query projections in `lib/db/board.ts`.
- Add `teamId: null` to board objects in `components/home/CreateBoardModal.tsx`, `lib/signal/boardSignals.test.ts`, and `tests/e2e/mock/editor.tsx`.
- Add `teamId: null` to saved-board responses in `tests/e2e/board-settings.spec.ts`.
- Update the isolated board-action test table with nullable `team_id`.

**Interfaces:** Existing `Board` types infer the nullable team ID from the schema. New exports are `teamTable`, `teamMemberTable`, `teamInvitationTable`, and their Drizzle relations.

- [x] Check the baseline suite after the rebase.
- [x] Add a failing schema test using a fresh temporary SQLite database populated from the actual Drizzle schema; do not use migration files.
- [x] Add the three tables, role list, board foreign key, and relations. Use `restrict` for board-to-team deletion, `cascade` for team memberships/invitations, and `set null` for invitation creators.
- [x] Add the field to board read results and fixtures. Keep action input handling and membership-based access unchanged.
- [x] Verify storage defaults, role validation, uniqueness, foreign keys, deletion behavior, relations, and unchanged board access.
- [x] Run `pnpm lint`, `npx tsc --noEmit`, and `pnpm test --runInBand`.
- [x] Get database review and inspect the final diff. Confirm that `drizzle/` is unchanged.

## Results

- Rebased onto `origin/master` at `af8904f` before implementation.
- Schema tests failed on missing team tables/column before implementation, then passed.
- Lint and TypeScript passed; Jest passed 42 suites / 510 tests.
- All 6 Chromium board-settings checks passed after installing the browser required by the rebased Playwright version.
- Database review found no actionable defect. Added checks cover relations, inviter deletion, and unchanged board access.
- No migration was generated or applied during implementation. Generate and apply the migration before using this schema with an existing application database.

## Deferred: Drizzle foreign-key actions (2026-11-03)

- The user generated `0009_salty_satana.sql`. Keep the generated migration and schema unchanged for now.
- Its new `board.team_id` reference omits `ON DELETE RESTRICT`, although the schema and snapshot specify it. This matches [Drizzle issue #5619](https://github.com/drizzle-team/drizzle-orm/issues/5619), observed here with `drizzle-kit 0.31.11` and `drizzle-orm 0.45.4`.
- With foreign keys enabled, the generated default `NO ACTION` blocks ordinary team deletion while boards reference the team. It does not delete those boards. Its enforcement timing differs from `RESTRICT` ([SQLite documentation](https://sqlite.org/foreignkeys.html#fk_actions)).
- The user accepts deleting a team's boards with that team as a possible future behavior (`CASCADE`). This is not enabled by the current migration. Revisit the deletion policy and generator fix when this work resumes.
- Defer the fix. Do not manually edit or regenerate the migration, upgrade Drizzle, or apply migrations as part of this note.

## PR scope confirmation (2026-11-03)

- Complete: persist board title, description, and visibility from Edit Board in grid and list views.
- Complete: private defaults for existing boards through the generated migration and for new boards; shared visibility/role constants; creation visibility controls; visibility filtering and reset.
- Complete: remove the deferred template controls and update the create/edit modal and filter designs in `docs/design.pen`.
- Complete: add the agreed team schema, relations, indexes, and constraints while keeping board access unchanged; include the user-generated migration, snapshot, and journal.
- Deferred: team management and inherited access, required team selection, the Drizzle foreign-key action issue, and migration application. Description entry during board creation remains outside issue #829; description editing is available through Edit Board.
- Rebased onto `origin/master` at `034f99f`. Fresh lint, TypeScript, 42 Jest suites / 510 tests, and all 6 Chromium board-settings checks passed. The Pen content matches the previously verified design.
