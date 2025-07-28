# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
