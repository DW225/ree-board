import type { boardTable } from "@/db/schema";

export type NewBoard = typeof boardTable.$inferInsert;
export type Board = typeof boardTable.$inferSelect;
