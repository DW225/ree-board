import type { userTable } from "@/db/schema";

export type NewUser = typeof userTable.$inferInsert;
export type User = typeof userTable.$inferSelect;

export type UserPublicInfo = Pick<User, "name" | "email"> & {
  avatar_url: string;
};
