/**
 * Test script for guest user cleanup job
 *
 * This script tests the cleanup job by:
 * 1. Creating test guests (both expired and active)
 * 2. Running the cleanup job
 * 3. Verifying only expired guests are deleted
 * 4. Cleaning up test data
 *
 * Usage: npx tsx scripts/test-guest-cleanup.ts
 */

import { cleanupExpiredGuestUsers } from "@/lib/jobs/cleanupGuestUsers";
import { createGuestUser, getUserByUserID, deleteUser } from "@/lib/db/user";
import { nanoid } from "nanoid";

interface TestGuest {
  id: string;
  name: string;
  isExpired: boolean;
}

async function testGuestCleanup() {
  console.log("=".repeat(60));
  console.log("Guest Cleanup Job - Test Script");
  console.log("=".repeat(60));
  console.log("");

  const testGuests: TestGuest[] = [];

  try {
    // Step 1: Create test guests
    console.log("Step 1: Creating test guests...");
    console.log("");

    // Create 2 expired guests (expired 1 day ago)
    for (let i = 1; i <= 2; i++) {
      const id = nanoid();
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

      await createGuestUser({
        id,
        supabase_id: `test_expired_${id}`,
        name: `TestExpiredGuest_${i}`,
        guestExpiresAt: expiredDate,
      });

      testGuests.push({
        id,
        name: `TestExpiredGuest_${i}`,
        isExpired: true,
      });

      console.log(
        `✓ Created expired guest: TestExpiredGuest_${i} (expires: ${expiredDate.toISOString()})`
      );
    }

    // Create 2 active guests (expires in 29 days)
    for (let i = 1; i <= 2; i++) {
      const id = nanoid();
      const futureDate = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000); // 29 days from now

      await createGuestUser({
        id,
        supabase_id: `test_active_${id}`,
        name: `TestActiveGuest_${i}`,
        guestExpiresAt: futureDate,
      });

      testGuests.push({
        id,
        name: `TestActiveGuest_${i}`,
        isExpired: false,
      });

      console.log(
        `✓ Created active guest: TestActiveGuest_${i} (expires: ${futureDate.toISOString()})`
      );
    }

    console.log("");
    console.log(
      `Created ${testGuests.length} test guests (2 expired, 2 active)`
    );
    console.log("");

    // Step 2: Verify guests exist before cleanup
    console.log("Step 2: Verifying test guests exist in database...");
    console.log("");

    for (const guest of testGuests) {
      const user = await getUserByUserID(guest.id);
      if (user) {
        console.log(`✓ Found: ${guest.name} (${guest.isExpired ? 'expired' : 'active'})`);
      } else {
        console.log(`✗ Not found: ${guest.name}`);
      }
    }

    console.log("");

    // Step 3: Run cleanup job
    console.log("Step 3: Running cleanup job...");
    console.log("");
    console.log("-".repeat(60));

    const deletedCount = await cleanupExpiredGuestUsers();

    console.log("-".repeat(60));
    console.log("");
    console.log(`Cleanup job completed. Deleted ${deletedCount} guests.`);
    console.log("");

    // Step 4: Verify results
    console.log("Step 4: Verifying cleanup results...");
    console.log("");

    let expiredStillExist = 0;
    let activeDeleted = 0;

    for (const guest of testGuests) {
      const user = await getUserByUserID(guest.id);

      if (guest.isExpired) {
        // Expired guests should be deleted
        if (user) {
          console.log(`✗ FAIL: Expired guest still exists: ${guest.name}`);
          expiredStillExist++;
        } else {
          console.log(`✓ PASS: Expired guest deleted: ${guest.name}`);
        }
      } else {
        // Active guests should remain
        if (user) {
          console.log(`✓ PASS: Active guest preserved: ${guest.name}`);
        } else {
          console.log(`✗ FAIL: Active guest was deleted: ${guest.name}`);
          activeDeleted++;
        }
      }
    }

    console.log("");
    console.log("=".repeat(60));
    console.log("Test Results:");
    console.log("=".repeat(60));

    const allTestsPassed = expiredStillExist === 0 && activeDeleted === 0;

    if (allTestsPassed) {
      console.log("✓ ALL TESTS PASSED");
      console.log(`  - ${deletedCount} expired guests deleted`);
      console.log("  - 2 active guests preserved");
      console.log("  - No false positives");
    } else {
      console.log("✗ TESTS FAILED");
      if (expiredStillExist > 0) {
        console.log(`  - ${expiredStillExist} expired guests NOT deleted`);
      }
      if (activeDeleted > 0) {
        console.log(`  - ${activeDeleted} active guests incorrectly deleted`);
      }
    }

    console.log("");

    // Step 5: Cleanup test data
    console.log("Step 5: Cleaning up test data...");
    console.log("");

    for (const guest of testGuests) {
      const user = await getUserByUserID(guest.id);
      if (user) {
        await deleteUser(guest.id);
        console.log(`✓ Cleaned up: ${guest.name}`);
      }
    }

    console.log("");
    console.log("Test script completed successfully!");
    console.log("=".repeat(60));

    process.exit(allTestsPassed ? 0 : 1);
  } catch (error) {
    console.error("");
    console.error("=".repeat(60));
    console.error("Test failed with error:");
    console.error("=".repeat(60));
    console.error(error);
    console.error("");

    // Try to cleanup test data even on error
    console.log("Attempting to clean up test guests...");
    for (const guest of testGuests) {
      try {
        const user = await getUserByUserID(guest.id);
        if (user) {
          await deleteUser(guest.id);
          console.log(`✓ Cleaned up: ${guest.name}`);
        }
      } catch (cleanupError) {
        console.error(`✗ Failed to cleanup ${guest.name}:`, cleanupError);
      }
    }

    process.exit(1);
  }
}

// Run the test
testGuestCleanup();