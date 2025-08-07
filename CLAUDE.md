# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL: Sequential Thinking Requirement

**MANDATORY**: Before starting ANY complex task (3+ steps or requiring multiple file changes), you MUST use the `mcp__sequential-thinking__sequentialthinking` tool to plan your approach. This includes:

- Feature implementations
- Bug fixes involving multiple files
- Refactoring tasks
- Security reviews
- Performance optimizations
- Any task requiring coordination between frontend/backend/database

**Example Planning Process:**

1. Use sequential-thinking to break down the task
2. Identify files and components to be modified
3. Plan the implementation sequence
4. Consider testing and validation steps
5. Only then proceed with implementation

## Development Commands

### Core Commands

- `pnpm dev` - Start development server (Next.js)
- `pnpm dev:sql` - Start local Turso SQLite database for development
- `pnpm build` - Build for production
- `pnpm test` - Run Jest tests
- `pnpm lint` - Run ESLint

### Database Commands

- `pnpm push:dev` - Push schema changes to local development database
- `pnpm push` - Push schema changes to production database
- `pnpm generate` - Generate Drizzle migration files
- `pnpm migrate` - Run database migrations

### Analysis Commands

- `pnpm build:analyze` - Build with bundle analysis
- `pnpm bundle-stats` - Generate bundle analysis report
- `pnpm build:stats` - Build and generate bundle stats

## Architecture Overview

### Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes with Drizzle ORM
- **Database**: Turso SQLite (local: file:test.db, production: Turso cloud)
- **Authentication**: Kinde Auth
- **Real-time**: Ably for live collaboration
- **State Management**: Preact Signals for reactive state
- **UI Components**: Radix UI + Shadcn/ui components
- **Testing**: Jest with ts-jest

### Key Architecture Patterns

#### Database Schema (db/schema.ts)

- Uses Nano IDs as primary keys across all tables
- Core entities: `user`, `board`, `post`, `member`, `vote`, `task` (stored as "action")
- Role-based access control with user roles (owner, member, guest)
- Posts are categorized by `PostType` (went_well, to_improve, action_items)
- Voting system with vote count optimization and unique constraints

#### State Management with Signals

Located in `lib/signal/` - uses Preact Signals for reactive state management:

- `boardSignals.ts` - Board listing, filtering, and sorting
- `postSignals.ts` - Post management within boards
- `memberSignals.ts` - Board member management
- Signals provide computed values and action creators for state updates

#### Server Actions Pattern

Located in `lib/actions/` - server-side operations with authentication:

- `actionWithAuth.ts` - HOF that wraps actions with Kinde authentication
- Organized by entity: `board/`, `post/`, `member/`, `task/`, `vote/`
- Actions handle database operations and return serializable data

#### Real-time Collaboration

- Uses Ably channels for real-time updates
- `PostProvider.tsx` manages real-time post updates and drag-and-drop
- Lazy-loaded drag-and-drop using Atlaskit's pragmatic-drag-and-drop
- Posts can be dragged between columns (PostType categories)

#### Component Architecture

- `components/board/` - Board-specific components with real-time features
- `components/common/` - Shared components (AuthProvider, NavBar)
- `components/ui/` - Shadcn/ui base components
- Context providers for cross-cutting concerns (auth, voting state)

### Database Development Workflow

1. For local development: Start `pnpm dev:sql` first, then `pnpm push:dev`
2. For schema changes: Modify `db/schema.ts`, then run `pnpm generate` and `pnpm push:dev`
3. Production deployments use `pnpm push` with Turso cloud credentials

### Environment Setup

- Requires Turso, Kinde, Ably, and Sentry accounts
- Local development uses `test.db` SQLite file
- Environment variables should follow `.env.example` format

### Testing

- Jest configuration in `jest.config.js` with ts-jest preset
- Tests use Node environment for server-side code testing
- Run individual tests with standard Jest patterns

### Key Files to Understand

- `db/schema.ts` - Complete database schema with relationships
- `lib/signal/` - Reactive state management layer
- `components/board/PostProvider.tsx` - Real-time collaboration setup
- `lib/actions/actionWithAuth.ts` - Authentication wrapper for server actions

## 🔐 Security Guidelines

### Authentication & Authorization

**CRITICAL**: All server actions MUST use `actionWithAuth` or `rbacWithAuth` patterns:

```typescript
// ✅ CORRECT - Authentication wrapper
export const MyAction = async (data: MyData) =>
  rbacWithAuth(data.boardId, async (userID) => {
    // Your business logic here
  });

// ❌ INCORRECT - No authentication
export const MyAction = async (data: MyData) => {
  // Direct database access without auth check
};
```

**Role-Based Access Control (RBAC)**:

- `Role.owner` - Full board access (create, delete, manage members)
- `Role.member` - Post creation, voting, task management
- `Role.guest` - Read-only access (NO write operations)

**Security Checklist for New Features**:

- [ ] All server actions use authentication wrappers
- [ ] Input validation with Zod schemas where applicable
- [ ] No direct database access without RBAC checks
- [ ] Sensitive operations logged appropriately
- [ ] No secrets in client-side code
- [ ] Real-time message validation implemented

### Input Validation

**Zod Schema Pattern** (when adding new validation):

```typescript
const MyDataSchema = z.object({
  id: z.string().min(1, "ID is required"),
  content: z.string().min(1, "Content is required"),
  // Add proper constraints for all fields
});
```

**Critical Validation Points**:

- Real-time message processors (already implemented with strong validation)
- Form submissions
- API route parameters
- Environment variable validation

## ⚡ Performance Standards

### Database Optimization

**Query Performance Patterns**:

```typescript
// ✅ CORRECT - Use prepared statements for repeated queries
const prepareFetchPostsByBoardID = db
  .select()
  .from(postTable)
  .where(eq(postTable.boardId, sql.placeholder("boardId")))
  .prepare();

// ✅ CORRECT - Efficient indexing (see db/schema.ts)
index("post_board_id_index").on(table.boardId)
```

**Database Best Practices**:

- Use prepared statements for repeated queries
- Leverage indexes on foreign keys and frequently queried fields
- Batch database operations when possible
- Use transactions for multi-table operations

### Frontend Performance

**Bundle Optimization**:

- Dynamic imports for large components (drag-and-drop is lazy-loaded)
- Code splitting by route
- Optimized package imports in `next.config.js`
- Use `pnpm build:analyze` to monitor bundle size

**Real-time Performance**:

- Signal-based state management for efficient reactivity
- Message staleness threshold (30s) to prevent processing old updates
- Optimistic updates for voting to reduce perceived latency

**Performance Monitoring**:

- Bundle analysis with `scripts/bundle-analysis.js`
- Vercel Speed Insights integration
- Core Web Vitals tracking

## 🛡️ Reliability Framework

### Error Handling Standards

**Error Boundaries**: Global error boundary captures and reports to Sentry:

```typescript
// app/global-error.tsx - Automatic Sentry reporting
useEffect(() => {
  captureException(error);
}, [error]);
```

**Real-time Error Recovery**:

```typescript
// Standardized error handling with recovery strategies
const processingError = createProcessingError(
  "Error message",
  eventType,
  rawData,
  ErrorRecoveryStrategy.LOG_AND_CONTINUE
);
```

**Server Action Error Patterns**:

```typescript
// ✅ CORRECT - Proper error handling
try {
  const result = await databaseOperation();
  return result;
} catch (error) {
  console.error("Operation failed:", error);
  return NextResponse.json({ error: "Operation failed" }, { status: 500 });
}
```

### Monitoring & Observability

**Sentry Integration**:

- Automatic error capture and performance monitoring
- Source map upload for better stack traces
- Custom error boundaries for React components

**Logging Strategy**:

- Structured console logging for development
- Error context preservation in production
- Real-time message processing errors tracked

### Retry & Resilience

**Exponential Backoff** (`lib/utils/retryWithBackoff.ts`):

```typescript
// For external service calls
await retryWithBackoff(
  () => externalServiceCall(),
  { maxRetries: 5, initialDelay: 1000 }
);
```

**Real-time Message Resilience**:

- Message staleness filtering (30s threshold)
- Validation before processing
- Graceful degradation for connection issues

## 🚀 Operational Readiness

### Deployment Standards

**Environment Configuration**:

- Development: Local Turso DB (`file:test.db`)
- Production: Turso Cloud with authentication tokens
- Environment-specific settings in `next.config.js`

**Build Process**:

```bash
# Development
pnpm dev:sql        # Start local DB
pnpm push:dev       # Apply schema changes
pnpm dev           # Start development server

# Production
pnpm build         # Build application
pnpm push          # Apply production schema changes
```

**Database Migration Strategy**:

1. Generate migration: `pnpm generate`
2. Review generated SQL in `drizzle/` folder
3. Apply to development: `pnpm push:dev`
4. Test thoroughly
5. Apply to production: `pnpm push`

### Health Monitoring

**Application Health Indicators**:

- Database connectivity (Turso)
- Authentication service (Kinde)
- Real-time messaging (Ably)
- Error rates (Sentry)

**Operational Checklist**:

- [ ] Environment variables properly configured
- [ ] Database migrations applied
- [ ] External service credentials valid
- [ ] Monitoring and alerting active
- [ ] Bundle size within acceptable limits

### Configuration Management

**Environment Variables Structure**:

```bash
# Database
TURSO_DATABASE_URL=<production_url>
TURSO_AUTH_TOKEN=<production_token>

# Authentication
KINDE_CLIENT_ID=<client_id>
KINDE_CLIENT_SECRET=<client_secret>
KINDE_ISSUER_URL=<issuer_url>

# Real-time
ABLY_API_KEY=<api_key>

# Monitoring
SENTRY_TOKEN=<auth_token>
```

## 📋 Code Quality Standards

### Testing Requirements

**Test Coverage Expectations**:

- Unit tests for utility functions (see `lib/utils/md5.test.ts`)
- Integration tests for message processors (`lib/realtime/__tests__/`)
- Server action testing with mocked authentication

**Testing Patterns**:

```typescript
// ✅ CORRECT - Comprehensive message processor testing
describe("Message Processors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  it("should handle invalid data gracefully", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    // Test implementation
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid data"),
      expect.objectContaining({ details: expect.any(Array) })
    );
    consoleSpy.mockRestore();
  });
});
```

### Code Organization

**File Structure Patterns**:

- `lib/actions/[entity]/action.ts` - Server actions by domain
- `lib/db/[entity].ts` - Database operations by table
- `lib/signal/[entity]Signals.ts` - State management by domain
- `components/[feature]/` - Feature-specific components
- `lib/types/[entity].ts` - TypeScript type definitions

**Import Organization**:

```typescript
// ✅ CORRECT - Consistent type imports
import type { Post } from "@/lib/types/post";
import { updatePostContent } from "@/lib/signal/postSignals";
```

### Documentation Standards

**Code Documentation Requirements**:

- JSDoc comments for public APIs
- Type definitions for all interfaces
- README updates for architectural changes
- Schema documentation in `db/schema.ts`

**Comment Guidelines**:

- Explain WHY, not WHAT
- Document complex business logic
- Mark TODO items with context
- Reference external dependencies clearly

## 🔧 Development Workflow

### Before Starting Development

1. **Use Sequential Thinking**: Plan complex tasks thoroughly
2. **Check Dependencies**: Ensure all services are running
3. **Environment Setup**: Verify all environment variables
4. **Database State**: Confirm migrations are applied

### Code Review Standards

**Pre-submission Checklist**:

- [ ] Tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes
- [ ] Bundle size impact assessed
- [ ] Security implications reviewed
- [ ] Performance impact considered

### Git Workflow

**Branch Naming**:

- `feat/feature-name` - New features
- `fix/issue-description` - Bug fixes
- `refactor/component-name` - Code improvements
- `docs/update-description` - Documentation updates

## 🚨 Troubleshooting Guide

### Common Issues

**Database Connection Issues**:

```bash
# Local development
pnpm dev:sql        # Ensure local DB is running
pnpm push:dev       # Reapply schema

# Production
# Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
```

**Authentication Failures**:

- Verify Kinde configuration in `.env`
- Check callback URLs match environment
- Ensure middleware configuration is correct

**Real-time Issues**:

- Verify Ably API key configuration
- Check message processor error logs
- Validate WebSocket connection in browser dev tools

**Build Failures**:

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Performance Debugging

**Bundle Analysis**:

```bash
pnpm build:analyze  # Generate bundle analyzer
pnpm build:stats    # Generate size statistics
```

**Database Query Performance**:

- Use Drizzle's query logging in development
- Check index usage for slow queries
- Monitor prepared statement efficiency

### Debug Mode Configuration

**Development Debugging**:

```bash
# Enable verbose logging
DEBUG=* pnpm dev

# Database query logging
# Set in drizzle.config.ts: verbose: true
```

## 📚 Learning Resources

### Architecture Deep Dive

**Signal-Based State Management**:

- Read `lib/signal/postSignals.ts` for patterns
- Understand computed vs. simple signals
- Batch updates for performance

**Real-time Architecture**:

- Study `lib/realtime/messageProcessors.ts` for message handling
- Review `components/board/PostChannelComponent.tsx` for integration
- Understand Ably channel management

**Database Patterns**:

- Examine `db/schema.ts` for relational design
- Study prepared statement usage in `lib/db/`
- Understand migration workflow with Drizzle

### External Dependencies

**Key Third-Party Integrations**:

- [Next.js 15 App Router](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Turso Database](https://turso.tech/docs)
- [Kinde Authentication](https://docs.kinde.com/)
- [Ably Real-time](https://ably.com/docs)
- [Preact Signals](https://preactjs.com/guide/v10/signals)

---

**Last Updated**: Latest comprehensive review completed
**Version**: 1.0 - Complete architectural documentation
