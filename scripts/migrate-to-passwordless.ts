#!/usr/bin/env tsx
/**
 * Kinde to Supabase Passwordless Migration Script
 *
 * This script migrates all existing users from Kinde authentication to Supabase
 * passwordless authentication. It:
 *
 * 1. Queries all users with kinde_id but no supabase_id
 * 2. Creates Supabase accounts via Admin API (email confirmed, no password)
 * 3. Links supabase_id to existing user records in database
 * 4. Provides detailed logging and error handling
 * 5. Generates a migration report
 *
 * Usage:
 *   # Test on development database
 *   NODE_ENV=development npx tsx scripts/migrate-to-passwordless.ts
 *
 *   # Run on production database (ensure env vars are set)
 *   npx tsx scripts/migrate-to-passwordless.ts
 *
 * Prerequisites:
 *   - NEXT_PUBLIC_SUPABASE_URL environment variable
 *   - SUPABASE_SECRET_KEY environment variable
 *   - TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (for production)
 *   - Database backup created
 */

import { eq, isNull, or } from "drizzle-orm";
import { userTable } from "../db/schema";
import { db } from "../lib/db/client";
import { updateUserSupabaseId } from "../lib/db/user";
import { createAdminClient } from "../lib/utils/supabase/admin";

interface MigrationResult {
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ email: string; error: string; userId: string }>;
  successfulMigrations: Array<{
    email: string;
    userId: string;
    supabaseId: string;
  }>;
}

async function migrateToPasswordless(): Promise<MigrationResult> {
  console.log("=".repeat(60));
  console.log("Kinde to Supabase Passwordless Migration");
  console.log("=".repeat(60));
  console.log();

  const supabase = createAdminClient();

  console.log("⏳ Fetching users to migrate...\n");

  // Get all users that need migration
  const usersToMigrate = await db
    .select()
    .from(userTable)
    .where(
      or(
        isNull(userTable.supabase_id),
        eq(userTable.supabase_id, "supabase_id")
      )
    );

  console.log(`📊 Found ${usersToMigrate.length} users to migrate\n`);

  if (usersToMigrate.length === 0) {
    console.log(
      "✅ No users need migration. All users already have Supabase accounts.\n"
    );
    return {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      successfulMigrations: [],
    };
  }

  const results: MigrationResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    successfulMigrations: [],
  };

  console.log("Starting migration...\n");
  console.log("-".repeat(60));

  for (const user of usersToMigrate) {
    if (!user.email) {
      console.log(`⚠️  Skipping user ${user.id} - no email address`);
      results.skipped++;
      continue;
    }

    try {
      console.log(`🔄 Migrating: ${user.email} (ID: ${user.id})`);

      // Create Supabase account via Admin API
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        email_confirm: true, // Auto-confirm email (no verification needed)
        user_metadata: {
          name: user.name,
          migrated_from_kinde: true,
          migration_date: new Date().toISOString(),
          original_user_id: user.id,
          // original_kinde_id: user.kinde_id,
        },
      });

      if (error) {
        console.log(`   ✗ Failed: ${error.message}`);
        results.failed++;
        results.errors.push({
          email: user.email,
          error: error.message,
          userId: user.id,
        });
        continue;
      }

      if (!data.user) {
        console.log(`   ✗ Failed: No user data returned from Supabase`);
        results.failed++;
        results.errors.push({
          email: user.email,
          error: "No user data returned",
          userId: user.id,
        });
        continue;
      }

      // Link Supabase ID to our user record
      await updateUserSupabaseId(user.id, data.user.id);

      console.log(`   ✓ Success: Supabase ID ${data.user.id}`);
      results.success++;
      results.successfulMigrations.push({
        email: user.email,
        userId: user.id,
        supabaseId: data.user.id,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.log(`   ✗ Failed: ${errorMsg}`);
      results.failed++;
      results.errors.push({
        email: user.email,
        error: errorMsg,
        userId: user.id,
      });
    }
  }

  return results;
}

// Run migration
async function main() {
  try {
    const results = await migrateToPasswordless();

    // Print summary
    console.log();
    console.log("=".repeat(60));
    console.log("Migration Complete!");
    console.log("=".repeat(60));
    console.log(`✅ Successful: ${results.success}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⏭️  Skipped: ${results.skipped}`);
    console.log();

    if (results.successfulMigrations.length > 0) {
      console.log("Successful Migrations:");
      results.successfulMigrations.forEach(({ email, userId, supabaseId }) => {
        console.log(`  ✓ ${email} (${userId}) → ${supabaseId}`);
      });
      console.log();
    }

    if (results.errors.length > 0) {
      console.log("❌ Errors:");
      results.errors.forEach(({ email, error, userId }) => {
        console.log(`  ✗ ${email} (${userId}): ${error}`);
      });
      console.log();
    }

    if (results.failed === 0) {
      console.log("🎉 All users migrated successfully!");
      console.log();
      console.log("Next steps:");
      console.log(
        "1. Run verification script: npx tsx scripts/verify-migration.ts"
      );
      console.log("2. Test sign-in with 2-3 users");
      console.log("3. Deploy new code with Supabase authentication");
      console.log();
      process.exit(0);
    } else {
      console.log(
        "⚠️  Some users failed to migrate. Please review errors above."
      );
      console.log();
      console.log("To retry failed users:");
      console.log("1. Fix any issues identified in the errors");
      console.log(
        "2. Run this script again (it will only migrate remaining users)"
      );
      console.log();
      process.exit(1);
    }
  } catch (error) {
    console.error();
    console.error("❌ Migration failed with critical error:");
    console.error(error);
    console.error();
    process.exit(1);
  }
}

main();
