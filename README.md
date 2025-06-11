# Ree-Board

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FDW225%2Free-board.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2FDW225%2Free-board?ref=badge_shield)

Ree-Board is a collaborative retro board application for teams, built with Next.js, TypeScript, and modern full-stack tooling. It supports real-time collaboration, user authentication, and role-based access control.

## Features

- **Real-time Collaboration:** Updates are instantly reflected for all users via Ably.
- **Authentication:** Secure login with Kinde.
- **Role-based Access:** Owner, member, and guest roles for boards.
- **Board & Post Management:** Create, update, and delete boards and posts.
- **Voting & Tasks:** Upvote posts, assign action items, and track task status.
- **Responsive UI:** Built with Tailwind CSS and Shadcn/ui components.
- **Error Monitoring:** Integrated with Sentry.

## Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend:** Next.js API routes, Drizzle ORM, Turso (SQLite)
- **Auth:** Kinde
- **Realtime:** Ably
- **Testing:** Jest, ts-jest
- **Other:** Preact Signals, Lucide Icons

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- pnpm (or npm/yarn)
- Turso account (for SQLite DB)
- Kinde account (for authentication)
- Ably account (for realtime)

### Setup

1. **Clone the repo:**

   ```bash
   git clone https://github.com/DW225/ree-board.git
   cd ree-board
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Configure environment variables:**
   - Copy `.env.example` to `.env.local` and fill in your credentials for Turso, Kinde, Ably, and Sentry.

4. **Run database migrations:**
   - **For local development:**

     ```bash
     # Start the local Turso DB first
     pnpm dev:sql
     # Then run local migrations
     pnpm push:dev
     ```

   - **For production:**

     ```bash
     pnpm push
     ```

5. **Start the development server:**

   ```bash
   pnpm dev
   ```

6. **Run tests:**

   ```bash
   pnpm test
   ```

## Project Structure

- `app/` - Next.js app directory (pages, layouts, API routes)
- `components/` - UI and feature components
- `lib/` - Utilities, database logic, types, and constants
- `db/` - Drizzle ORM schema and migration scripts
- `public/` - Static assets
- `hooks/` - React hooks
- `drizzle/` - Drizzle migration metadata

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm test` - Run tests

## Environment Variables

See `.env.example` for all required variables.

## License

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FDW225%2Free-board.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FDW225%2Free-board?ref=badge_large)
