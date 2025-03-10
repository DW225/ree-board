import type { actionsTable } from "@/db/schema";

export type NewAction = typeof actionsTable.$inferInsert;
export type Action = typeof actionsTable.$inferSelect;
