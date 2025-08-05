# Issue: Implement Member Message Processor

## Problem Statement

The current `PostChannelComponent` has a TODO comment for member message processing that is not implemented:

```typescript
// TODO: Add member message processor when needed
```

Currently, member-related real-time messages are received but not processed, which means:

- Member additions aren't reflected in real-time
- Role updates don't appear without page refresh
- Member removals aren't processed

## Proposed Solution

Implement a member message processor following the same pattern as post and task processors.

### 1. Create Member Message Schema

```typescript
const MemberMessageSchema = z.object({
  id: z.string().min(1, "Member ID is required"),
  userId: z.string().min(1, "User ID is required"),
  boardId: z.string().min(1, "Board ID is required"),
  role: z.number().min(0).max(2, "Role must be 0, 1, or 2"),
  username: z.string().optional(),
  email: z.string().email().optional(),
  createdAt: z.union([z.date(), z.string()]).optional(),
  updatedAt: z.union([z.date(), z.string()]).optional(),
});
```

### 2. Implement Member Validation Function

```typescript
function validateMemberData(rawData: unknown): ValidationResult<MemberMessageData> {
  const result = MemberMessageSchema.safeParse(rawData);
  // ... validation logic similar to other processors
}
```

### 3. Create Member Message Processor

```typescript
export function processMemberMessage(
  eventType: string,
  messageData: unknown,
  currentUserId: string
): void {
  // Handle EVENT_TYPE.MEMBER.ADD, UPDATE_ROLE, DELETE
}
```

### 4. Add to PostChannelComponent

Update the member message handling:

```typescript
if (messageType.startsWith(EVENT_PREFIX.MEMBER)) {
  // Process member updates using new processor
  memberProcessor(messageType, message.data, userId);
}
```

## Event Types to Handle

Based on `lib/utils/ably.ts`:

- `MEMBER_ADD` - Add new member to board
- `MEMBER_UPDATE_ROLE` - Update member role
- `MEMBER_DELETE` - Remove member from board

## Signal Integration

The processor should integrate with existing member signals:

- `addMember()` - Add member to signal state
- `updateMemberRole()` - Update member role
- `removeMember()` - Remove member from signal state

## Testing Requirements

- Unit tests for member validation schema
- Tests for each member event type (ADD, UPDATE_ROLE, DELETE)
- Error handling tests for invalid member data
- Integration tests with member signals

## Priority

**Low Priority** - Member changes are less frequent than post/vote changes and page refresh is acceptable for now.

## Implementation Notes

- Follow the same Zod-based validation pattern as post/task processors
- Ensure proper error handling and logging
- Consider rate limiting for member operations
- Add comprehensive tests before implementation

## Related Files

- `lib/realtime/messageProcessors.ts` - Add member processor
- `lib/signal/memberSignals.ts` - Member state management
- `components/board/PostChannelComponent.tsx` - Integration point
- `lib/utils/ably.ts` - Event type definitions

## Acceptance Criteria

- [ ] Member message schema with Zod validation
- [ ] Member message processor function
- [ ] Integration with member signals
- [ ] Comprehensive test coverage
- [ ] Error handling and logging
- [ ] Update PostChannelComponent integration
- [ ] Documentation updates
