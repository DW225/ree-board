---
name: ably-realtime
description: Ably real-time messaging patterns, WebSocket channel management, message validation and processing, staleness filtering, error recovery strategies, collaborative editing with drag-and-drop, optimistic updates for voting, real-time board collaboration, and Ably integration best practices for ree-board project
---

# Ably Real-time Collaboration

## When to Use This Skill

Activate this skill when working on:

- Implementing real-time features
- Setting up Ably channels
- Processing real-time messages
- Building collaborative editing features
- Implementing drag-and-drop with real-time sync
- Handling WebSocket connections
- Managing real-time state updates
- Optimizing real-time performance

## Core Patterns

### Channel Management

**Channel Naming Convention:**

```typescript
// Pattern: `board:{boardId}`
const channelName = `board:${boardId}`;
```

**Setting Up Channels:**

```typescript
"use client";

import { useChannel } from "ably/react";
import { useEffect } from "react";

export function PostChannelComponent({ boardId }: { boardId: string }) {
  const { channel } = useChannel(`board:${boardId}`, (message) => {
    processMessage(message);
  });

  return <PostList boardId={boardId} />;
}
```

### Message Processors with Validation

**Critical Pattern:** Always validate messages before processing

```typescript
// lib/realtime/messageProcessors.ts
import { processPostMessage } from "@/lib/realtime/messageProcessors";
import { EVENT_TYPE } from "@/lib/utils/ably";

// Repo processors validate payload shape and staleness before updating signals.
processPostMessage(EVENT_TYPE.POST.UPDATE_CONTENT, message.data, currentUserId);
```

### Staleness Filtering

**30-Second Threshold:** Prevents processing old messages after reconnection

```typescript
const STALENESS_THRESHOLD_MS = 30000;

export function isMessageStale(timestamp: number): boolean {
  const age = Date.now() - timestamp;
  return age > STALENESS_THRESHOLD_MS;
}

// Usage in message handler
useChannel(`board:${boardId}`, (message) => {
  processPostMessage(message.name, message.data, currentUserId);
});
```

### Error Recovery Strategies

**Connection Error Handling:**

```typescript
import { useConnectionStateListener } from "ably/react";
import type { ReactNode } from "react";

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [connectionState, setConnectionState] = useState<string>("initialized");

  useConnectionStateListener((stateChange) => {
    setConnectionState(stateChange.current);

    switch (stateChange.current) {
      case "connected":
        console.log("✅ Connected to Ably");
        break;

      case "disconnected":
        console.warn("⚠️ Disconnected from Ably");
        break;

      case "suspended":
        console.error("❌ Connection suspended");
        // Optionally show user notification
        break;

      case "failed":
        console.error("❌ Connection failed");
        // Show error message to user
        break;
    }
  });

  return (
    <>
      {connectionState !== "connected" && (
        <ConnectionBanner state={connectionState} />
      )}
      {children}
    </>
  );
}
```

### Publishing Messages

**Publish Mutation Events From Server Actions:**

```typescript
import { UpdatePostContentAction } from "@/lib/actions/post/action";

// Server actions persist, enforce RBAC, and publish Ably events server-side.
await UpdatePostContentAction(postId, boardId, content);
```

### Optimistic Updates for Voting

**Pattern:** Update UI immediately, sync in background

```typescript
"use client";

import { UpVotePostAction } from "@/lib/actions/vote/action";

export function VoteButton({
  postId,
  boardId,
}: {
  postId: string;
  boardId: string;
}) {
  const handleVote = async () => {
    try {
      // Server action persists the vote and publishes the Ably event.
      await UpVotePostAction(postId, currentUserId, boardId);
    } catch (error) {
      console.error("Vote failed", error);
    }
  };

  return <button onClick={handleVote}>Vote</button>;
}
```

### Drag-and-Drop Integration

**Lazy-Loaded with Real-Time Sync:**

```typescript
// components/board/PostProvider.tsx
"use client";

import { UpdatePostTypeAction } from "@/lib/actions/post/action";
import { updatePostType } from "@/lib/signal/postSignals";

export function PostProvider({ boardId }: { boardId: string }) {
  const handleDrop = async (postId: string, newType: PostType) => {
    // Update locally, then persist through the server action.
    updatePostType(postId, newType);

    await UpdatePostTypeAction(postId, boardId, newType);
  };
}
```

## Anti-Patterns

### ❌ Not Validating Messages

**Bad:**

```typescript
useChannel(`board:${boardId}`, (message) => {
  // ❌ Trusts message data completely
  updatePost(message.data.postId, message.data.content);
});
```

**Good:**

```typescript
useChannel(`board:${boardId}`, (message) => {
  // ✅ Routes through repo processor for validation and staleness checks
  processPostMessage(message.name, message.data, currentUserId);
});
```

### ❌ Not Checking Message Staleness

**Bad:**

```typescript
useChannel(channelName, (message) => {
  // ❌ Processes all messages, even old ones after reconnect
  processMessage(message.data);
});
```

**Good:**

```typescript
useChannel(channelName, (message) => {
  // ✅ Repo processor validates shape and ignores stale messages
  processPostMessage(message.name, message.data, currentUserId);
});
```

### ❌ Not Handling Connection Errors

**Bad:**

```typescript
// ❌ No error handling
const { channel } = useChannel(channelName);
```

**Good:**

```typescript
// ✅ Monitor connection state
useConnectionStateListener((stateChange) => {
  if (stateChange.current === "failed") {
    showErrorNotification("Real-time connection lost");
  }
});
```

### ❌ Client-Publishing Mutation Events

**Bad:**

```typescript
// ❌ Bypasses server-side RBAC, persistence, and event ownership headers
channel.publish(EVENT_TYPE.POST.UPVOTE, votePayload);
```

**Good:**

```typescript
// ✅ Server action persists vote and publishes the Ably event server-side
await UpVotePostAction(postId, currentUserId, boardId);
```

### ❌ Not Handling Race Conditions

**Bad:**

```typescript
// ❌ Multiple updates could conflict
const handleVote = async () => {
  const newCount = currentCount + 1;
  await updateVoteCount(postId, newCount);
};
```

**Good:**

```typescript
// ✅ Use atomic increment
const handleVote = async () => {
  await db
    .update(postTable)
    .set({ voteCount: sql`vote_count + 1` })
    .where(eq(postTable.id, postId));
};
```

## Integration with Other Skills

- **[rbac-security](../rbac-security/SKILL.md):** Validate messages for security
- **[signal-state-management](../signal-state-management/SKILL.md):** Real-time updates to signals
- **[nextjs-app-router](../nextjs-app-router/SKILL.md):** Client components for real-time features
- **[testing-patterns](../testing-patterns/SKILL.md):** Test message processors with fake timers

## Project-Specific Context

### Key Files

- `lib/realtime/messageProcessors.ts` - Message validation and processing
- `components/board/PostChannelComponent.tsx` - Channel subscription and processor routing
- `components/board/RTLProvider.tsx` - Ably provider and channel provider setup
- `components/board/PostProvider.tsx` - Drag-and-drop setup and signal initialization
- `lib/realtime/__tests__/` - Message processor tests

### Message Types

**Current Message Types:**

```typescript
type MessageType =
  | typeof EVENT_TYPE.POST.ADD
  | typeof EVENT_TYPE.POST.UPDATE_CONTENT
  | typeof EVENT_TYPE.POST.UPDATE_TYPE
  | typeof EVENT_TYPE.POST.DELETE
  | typeof EVENT_TYPE.POST.UPVOTE
  | typeof EVENT_TYPE.POST.DOWNVOTE
  | typeof EVENT_TYPE.POST.MERGE
  | typeof EVENT_TYPE.MEMBER.ADD
  | typeof EVENT_TYPE.MEMBER.UPDATE_ROLE
  | typeof EVENT_TYPE.MEMBER.DELETE;
```

### Channel Structure

**One Channel Per Board:**

- Channel name: `board:{boardId}`
- All board events published to this channel
- Subscribers filter by message type

### Performance Optimizations

1. **Lazy Loading:** Drag-and-drop loaded on demand
2. **Staleness Filter:** Discards messages >30s old
3. **Optimistic Updates:** Immediate UI feedback
4. **Batching:** Vote counts updated atomically
5. **Connection Pooling:** Reuse Ably client instance

### Error Recovery

**Automatic Reconnection:**

- Ably SDK handles reconnection automatically
- Messages buffered during disconnection
- Staleness filter prevents processing old messages after reconnect

**Manual Recovery:**

```typescript
// Refresh data after long disconnection
if (
  stateChange.previous === "suspended" &&
  stateChange.current === "connected"
) {
  await refreshBoardData();
}
```

### Testing

**Mock Ably in Tests:**

```typescript
jest.mock("ably/react", () => ({
  useChannel: jest.fn(() => ({
    channel: {
      publish: jest.fn(),
      subscribe: jest.fn(),
    },
  })),
}));
```

---

**Last Updated:** 2026-01-10
