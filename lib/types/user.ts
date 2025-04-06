import type { userTable } from "@/db/schema";

export type NewUser = typeof userTable.$inferInsert;
export type User = typeof userTable.$inferSelect;
