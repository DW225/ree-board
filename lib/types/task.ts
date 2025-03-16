import type { taskTable } from "@/db/schema";

export type NewTask = typeof taskTable.$inferInsert;
export type Task = typeof taskTable.$inferSelect;
