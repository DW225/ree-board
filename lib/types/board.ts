import type { boardTable } from "@/db/schema";
import type { Role } from "@/lib/constants/role";

export type NewBoard = typeof boardTable.$inferInsert;
export type Board = typeof boardTable.$inferSelect;
export type BoardWithRole = Board & { role: Role };
