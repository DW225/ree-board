import type { userTable } from "@/db/schema";

export type NewUser = typeof userTable.$inferInsert;
export type User = typeof userTable.$inferSelect;

export type UserPublicInfo = Pick<User, "name"> & {
  avatar_url: string;
};
