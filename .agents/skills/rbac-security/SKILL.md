---
name: rbac-security
description: Role-based access control (RBAC) patterns, authentication wrappers, authorization checks, input validation with Zod schemas, security boundaries, server action security, real-time message validation, preventing common vulnerabilities like XSS and SQL injection, and security best practices for ree-board project
---

# RBAC Security Patterns

## When to Use This Skill

**CRITICAL:** This skill is MANDATORY for all server actions and database operations.

Activate this skill when:

- Creating or modifying server actions
- Implementing authentication flows
- Adding authorization checks
- Validating user input
- Working with real-time messages
- Reviewing code for security vulnerabilities
- Implementing role-based access control

## Core Patterns

### Authentication Wrappers (MANDATORY)

**Rule:** ALL server actions MUST use `actionWithAuth` or `rbacWithAuth`

#### actionWithAuth - Simple Authentication

**Use when:** Only user authentication is needed (no board-specific permissions)

```typescript
// lib/actions/user/updateProfile.ts
"use server";

import { actionWithAuth } from "@/lib/actions/actionWithAuth";

export const updateProfile = async (name: string) =>
  actionWithAuth(async (userId) => {
    // userId is guaranteed to exist
    await db.update(userTable).set({ name }).where(eq(userTable.id, userId));

    return { success: true };
  });
```

#### rbacWithAuth - Role-Based Access Control

**Use when:** Board-specific permissions are required

```typescript
// lib/actions/post/deletePost.ts
"use server";

import { rbacWithAuth } from "@/lib/actions/actionWithAuth";

export const deletePost = async (postId: string, boardId: string) =>
  rbacWithAuth(boardId, async (userId) => {
    // User's role is checked against board
    // Only owner/member can proceed
    await db.delete(postTable).where(eq(postTable.id, postId));

    return { success: true };
  });
```

### Role Hierarchy

**Three Roles with Decreasing Permissions:**

```typescript
import { Role } from "@/lib/constants/role";

// Role is a numeric enum in this repo:
// Role.owner - Full control (delete board, manage members)
// Role.member - Create/edit/delete own posts, vote
// Role.guest - Read-only access
```

**Role Permissions:**

| Action          | Owner | Member | Guest |
| --------------- | ----- | ------ | ----- |
| View board      | ✅    | ✅     | ✅    |
| Create post     | ✅    | ✅     | ❌    |
| Edit own post   | ✅    | ✅     | ❌    |
| Delete own post | ✅    | ✅     | ❌    |
| Vote            | ✅    | ✅     | ❌    |
| Manage members  | ✅    | ❌     | ❌    |
| Delete board    | ✅    | ❌     | ❌    |

**Implementation:**

```typescript
// lib/actions/actionWithAuth.ts
import { Role, hasRequiredRole } from "@/lib/constants/role";

export const rbacWithAuth = async <T>(
  boardId: string,
  callback: (userId: string, role: Role) => Promise<T>,
  minRole: Role = Role.member
): Promise<T> => {
  // Verify session using Supabase
  const session = await verifySession();

  if (!session?.userId) {
    throw new Error("Unauthorized");
  }

  // Check user's role for this board
  const member = await db.query.memberTable.findFirst({
    where: and(
      eq(memberTable.boardId, boardId),
      eq(memberTable.userId, session.userId)
    ),
  });

  if (!member) {
    throw new Error("Access denied");
  }

  if (!hasRequiredRole(member.role, minRole)) {
    throw new Error("Insufficient permissions");
  }

  return callback(session.userId, member.role);
};

export const rbacMemberOnly = async <T>(
  boardId: string,
  callback: (userId: string, role: Role) => Promise<T>
): Promise<T> => rbacWithAuth(boardId, callback, Role.guest);
```

### Input Validation with Zod

**Use Zod for Complex Validation:**

```typescript
import { z } from "zod";

const CreatePostSchema = z.object({
  boardId: z.string().min(1, "Board ID is required"),
  content: z
    .string()
    .min(1, "Content cannot be empty")
    .max(1000, "Content too long"),
  type: z.enum(PostType),
});

export const createPost = async (data: unknown) => {
  // ✅ Validate input
  const validated = CreatePostSchema.parse(data);
  return rbacWithAuth(validated.boardId, async (userId) => {
    const post = await db
      .insert(postTable)
      .values({
        id: nanoid(),
        userId,
        ...validated,
        createdAt: new Date(),
      })
      .returning();

    return post[0];
  });
};
```

### Real-Time Message Validation

**Critical for Ably Messages:**

```typescript
// lib/realtime/messageProcessors.ts
import { processPostMessage } from "@/lib/realtime/messageProcessors";
import { EVENT_TYPE } from "@/lib/utils/ably";

// Repo processors validate payload shape and staleness before updating signals.
processPostMessage(EVENT_TYPE.POST.UPDATE_CONTENT, message.data, currentUserId);
```

### Security Boundaries

**Never Trust Client Input:**

```typescript
// ❌ BAD - Trusts client completely
export const deletePost = async (postId: string) => {
  await db.delete(postTable).where(eq(postTable.id, postId));
};

// ✅ GOOD - Validates ownership
export const deletePost = async (postId: string, boardId: string) =>
  rbacWithAuth(boardId, async (userId) => {
    const post = await db.query.postTable.findFirst({
      where: eq(postTable.id, postId),
    });

    // Verify post exists and user owns it
    if (!post) {
      throw new Error("Post not found");
    }

    if (post.userId !== userId) {
      throw new Error("Cannot delete another user's post");
    }

    await db.delete(postTable).where(eq(postTable.id, postId));
  });
```

### Preventing Common Vulnerabilities

#### XSS Prevention

**Already Handled by React:** React escapes content by default

**For Markdown Content:**

```typescript
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

// ✅ Sanitize user-generated markdown
<ReactMarkdown rehypePlugins={[rehypeSanitize]}>{userContent}</ReactMarkdown>;
```

#### SQL Injection Prevention

**Drizzle ORM Prevents This:**

```typescript
// ✅ Parameterized queries (safe)
await db.select().from(postTable).where(eq(postTable.id, postId));

// ❌ Raw SQL (avoid unless necessary)
await db.execute(sql`SELECT * FROM post WHERE id = ${postId}`);
```

## Anti-Patterns

### ❌ Server Actions Without Authentication

**CRITICAL VULNERABILITY:**

```typescript
"use server";

// ❌ NEVER DO THIS
export async function deleteBoard(id: string) {
  await db.delete(boardTable).where(eq(boardTable.id, id));
}
```

**Correct:**

```typescript
"use server";

// ✅ ALWAYS USE AUTHENTICATION
export const deleteBoard = async (id: string) =>
  rbacWithAuth(id, async (userId) => {
    await db.delete(boardTable).where(eq(boardTable.id, id));
  }, Role.owner);
```

### ❌ Trusting Client-Side Role Checks

**Bad:**

```typescript
"use client";

function DeleteButton({ userRole, boardId }) {
  // ❌ Client-side check can be bypassed
  if (userRole === Role.owner) {
    return <button onClick={() => deleteBoard(boardId)}>Delete</button>;
  }
}
```

**Good:**

```typescript
"use client";

function DeleteButton({ boardId }) {
  // ✅ UI check for UX, server validates
  return <button onClick={() => deleteBoard(boardId)}>Delete</button>;
}

// Server action validates role
export const deleteBoard = async (id: string) =>
  rbacWithAuth(id, async (userId) => {
    // ...
  }, Role.owner);
```

### ❌ Exposing Sensitive Data in Client Components

**Bad:**

```typescript
// ❌ API keys in client component
"use client";

const API_KEY = "secret-key"; // Exposed in bundle!
```

**Good:**

```typescript
// ✅ API keys in server actions/environment
"use server";

export async function callExternalAPI() {
  const apiKey = process.env.API_KEY; // Server-side only
  // ...
}
```

### ❌ Not Validating Real-Time Messages

**Bad:**

```typescript
// ❌ Trusts message data completely
channel.subscribe(EVENT_TYPE.POST.UPDATE_CONTENT, (message) => {
  updatePost(message.data.postId, message.data.content);
});
```

**Good:**

```typescript
// ✅ Validates before processing
channel.subscribe(EVENT_TYPE.POST.UPDATE_CONTENT, (message) => {
  processPostMessage(message.name, message.data, currentUserId);
});
```

## Integration with Other Skills

- **[nextjs-app-router](../nextjs-app-router/SKILL.md):** Server actions must use authentication wrappers
- **[drizzle-patterns](../drizzle-patterns/SKILL.md):** Database operations require auth checks
- **[ably-realtime](../ably-realtime/SKILL.md):** Real-time messages need validation
- **[testing-patterns](../testing-patterns/SKILL.md):** Mock authentication in tests

## Project-Specific Context

### Key Files

- `lib/actions/actionWithAuth.ts` - Authentication wrapper implementations
- `lib/realtime/messageProcessors.ts` - Real-time message validation
- `proxy.ts` - Supabase authentication proxy (Next.js 16)
- `AGENTS.md` (Security Rules section) - Comprehensive security guidelines

### Project Security Checklist

When creating/modifying features:

- [ ] All server actions use `actionWithAuth` or `rbacWithAuth`
- [ ] Input validation with Zod where applicable
- [ ] No direct database access without RBAC checks
- [ ] Real-time messages validated before processing
- [ ] No secrets in client-side code
- [ ] Role checks enforced server-side
- [ ] Error messages don't leak sensitive info

### Authentication Flow

1. User authenticates via Supabase Auth
2. Middleware validates session
3. Server action checks user ID via `verifySession()`
4. For board operations, verify role via `memberTable`
5. Execute operation if authorized
6. Return serializable data to client

### Common Patterns

**Check Board Ownership:**

```typescript
const isOwner = await db.query.memberTable.findFirst({
  where: and(
    eq(memberTable.boardId, boardId),
    eq(memberTable.userId, userId),
    eq(memberTable.role, Role.owner)
  ),
});

if (!isOwner) throw new Error("Unauthorized");
```

**Verify Post Ownership:**

```typescript
const post = await db.query.postTable.findFirst({
  where: eq(postTable.id, postId),
});

if (!post) {
  throw new Error("Post not found");
}

if (post.userId !== userId) {
  throw new Error("Not your post");
}
```

---

**Last Updated:** 2026-01-10
