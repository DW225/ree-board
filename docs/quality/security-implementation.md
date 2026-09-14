# Security verification

Board mutations use the authenticated user, check board permissions and record
ownership, and validate input. Guest account upgrades keep the same account and
board roles. Profile access requires self or shared-board membership.

## Checks

- ESLint, TypeScript, and Prettier passed.
- All 307 tests passed. Supabase and Ably calls are mocked.
- The isolated guest-dialog browser check passed.
- A fresh SonarQube scan could not run on the current connection.

## Before release

- Test guest email confirmation and account upgrade with live Supabase.
- Test posts, votes, tasks, standard invites, and read-only invites with live
  Supabase, Turso, and Ably, including board switching and member removal.
- Deploy Ably publishers and subscribers together. Channels now use
  `board:{boardId}`; open pages need a reload. Existing tokens retain access
  until expiry or revocation. New tokens have a 60-second lifetime.
- Check recovery when publication fails after a database write succeeds.
- Run a fresh security and SonarQube scan against the release commit.
