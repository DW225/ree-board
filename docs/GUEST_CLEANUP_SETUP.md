# Guest User Cleanup Job - Setup Guide

This document provides setup instructions for the automated guest user cleanup system.

## Overview

Guest users are created with a **30-day expiration period**. This cleanup job automatically removes expired guest users and their associated data daily at 2am UTC.

## Components

1. **Cleanup Job** - [`lib/jobs/cleanupGuestUsers.ts`](lib/jobs/cleanupGuestUsers.ts)
   - Finds guest users where `guestExpiresAt` < current time
   - Deletes expired guests (cascade deletes handle related data)
   - Returns count of deleted users

2. **Cron Endpoint** - [`app/api/cron/cleanup-guests/route.ts`](app/api/cron/cleanup-guests/route.ts)
   - Protected API endpoint called by Vercel Cron
   - Authenticates using `CRON_SECRET` environment variable
   - Returns JSON with cleanup results

3. **Vercel Cron Configuration** - [`vercel.json`](vercel.json)
   - Schedules job to run daily at 2am UTC
   - Cron expression: `0 2 * * *`

## Setup Instructions

### 1. Generate CRON_SECRET

Generate a secure random secret for protecting the cron endpoint:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Configure Local Environment

Add the secret to your `.env.local` file:

```bash
# .env.local
CRON_SECRET=your_generated_secret_here
```

**Important:** The CRON_SECRET is already listed in `.env.example` as a placeholder. Make sure to replace it with your actual generated secret.

### 3. Configure Vercel Production

Add the environment variable to your Vercel project:

#### Option 1: Via Vercel Dashboard

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add new variable:
   - **Name:** `CRON_SECRET`
   - **Value:** Your generated secret
   - **Environment:** Production (and Preview if needed)
4. Save and redeploy

#### Option 2: Via Vercel CLI

```bash
vercel env add CRON_SECRET production
# Paste your generated secret when prompted
```

### 4. Deploy to Vercel

The cron job will be automatically configured when you deploy:

```bash
git add .
git commit -m "feat: add guest user cleanup cron job"
git push origin main
```

Vercel will:

- Read `vercel.json` configuration
- Set up the cron job to run daily at 2am UTC
- Start executing the job on schedule

## Testing

### Test Locally (Automated Test Script)

A comprehensive test script is available at `scripts/test-guest-cleanup.ts` that:

- Creates test guests (both expired and active)
- Runs the cleanup job
- Verifies only expired guests are deleted
- Ensures active guests remain safe

**Prerequisites:**

1. Start the local database: `pnpm dev:sql`
2. Ensure `.env.local` has database credentials

**Run the test:**

```bash
npx tsx scripts/test-guest-cleanup.ts
```

**Expected output:**

```text
============================================================
Guest Cleanup Job - Test Script
============================================================

Step 1: Creating test guests...
✓ Created expired guest: TestExpiredGuest_1 (expires: 2026-01-13T...)
✓ Created active guest: TestActiveGuest_1 (expires: 2026-02-12T...)

Step 2: Verifying test guests exist in database...
✓ Found: TestExpiredGuest_1 (expired)
✓ Found: TestActiveGuest_1 (active)

Step 3: Running cleanup job...
[Guest Cleanup] Deleting guest: TestExpiredGuest_1...
✓ Deleted guest: TestExpiredGuest_1

Step 4: Verifying cleanup results...
✓ PASS: Expired guest deleted: TestExpiredGuest_1
✓ PASS: Active guest preserved: TestActiveGuest_1

============================================================
Test Results:
============================================================
✓ ALL TESTS PASSED
  - 2 expired guests deleted
  - 2 active guests preserved
  - No false positives
```

### Test the Cron Endpoint

Test the protected endpoint with curl:

```bash
# Replace YOUR_SECRET with your actual CRON_SECRET
# Ensure CRON_SECRET is set in your shell
curl -X GET http://localhost:3000/api/cron/cleanup-guests \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected response (success):

```json
{
  "success": true,
  "cleanedUp": 0,
  "timestamp": "2026-01-14T12:00:00.000Z",
  "message": "No expired guests to clean up"
}
```

Expected response (unauthorized):

```json
{
  "error": "Unauthorized"
}
```

### Create Test Expired Guest

To test with an actual expired guest:

```typescript
// Create a guest with already-expired timestamp
import { createGuestUser } from "@/lib/db/user";
import { nanoid } from "nanoid";

await createGuestUser({
  id: nanoid(),
  supabase_id: "test_" + nanoid(),
  name: "TestExpiredGuest",
  guestExpiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
});
```

Then run the cleanup job to verify it gets deleted.

## Monitoring

### View Cron Job Logs in Vercel

1. Go to your Vercel project dashboard
2. Navigate to "Logs"
3. Filter by function: `/api/cron/cleanup-guests`
4. Look for logs starting with `[Cron Cleanup]` or `[Guest Cleanup]`

### Expected Log Output

Successful run with no expired guests:

```text
[Cron Cleanup] Starting scheduled guest cleanup job
[Guest Cleanup] Starting cleanup job...
[Guest Cleanup] Found 0 expired guest users
[Guest Cleanup] No expired guests to clean up
[Cron Cleanup] Job completed successfully: {...}
```

Successful run with deleted guests:

```text
[Cron Cleanup] Starting scheduled guest cleanup job
[Guest Cleanup] Starting cleanup job...
[Guest Cleanup] Found 2 expired guest users
[Guest Cleanup] Deleting guest: Guest_abc123 (ID: xyz789, expired: 2026-01-01T00:00:00.000Z)
[Guest Cleanup] ✓ Deleted guest: Guest_abc123
[Guest Cleanup] Cleanup complete. Deleted 2/2 guests
[Cron Cleanup] Job completed successfully: {...}
```

## Verification Checklist

After deployment, verify:

- [ ] `CRON_SECRET` is set in Vercel environment variables
- [ ] Vercel dashboard shows the cron job under "Cron Jobs" tab
- [ ] First run completes successfully (check logs after 2am UTC)
- [ ] Endpoint returns 401 without proper authorization
- [ ] Endpoint returns 200 with valid CRON_SECRET
- [ ] Only expired guests (30+ days old) are deleted
- [ ] Active guests remain in the database

## Cascade Delete Behavior

When a guest user is deleted, the following related data is automatically handled:

| Table    | Relationship       | Delete Behavior                            |
| -------- | ------------------ | ------------------------------------------ |
| `member` | userId → user.id   | CASCADE (deleted)                          |
| `vote`   | userId → user.id   | CASCADE (deleted)                          |
| `post`   | author → user.id   | SET NULL (post remains, author nullified)  |
| `task`   | userId → user.id   | SET NULL (task remains, user nullified)    |
| `board`  | creator → user.id  | SET NULL (board remains, creator nullified)|
| `links`  | creator → user.id  | SET NULL (link remains, creator nullified) |

## Troubleshooting

### Cron job not running

1. Check Vercel dashboard → Cron Jobs tab
2. Verify `vercel.json` is at project root
3. Ensure deployment was successful
4. Check if CRON_SECRET environment variable exists

### Endpoint returns 500

1. Check if CRON_SECRET is set in environment variables
2. Review error logs in Vercel dashboard
3. Verify database connection is working

### Guests not being deleted

1. Confirm guests have `isGuest = true`
2. Verify `guestExpiresAt` timestamp is in the past
3. Check logs for SQL errors
4. Test manually with `npx tsx scripts/test-guest-cleanup.ts`

## Related Files

- [db/schema.ts](db/schema.ts) - User table schema with `isGuest` and `guestExpiresAt`
- [lib/actions/guest/action.ts](lib/actions/guest/action.ts) - Guest creation (30-day expiry)
- [lib/db/user.ts](lib/db/user.ts) - User database operations

## Security Notes

- **Never commit CRON_SECRET to git** - It's listed in `.gitignore`
- Use a cryptographically secure random value (minimum 32 characters)
- Rotate the secret if it's ever compromised
- Only Vercel Cron system should call this endpoint
- The endpoint logs unauthorized access attempts

---

**Last Updated:** 2026-01-14
**Guest Expiration Period:** 30 days
**Cron Schedule:** Daily at 2am UTC
