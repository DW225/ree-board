#!/usr/bin/env tsx
/**
 * Migration Verification Script
 *
 * This script verifies that the Kinde to Supabase migration completed successfully.
 * It checks:
 *
 * 1. Total number of users with kinde_id
 * 2. Number of users with supabase_id populated
 * 3. Number of users still pending migration
 * 4. Lists any users without Supabase accounts
 *
 * Usage:
 *   # Verify development database
 *   NODE_ENV=development npx tsx scripts/verify-migration.ts
 *
 *   # Verify production database
 *   npx tsx scripts/verify-migration.ts
 */

import { and, eq, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { userTable } from "../db/schema";
import { db } from "../lib/db/client";

interface VerificationResults {
  totalUsers: number;
  migratedUsers: number;
  pendingUsers: number;
  guestUsers: number;
  usersWithoutEmail: number;
  pendingUserDetails: Array<{
    id: string;
    name: string;
    email: string | null;
    kinde_id: string | null;
  }>;
}

async function verifyMigration(): Promise<VerificationResults> {
  console.log("=".repeat(60));
  console.log("Migration Verification Report");
  console.log("=".repeat(60));
  console.log();

  // Get all users with kinde_id
  const allKindeUsers = await db
    .select()
    .from(userTable)
    .where(isNotNull(userTable.kinde_id));

  // Get users with both kinde_id and supabase_id
  const migratedUsers = await db
    .select()
    .from(userTable)
    .where(
      and(
        isNotNull(userTable.kinde_id),
        ne(userTable.supabase_id, "supabase_id")
      )
    );

  // Get users with kinde_id but no supabase_id
  const pendingUsers = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      kinde_id: userTable.kinde_id,
    })
    .from(userTable)
    .where(
      and(
        isNotNull(userTable.kinde_id),
        or(
          isNull(userTable.supabase_id),
          eq(userTable.supabase_id, "supabase_id")
        )
      )
    );

  // Get guest users (if any exist)
  const guestUsers = await db
    .select()
    .from(userTable)
    .where(sql`${userTable.isGuest} = 1`);

  // Get users without email
  const usersWithoutEmail = await db
    .select()
    .from(userTable)
    .where(sql`${userTable.email} IS NULL OR ${userTable.email} = ''`);

  const results: VerificationResults = {
    totalUsers: allKindeUsers.length,
    migratedUsers: migratedUsers.length,
    pendingUsers: pendingUsers.length,
    guestUsers: guestUsers.length,
    usersWithoutEmail: usersWithoutEmail.length,
    pendingUserDetails: pendingUsers,
  };

  return results;
}

async function main() {
  try {
    const results = await verifyMigration();

    // Print statistics
    console.log("📊 Migration Statistics:");
    console.log(`   Total Kinde Users:     ${results.totalUsers}`);
    console.log(`   Migrated to Supabase:  ${results.migratedUsers}`);
    console.log(`   Pending Migration:     ${results.pendingUsers}`);
    console.log(`   Guest Users:           ${results.guestUsers}`);
    console.log(`   Users w/o Email:       ${results.usersWithoutEmail}`);
    console.log();

    // Calculate percentage
    if (results.totalUsers > 0) {
      const percentage = (
        (results.migratedUsers / results.totalUsers) *
        100
      ).toFixed(1);
      console.log(`   Migration Progress:    ${percentage}%`);
      console.log();
    }

    // Show pending users if any
    if (results.pendingUsers > 0) {
      console.log("⚠️  Users Pending Migration:");
      console.log("-".repeat(60));
      results.pendingUserDetails.forEach((user) => {
        console.log(`   ID: ${user.id}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email || "NO EMAIL"}`);
        console.log(`   Kinde ID: ${user.kinde_id}`);
        console.log();
      });
    }

    // Final assessment
    console.log("=".repeat(60));
    if (results.pendingUsers === 0 && results.totalUsers > 0) {
      console.log("✅ SUCCESS: All users have been migrated!");
      console.log();
      console.log("Next steps:");
      console.log("1. Test sign-in with 2-3 users to verify OTP flow works");
      console.log("2. Prepare to deploy new code with Supabase auth");
      console.log("3. Send email to users about new passwordless sign-in");
      console.log();
      process.exit(0);
    } else if (results.pendingUsers > 0) {
      console.log("⚠️  INCOMPLETE: Some users still need migration");
      console.log();
      console.log("Action required:");
      console.log("1. Review pending users listed above");
      console.log(
        "2. Run migration script again if users have email addresses"
      );
      console.log("3. For users without email, manually add emails first");
      console.log();
      process.exit(1);
    } else {
      console.log("ℹ️  No users found with Kinde authentication");
      console.log();
      process.exit(0);
    }
  } catch (error) {
    console.error();
    console.error("❌ Verification failed with error:");
    console.error(error);
    console.error();
    process.exit(1);
  }
}

main();
