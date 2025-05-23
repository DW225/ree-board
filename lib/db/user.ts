import { userTable } from "@/db/schema";
import type { NewUser, User } from "@/lib/types/user";
import { eq, or } from "drizzle-orm";
import { db } from "./client";

export async function findUserIdByKindeID(kindeId: string) {
  const result = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.kinde_id, kindeId))
    .limit(1);
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

export const getUserByKindeID = async (kindeId: User["kinde_id"]) => {
  const result = await db
    .select()
    .from(userTable)
    .where(eq(userTable.kinde_id, kindeId));
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
