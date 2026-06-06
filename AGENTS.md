# AGENTS.md

## Project

ree-board is a collaborative retrospective board application.

## Tech Stack

- Frontend: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS
- Backend: Next.js server actions with Drizzle ORM
- Database: Turso SQLite; local database file is `test.db`
- Auth: Supabase Auth with RBAC
- Real-time: Ably
- State: Preact Signals
- UI: Radix UI and Shadcn/ui components
- Testing: Jest with ts-jest

## Commands

- `pnpm dev`: start the Next.js dev server
- `pnpm dev:sql`: start the local Turso database
- `pnpm test`: run Jest tests
- `pnpm lint`: run ESLint
- `npx tsc --noEmit`: run the TypeScript project check
- `pnpm generate`: generate Drizzle migrations
- `pnpm push:dev`: push schema to the local development database
- `pnpm push`: push schema to the configured production database

## Required Checks

- Run `pnpm lint` after TypeScript or React edits.
- Run `npx tsc --noEmit` after TypeScript edits.
- Run the most specific Jest test for changed testable behavior.
- Run `pnpm test` when shared logic, security, database, realtime, or auth behavior changes.

## Security Rules

- Never create or modify server actions without `actionWithAuth` or `rbacWithAuth`.
- Guests are read-only and must not perform mutations.
- Validate untrusted input with Zod before use.
- Validate Ably message payloads before processing.
- Never expose server-only secrets through `NEXT_PUBLIC_*`.
- Avoid `dangerouslySetInnerHTML`; sanitize markdown with `rehype-sanitize`.

## Implementation Rules

- Prefer `interface` for object shapes and `type` for unions or utilities.
- Do not use `any`; use `unknown` or explicit types.
- Use early returns instead of deeply nested conditionals.
- Use `import type` for type-only imports.
- All interactive UI must cover loading, error, empty, and success states.
- Mutations must disable repeated submission, show progress, handle errors visibly, and confirm success.

## Database Rules

- Use Nano IDs for table primary keys.
- Index foreign keys and frequently filtered columns.
- Define Drizzle relations for foreign keys.
- Use prepared statements for repeated queries.
- Use transactions for multi-table writes.
- Review generated SQL before pushing migrations.

## Realtime Rules

- Use `board:{boardId}` for board channel names.
- Validate every inbound message with Zod.
- Drop stale messages older than 30 seconds unless a feature explicitly documents a different threshold.
- Keep optimistic UI updates reconciled with server state.

## Skills

Use repo skills from `.agents/skills` when work matches their descriptions:

- `nextjs-app-router`
- `drizzle-patterns`
- `rbac-security`
- `ably-realtime`
- `signal-state-management`
- `testing-patterns`

## Reviewer Agents

Use specialized review for:

- Security-sensitive changes in `lib/actions`, `lib/realtime`, auth flows, and server components.
- Database changes in `db/schema.ts`, `lib/db`, and `drizzle`.

## Git

- Branch names follow Conventional Branch: `<type>/<description>`.
- Use `feature/` or `feat/` for new features, `fix/` for bug fixes, `hotfix/` for urgent fixes, `release/` for release preparation, and `chore/` for non-code tasks.
- Commits use Conventional Commits.
- Do not overwrite unrelated user changes.
