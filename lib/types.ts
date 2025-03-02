import type { userTable, postTable, boardTable, memberTable, actionsTable } from "@/db/schema";

export type NewUser = typeof userTable.$inferInsert;
export type User = typeof userTable.$inferSelect;

export type NewPost = typeof postTable.$inferInsert;
export type Post = typeof postTable.$inferSelect;

export type NewBoard = typeof boardTable.$inferInsert;
export type Board = typeof boardTable.$inferSelect;

export type NewMember = typeof memberTable.$inferInsert;
export type Member = typeof memberTable.$inferSelect;

export type NewAction = typeof actionsTable.$inferInsert;
export type Action = typeof actionsTable.$inferSelect;
