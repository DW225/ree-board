---
name: signal-state-management
description: Preact Signals for reactive state management, signal vs computed signal usage, batch updates for performance, action creator patterns, signal integration with React components, state management by domain (boards posts members), reactive patterns, and signal best practices for ree-board project
---

# Signal State Management

## When to Use This Skill

Activate this skill when working on:

- Managing client-side application state
- Creating reactive UI updates
- Implementing computed values
- Batching state updates for performance
- Organizing state by domain (boards, posts, members)
- Integrating signals with React components
- Optimizing re-renders

## Core Patterns

### Signal vs Computed Signal

**Simple Signal:** Holds mutable state

```typescript
import { signal } from "@preact/signals-react";

// ✅ Simple signal for primitive values
export const currentBoardId = signal<string | null>(null);

// ✅ Simple signal for complex state
export const postsSignal = signal<Post[]>([]);
```

**Computed Signal:** Derives value from other signals

```typescript
import { signal, computed } from "@preact/signals-react";

export const postsSignal = signal<Post[]>([]);

// ✅ Computed signal automatically updates
export const enrichedPostsSignal = computed(() =>
  postsSignal.value.map((post) => ({
    ...post,
    voteCount: votesSignal.value[post.id] ?? post.voteCount,
  }))
);
```

### State Organization by Domain

**Separate Files for Each Domain:**

```typescript
// lib/signal/postSignals.ts
import { signal, computed } from "@preact/signals-react";

// State
export const postsSignal = signal<Post[]>([]);
export const selectedPostId = signal<string | null>(null);

// Computed values
export const selectedPost = computed(() => {
  const id = selectedPostId.value;
  if (!id) return null;
  return postsSignal.value.find((p) => p.id === id);
});

export const postsByType = computed(() => {
  const posts = postsSignal.value;
  return {
    wentWell: posts.filter((p) => p.type === PostType.went_well),
    toImprove: posts.filter((p) => p.type === PostType.to_improvement),
    toDiscuss: posts.filter((p) => p.type === PostType.to_discuss),
    actionItems: posts.filter((p) => p.type === PostType.action_item),
  };
});

// Actions
export const addPost = (post: Post) => {
  postsSignal.value = [...postsSignal.value, post];
};

export const updatePost = (id: string, updates: Partial<Post>) => {
  postsSignal.value = postsSignal.value.map((p) =>
    p.id === id ? { ...p, ...updates } : p
  );
};

export const deletePost = (id: string) => {
  postsSignal.value = postsSignal.value.filter((p) => p.id !== id);
};
```

### Action Creator Pattern

**Encapsulate State Updates:**

```typescript
// lib/signal/boardSignals.ts
import { signal } from "@preact/signals-react";

export const boardsSignal = signal<Board[]>([]);
export const loadingSignal = signal<boolean>(false);
export const errorSignal = signal<string | null>(null);

// ✅ Action creators for complex operations
export const loadBoards = async () => {
  loadingSignal.value = true;
  errorSignal.value = null;

  try {
    const boards = await fetchBoards();
    boardsSignal.value = boards;
  } catch (error) {
    errorSignal.value = "Failed to load boards";
    console.error(error);
  } finally {
    loadingSignal.value = false;
  }
};

export const createBoard = async (name: string) => {
  try {
    const newBoard = await createBoardAction(name);
    // Optimistic update
    boardsSignal.value = [...boardsSignal.value, newBoard];
    return newBoard;
  } catch (error) {
    errorSignal.value = "Failed to create board";
    throw error;
  }
};
```

### Batch Updates for Performance

**Update Multiple Signals Together:**

```typescript
import { batch } from "@preact/signals-react";

// ❌ Bad: Triggers 3 re-renders
const updateBoard = (id: string, data: BoardUpdate) => {
  boardsSignal.value = updateBoardList(id, data);
  selectedBoardId.value = id;
  lastUpdatedSignal.value = Date.now();
};

// ✅ Good: Triggers 1 re-render
const updateBoard = (id: string, data: BoardUpdate) => {
  batch(() => {
    boardsSignal.value = updateBoardList(id, data);
    selectedBoardId.value = id;
    lastUpdatedSignal.value = Date.now();
  });
};
```

### Integration with React Components

**Reading Signals:**

```typescript
"use client";

import { sortedPostsSignal } from "@/lib/signal/postSignals";

export function PostList() {
  // ✅ Component re-renders when signal changes
  const posts = sortedPostsSignal.value;

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
```

**Updating Signals:**

```typescript
"use client";

import { updatePost } from "@/lib/signal/postSignals";

export function EditPostForm({ postId }: { postId: string }) {
  const handleSubmit = (content: string) => {
    // ✅ Update signal
    updatePost(postId, { content });

    // Persist to database
    updatePostAction(postId, content);
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Combining Signals with Server Actions

**Pattern:** Update signal first (optimistic), then persist

```typescript
"use client";

import { addPost, removePost } from "@/lib/signal/postSignals";
import { CreatePostAction } from "@/lib/actions/post/action";

export function CreatePostButton({ boardId }: { boardId: string }) {
  const handleCreate = async () => {
    // Create temporary post for optimistic UI
    const tempPost: Post = {
      id: `temp-${Date.now()}`,
      boardId,
      content: "",
      type: PostType.went_well,
      voteCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // ✅ Optimistic update
    addPost(tempPost);

    try {
      // Persist to database
      const savedPost = await CreatePostAction({
        boardId,
        content: "",
        type: PostType.went_well,
      });

      // Replace temp with real post
      removePost(tempPost.id);
      addPost(savedPost);
    } catch (error) {
      // Rollback on error
      removePost(tempPost.id);
      showError("Failed to create post");
    }
  };

  return <button onClick={handleCreate}>Create Post</button>;
}
```

### Signal Performance Patterns

**Avoid Unnecessary Signal Subscriptions:**

```typescript
// ❌ Bad: Creates new computed signal on every render
function PostCount() {
  const count = computed(() => postsSignal.value.length);
  return <div>{count.value}</div>;
}

// ✅ Good: Computed signal defined once outside component
const postCount = computed(() => postsSignal.value.length);

function PostCount() {
  return <div>{postCount.value}</div>;
}
```

**Use Signal Peeking for Non-Reactive Reads:**

```typescript
import { postsSignal } from "@/lib/signal/postSignals";

function logCurrentPosts() {
  // ✅ Read without subscribing (doesn't trigger re-render)
  console.log("Current posts:", postsSignal.peek());
}
```

## Anti-Patterns

### ❌ Mutating Signal Values Directly

**Bad:**

```typescript
// ❌ Never mutate signal values directly
postsSignal.value.push(newPost);
```

**Good:**

```typescript
// ✅ Create new array
postsSignal.value = [...postsSignal.value, newPost];
```

### ❌ Creating Signals Inside Components

**Bad:**

```typescript
function MyComponent() {
  // ❌ Creates new signal on every render
  const localSignal = signal(0);
  return <div>{localSignal.value}</div>;
}
```

**Good:**

```typescript
// ✅ Define signals outside components
const counterSignal = signal(0);

function MyComponent() {
  return <div>{counterSignal.value}</div>;
}
```

### ❌ Not Using Batch for Multiple Updates

**Bad:**

```typescript
const statusSignal = signal<"all" | "open" | "closed">("all");
const sortSignal = signal<"date" | "votes">("date");
const searchSignal = signal("");

// ❌ Triggers 3 re-renders
const resetFilters = () => {
  statusSignal.value = "all";
  sortSignal.value = "date";
  searchSignal.value = "";
};
```

**Good:**

```typescript
// ✅ Triggers 1 re-render
import { batch } from "@preact/signals-react";

const resetFilters = () => {
  batch(() => {
    statusSignal.value = "all";
    sortSignal.value = "date";
    searchSignal.value = "";
  });
};
```

### ❌ Forgetting .value Accessor

**Bad:**

```typescript
// ❌ Comparing signal object, not value
if (currentBoardId === "board-123") {
  // This will never be true
}
```

**Good:**

```typescript
// ✅ Access signal value
if (currentBoardId.value === "board-123") {
  // Correct comparison
}
```

## Integration with Other Skills

- **[nextjs-app-router](../nextjs-app-router/SKILL.md):** Signals used in client components
- **[ably-realtime](../ably-realtime/SKILL.md):** Update signals from real-time messages
- **[drizzle-patterns](../drizzle-patterns/SKILL.md):** Sync signals with database state
- **[testing-patterns](../testing-patterns/SKILL.md):** Reset signals in test setup

## Project-Specific Context

### Key Files

- `lib/signal/boardSignals.ts` - Board listing and management
- `lib/signal/postSignals.ts` - Post state within boards
- `lib/signal/memberSignals.ts` - Board member management
- `components/board/PostProvider.tsx` - Signal updates from real-time

### Domain-Specific Signals

**Board Management:**

```typescript
// lib/signal/boardSignals.ts
export const boardsSignal = signal<Board[]>([]);
export const currentBoardId = signal<string | null>(null);
export const currentBoard = computed(() =>
  boardsSignal.value.find((b) => b.id === currentBoardId.value)
);
```

**Post Management:**

```typescript
// lib/signal/postSignals.ts
export const postsByTypeSignal = computed(() => {
  const posts = enrichedPostsSignal.value;
  return posts.reduce((acc, post) => {
    acc[post.type] ??= [];
    acc[post.type].push(post);
    return acc;
  }, {} as Record<Post["type"], typeof posts>);
});
```

**Member Management:**

```typescript
// lib/signal/memberSignals.ts
import { Role } from "@/lib/constants/role";

export const getCurrentUserRole = (currentUserId: string) => {
  const members = membersSignal.value;
  return members.find((m) => m.userId === currentUserId)?.role ?? Role.guest;
};
```

### Real-Time Integration

**Route Ably Messages Through Validated Processors:**

```typescript
// components/board/PostProvider.tsx
import { processPostMessage } from "@/lib/realtime/messageProcessors";

useChannel(`board:${boardId}`, (message) => {
  processPostMessage(message.name, message.data, currentUserId);
});
```

### Testing Signals

**Reset Signals in beforeEach:**

```typescript
import { postsSignal, postsByTypeSignal } from "@/lib/signal/postSignals";

beforeEach(() => {
  postsSignal.value = [];
});

test("filters posts by type", () => {
  postsSignal.value = [
    { id: "1", type: PostType.went_well, content: "Test" },
    { id: "2", type: PostType.to_improvement, content: "Test" },
  ];

  expect(postsByTypeSignal.value[PostType.went_well]).toHaveLength(1);
});
```

---

**Last Updated:** 2026-01-10
