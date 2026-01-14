import { userTable } from "@/db/schema";
import { db } from "@/lib/db/client";
import { and, eq, lt } from "drizzle-orm";

/**
 * Cleanup job to remove expired guest users
 *
 * Guest users are created with a 30-day expiration period.
 * This job finds and deletes guest users whose expiration date has passed.
 *
 * CASCADE DELETE BEHAVIOR:
 * When a user is deleted, the following related data is automatically cleaned up
 * due to foreign key constraints:
 * - member (cascade) - Board memberships
 * - vote (cascade) - User votes
 * - post (set null) - Posts authored by the user (author set to null)
 * - task (set null) - Tasks created by the user (userId set to null)
 * - board (set null) - Boards created by the user (creator set to null)
 * - links (set null) - Invite links created by the user (creator set to null)
 *
 * @returns Number of guest users deleted
 */
export async function cleanupExpiredGuestUsers(): Promise<number> {
  const now = new Date();

  console.log("[Guest Cleanup] Starting cleanup job...");
  console.log(`[Guest Cleanup] Current time: ${new Date().toISOString()}`);

  // Find expired guests
  // Query for users where:
  // - isGuest = true
  // - guestExpiresAt < current timestamp (expired)
  const expiredGuests = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      guestExpiresAt: userTable.guestExpiresAt,
    })
    .from(userTable)
    .where(and(eq(userTable.isGuest, true), lt(userTable.guestExpiresAt, now)));

  console.log(
    `[Guest Cleanup] Found ${expiredGuests.length} expired guest users`
  );

  if (expiredGuests.length === 0) {
    console.log("[Guest Cleanup] No expired guests to clean up");
    return 0;
  }

  // Log details of guests being deleted (for audit trail)
  expiredGuests.forEach((guest) => {
    const expiryDate = guest.guestExpiresAt
      ? guest.guestExpiresAt.toISOString()
      : "unknown";
    console.log(
      `[Guest Cleanup] Deleting guest: ${guest.name} (ID: ${guest.id}, expired: ${expiryDate})`
    );
  });

  let deletedCount = 0;

  // Delete each expired guest
  // Cascade deletes will automatically handle related data
  for (const guest of expiredGuests) {
    try {
      const result = await db
        .delete(userTable)
        .where(eq(userTable.id, guest.id))
        .returning({ deletedId: userTable.id });

      if (result.length > 0) {
        deletedCount++;
        console.log(`[Guest Cleanup] ✓ Deleted guest: ${guest.name}`);
      }
    } catch (error) {
      console.error(
        `[Guest Cleanup] ✗ Failed to delete guest ${guest.name}:`,
        error
      );
    }
  }

  console.log(
    `[Guest Cleanup] Cleanup complete. Deleted ${deletedCount}/${expiredGuests.length} guests`
  );

  return deletedCount;
}
