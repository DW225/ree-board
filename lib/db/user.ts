import { userTable } from "@/db/schema";
import type { NewUser, User } from "@/lib/types/user";
import { eq } from "drizzle-orm";
import { db } from "./client";

export async function createUser(user: NewUser) {
  await db
    .insert(userTable)
    .values(user)
    .onConflictDoNothing({ target: userTable.supabase_id });
}

/**
 * Delete a user from the local database
 *
 * TODO: Consider adding Supabase Auth user deletion for complete cleanup
 * Currently only deletes from local DB. For full GDPR compliance, should also
 * call supabase.auth.admin.deleteUser(supabaseId) to remove from Supabase Auth.
 * This would replace the Kinde webhook's user.deleted event functionality.
 *
 * @param userID - The local user ID to delete
 */
export const deleteUser = async (userID: User["id"]) => {
  const result = await db
    .delete(userTable)
    .where(eq(userTable.id, userID))
    .returning({ deletedId: userTable.id });
  return result.length > 0 ? result[0] : "No user deleted";
};

export const findUserByEmail = async (email: User["email"]) => {
  const result = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
    })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
};

export const getUserByUserID = async (userID: User["id"]) => {
  const result = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, userID));
  return result.length > 0 ? result[0] : undefined;
};

/**
 * Get user by Supabase ID
 * Used after migration to authenticate users with their Supabase account
 */
export const getUserBySupabaseId = async (supabaseId: string) => {
  const result = await db
    .select()
    .from(userTable)
    .where(eq(userTable.supabase_id, supabaseId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
};

/**
 * Update user with Supabase ID
 * Used during migration to link Supabase accounts to existing user records
 */
export const updateUserSupabaseId = async (
  userId: User["id"],
  supabaseId: string
) => {
  await db
    .update(userTable)
    .set({ supabase_id: supabaseId })
    .where(eq(userTable.id, userId));
};

/**
 * Create a guest user with temporary access
 * Used for anonymous users who want to try the app before signing up
 */
export const createGuestUser = async (data: {
  id: User["id"];
  supabase_id: User["supabase_id"];
  name: User["name"];
  guestExpiresAt: User["guestExpiresAt"];
}) => {
  const user = await db
    .insert(userTable)
    .values({
      id: data.id,
      supabase_id: data.supabase_id,
      name: data.name,
      email: `guest_${data.id}@example.com`, // Placeholder email for guest users
      isGuest: true,
      guestExpiresAt: data.guestExpiresAt,
    })
    .returning();

  if (user.length === 0) {
    throw new Error("Failed to create guest user");
  }

  return user[0];
};

/**
 * Convert a guest user to a permanent user
 * Used when a guest user claims their account with an email
 */
export const convertGuestToUser = async (
  supabaseId: User["supabase_id"],
  email: User["email"]
) => {
  await db
    .update(userTable)
    .set({
      isGuest: false,
      guestExpiresAt: null,
      email,
    })
    .where(eq(userTable.supabase_id, supabaseId));
};
