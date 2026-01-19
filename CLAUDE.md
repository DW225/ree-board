# CLAUDE.md

Project memory for Claude Code working on **ree-board** - A collaborative retrospective board application.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js server actions with Drizzle ORM
- **Database**: Turso SQLite (local: `file:test.db`, production: Turso Cloud)
- **Auth**: Supabase Auth with RBAC
- **Real-time**: Ably for live collaboration
- **State**: Preact Signals for reactive state
- **UI**: Radix UI + Shadcn/ui components
- **Testing**: Jest with ts-jest

## Essential Commands

```bash
# Development
pnpm dev           # Start Next.js dev server
pnpm dev:sql       # Start local Turso database
pnpm test          # Run Jest tests
pnpm lint          # Run ESLint

# Database
pnpm generate      # Generate Drizzle migrations
pnpm push:dev      # Push schema to local DB
pnpm push          # Push schema to production DB

# Analysis
pnpm build:analyze # Bundle analysis
```

## Key Directories

```
app/                          # Next.js App Router (pages, layouts, routes)
components/
  ├── board/                  # Board-specific components with real-time
  ├── common/                 # Shared components (AuthProvider, NavBar)
  └── ui/                     # Shadcn/ui base components
db/
  └── schema.ts               # Database schema (Drizzle ORM)
lib/
  ├── actions/                # Server actions by entity (with auth wrappers)
  ├── db/                     # Database operations (prepared statements)
  ├── signal/                 # Preact Signals state management
  ├── realtime/               # Ably message processors
  └── types/                  # TypeScript type definitions
.claude/
  ├── skills/                 # Domain knowledge (Next.js, Drizzle, security, etc.)
  ├── agents/                 # Code reviewers (security, database)
  └── hooks/                  # Automation (linting, type-checking, tests)
```

## Code Standards

### TypeScript

- Strict mode enabled
- Prefer `interface` over `type` for object shapes
- Use `type` for unions, intersections, utilities
- Never use `any` - use `unknown` or proper types

### Code Style

- Use early returns, avoid nested conditionals
- Prefer composition over inheritance
- Functional patterns where appropriate
- Import types with `import type { ... }`

### Git Conventions

**Branches**: `{initials}/{type}-{description}`
- Examples: `jd/feat-dark-mode`, `sm/fix-vote-bug`

**Commits**: Conventional Commits format
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactor (no behavior change)
- `docs:` - Documentation
- `test:` - Test changes
- `chore:` - Build/tooling changes

## 🔐 CRITICAL: Security Rules

### Server Actions MUST Use Auth Wrappers

**NEVER write server actions without authentication:**

```typescript
// ❌ WRONG - Security vulnerability
export async function deletePost(postId: string) {
  await db.delete(postTable).where(eq(postTable.id, postId));
}

// ✅ CORRECT - Authentication enforced
export const deletePost = async (postId: string, boardId: string) =>
  rbacWithAuth(boardId, async (userId, role) => {
    // Authenticated user with verified role
    await db.delete(postTable).where(eq(postTable.id, postId));
  });
```

### Role Hierarchy

- **owner**: Full control (delete board, manage members)
- **member**: Create/edit posts, vote, manage own content
- **guest**: Read-only (NO mutations allowed)

### Input Validation

Validate all user input, especially:
- Real-time messages (Ably) - use Zod schemas
- Form data - validate before processing
- API parameters - never trust client input

## 💻 Critical Implementation Patterns

### 1. Error Handling

**Never fail silently** - Always provide user feedback:

```typescript
// ✅ CORRECT
try {
  await submitAction();
  toast.success('Saved successfully');
} catch (error) {
  toast.error('Failed to save');
  console.error(error);
}

// ❌ WRONG
try {
  await submitAction();
} catch (error) {
  // Silent failure - user doesn't know it failed
}
```

### 2. UI States

All interactive UI must handle:
- **Loading**: Show spinner/skeleton while processing
- **Error**: Display error message with retry option
- **Empty**: Show empty state with call-to-action
- **Success**: Confirm operation completed

```typescript
// ✅ CORRECT - All states handled
{isLoading && <Spinner />}
{error && <ErrorMessage error={error} onRetry={retry} />}
{!isLoading && !error && data.length === 0 && <EmptyState />}
{!isLoading && !error && data.map(...)}
```

### 3. Mutations (Form Submissions, Actions)

Every mutation must have:
- Disabled button during processing
- Loading indicator
- Error handling with user-visible message
- Success confirmation

```typescript
// ✅ CORRECT
const [isPending, startTransition] = useTransition();

const handleSubmit = async () => {
  startTransition(async () => {
    try {
      await createPost(data);
      toast.success('Post created');
    } catch (error) {
      toast.error('Failed to create post');
    }
  });
};

return <Button disabled={isPending} onClick={handleSubmit}>
  {isPending ? 'Creating...' : 'Create Post'}
</Button>;
```

## Database Patterns

### Schema Design (db/schema.ts)

- **Primary Keys**: Nano IDs for all tables
- **Foreign Keys**: Index all foreign keys
- **Relationships**: Define with Drizzle relations
- **Timestamps**: Use `integer('created_at', { mode: 'timestamp' })`
- **Enums**: Use SQLite text with TypeScript enum types

### Query Optimization

```typescript
// ✅ Use prepared statements for repeated queries
const prepareGetPosts = db
  .select()
  .from(postTable)
  .where(eq(postTable.boardId, sql.placeholder('boardId')))
  .prepare();

// ✅ Select only needed columns
const posts = await db.select({
  id: postTable.id,
  content: postTable.content
}).from(postTable);

// ✅ Use transactions for multi-table operations
await db.transaction(async (tx) => {
  await tx.insert(boardTable).values(board);
  await tx.insert(memberTable).values(member);
});
```

### Migration Workflow

1. Modify `db/schema.ts`
2. `pnpm generate` - Generate migration
3. Review SQL in `drizzle/` folder
4. `pnpm push:dev` - Test locally
5. Verify changes work
6. `pnpm push` - Deploy to production

## Testing Strategy

### Test What Matters

- **Test behavior, not implementation**
- Use factory patterns for test data
- Mock external dependencies (Supabase, Ably, DB)
- Use fake timers for time-dependent tests

```typescript
// ✅ CORRECT - Tests behavior
it('filters posts by type', () => {
  const filtered = filterPosts(posts, 'went_well');
  expect(filtered.every(p => p.type === 'went_well')).toBe(true);
});

// ❌ WRONG - Tests implementation
it('uses Array.filter', () => {
  const spy = jest.spyOn(Array.prototype, 'filter');
  filterPosts(posts, 'went_well');
  expect(spy).toHaveBeenCalled();
});
```

## 🎯 Skill Activation

Before starting work, check if these skills apply:

- **nextjs-app-router** - Server/client components, server actions, routing
- **drizzle-patterns** - Database schema, queries, migrations
- **rbac-security** - Authentication, authorization, validation (CRITICAL for server actions)
- **ably-realtime** - Real-time messaging, channels, message validation
- **signal-state-management** - Preact Signals, reactive state
- **testing-patterns** - Jest tests, mocking, test organization

Skills are in `.claude/skills/` - Claude will auto-activate based on context.

## 🤖 Code Reviewers

Specialized agents automatically review code:

- **security-reviewer** - Checks auth, RBAC, input validation (activates on `lib/actions/` edits)
- **database-reviewer** - Reviews schema, indexes, migrations (activates on `db/schema.ts` edits)

## Common Operations

### Create New Server Action

```typescript
// lib/actions/entity/myAction.ts
'use server';

import { rbacWithAuth } from '@/lib/actions/actionWithAuth';
import { z } from 'zod';

const InputSchema = z.object({
  // Define validation
});

export const myAction = async (data: unknown) =>
  rbacWithAuth(data.boardId, async (userId, role) => {
    const validated = InputSchema.parse(data);
    // Perform operation
    return result;
  });
```

### Add Real-time Feature

```typescript
'use client';

import { useChannel } from 'ably/react';

export function MyComponent({ boardId }) {
  useChannel(`board:${boardId}`, (message) => {
    // Validate message
    const validated = MessageSchema.safeParse(message.data);
    if (!validated.success) return;

    // Check staleness (30s threshold)
    if (Date.now() - validated.data.timestamp > 30000) return;

    // Process message
    handleMessage(validated.data);
  });
}
```

### Update Database Schema

```bash
# 1. Edit db/schema.ts
# 2. Generate migration
pnpm generate

# 3. Review generated SQL in drizzle/

# 4. Test locally
pnpm push:dev

# 5. Verify changes work

# 6. Deploy to production
pnpm push
```

## Key Files Reference

- `db/schema.ts` - Database schema with all tables and relationships
- `lib/actions/actionWithAuth.ts` - Auth wrappers (MUST use for server actions)
- `lib/signal/` - Signal-based state management by domain
- `lib/realtime/messageProcessors.ts` - Real-time message validation
- `components/board/PostProvider.tsx` - Real-time collaboration setup
- `.claude/skills/` - Domain knowledge and patterns
- `.claude/agents/` - Automated code reviewers

## Environment Variables

```bash
# Database
TURSO_DATABASE_URL=<TURSO_DATABASE_URL>
TURSO_AUTH_TOKEN=<TURSO_AUTH_TOKEN>

# Authentication (Supabase)
NEXT_PUBLIC_SUPABASE_URL=<NEXT_PUBLIC_SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SUPABASE_SERVICE_ROLE_KEY>

# Real-time
ABLY_API_KEY=<ABLY_API_KEY>

# Monitoring
SENTRY_TOKEN=<SENTRY_TOKEN>
```

## Troubleshooting

**Database Issues**: `pnpm dev:sql` then `pnpm push:dev`
**Type Errors**: `npx tsc --noEmit` to see all errors
**Build Fails**: `rm -rf .next && pnpm build`
**Tests Fail**: Check mocks in `jest.setup.js`

---

**For detailed patterns**: See `.claude/skills/` directory
**For security/database reviews**: Agents auto-activate on relevant file edits
**For automation**: Hooks run automatically (linting, type-checking, tests)
