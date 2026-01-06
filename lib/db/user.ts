import { userTable } from "@/db/schema";
import type { NewUser, User } from "@/lib/types/user";
import { and, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "./client";

const prepareFindUserIdByKindeID = db
  .select({ id: userTable.id })
  .from(userTable)
  .where(eq(userTable.kinde_id, sql.placeholder("kindeId")))
  .limit(1)
  .prepare();
export async function findUserIdByKindeID(kindeId: string) {
  const result = await prepareFindUserIdByKindeID.execute({ kindeId });
  if (result.length > 0) {
    return result[0].id;
  } else {
    console.error(`User with Kinde ID "${kindeId}" not found`);
    return null;
  }
}

export async function createUser(user: NewUser) {
  await db.insert(userTable).values({
    id: user.id,
    kinde_id: user.kinde_id,
    name: user.name,
    email: user.email,
  });
}

const prepareGetUser = db
  .select()
  .from(userTable)
  .where(eq(userTable.kinde_id, sql.placeholder("kindeId")))
  .limit(1)
  .prepare();

export const getUserByKindeID = async (kindeId: User["kinde_id"]) => {
  const result = await prepareGetUser.execute({ kindeId });
  return result.length > 0 ? result[0] : undefined;
};

export const deleteUser = async (userID: User["id"] | User["kinde_id"]) => {
  const result = await db
    .delete(userTable)
    .where(or(eq(userTable.id, userID), eq(userTable.kinde_id, userID)))
    .returning({ deletedId: userTable.id });
  return result.length > 0 ? result[0] : "No user deleted";
};

export const findUserByEmail = async (email: User["email"]) => {
  const result = await db
    .select()
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
 * Migration Helper Functions
 * These functions support the Kinde to Supabase migration process
 */

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
 * Get all users that need to be migrated
 * Returns users with kinde_id but no supabase_id
 */
export const getAllUsersToMigrate = async () => {
  const result = await db
    .select()
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
  return result;
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
      kinde_id: `guest_${data.id}`, // Placeholder for required field until kinde_id is deprecated
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
  supabaseId: string, // TODO: Change to use User["supabase_id"] after migration
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
